import {
  ATTR_RPC_CONNECT_RPC_ERROR_CODE,
  ATTR_RPC_GRPC_STATUS_CODE,
  ATTR_RPC_SERVICE,
  ATTR_RPC_SYSTEM
} from './semcov';
import {
  ATTR_RPC_METHOD,
  ATTR_RPC_RESPONSE_STATUS_CODE,
  ATTR_RPC_SYSTEM_NAME,
  ATTR_RPC_REQUEST_METADATA as rpcRequestMetadataAttributeKey,
  ATTR_RPC_RESPONSE_METADATA as rpcResponseMetadataAttributeKey
} from '@opentelemetry/semantic-conventions/incubating';
import { ATTR_SERVER_ADDRESS, ATTR_SERVER_PORT } from '@opentelemetry/semantic-conventions';
import { ConnectError, StreamRequest, StreamResponse, UnaryRequest, UnaryResponse } from '@connectrpc/connect';
import { ConnectNodeInstrumentationConfig } from './types';
import { DiagLogger, SpanStatusCode, Tracer, context, propagation, trace } from '@opentelemetry/api';
import { InterceptorAnyFn, RpcKind, RpcPhase } from './internal-types';
import { Span } from '@opentelemetry/sdk-trace-base';
import { errorCodeToString, isConnectError, resolveRpcSystem, resolveRpcSystemName, rpcKindToSpanKind } from './utils';
import { memoize } from 'lodash';
import { safeExecuteInTheMiddle } from '@opentelemetry/instrumentation';

const createMetadataAttributesExtractor = (
  config: ConnectNodeInstrumentationConfig,
  kind: RpcKind,
  phase: RpcPhase
) => {
  const metadataToSpanAttributes = config.metadataToSpanAttributes?.[kind]?.[phase] ?? [];
  const mappings = new Map(
    metadataToSpanAttributes.map(value => [value.toLowerCase(), value.toLowerCase().replace(/-/g, '_')])
  );

  if (mappings.size === 0) {
    return () => ({});
  }

  // See: https://opentelemetry.io/docs/specs/semconv/rpc/
  return (metadata?: Headers) => {
    const attributes: Record<string, string> = {};

    if (metadata) {
      for (const [key, mappedKey] of mappings) {
        const value = metadata.get(key);

        if (value != null) {
          const attributeKey =
            phase === 'request'
              ? rpcRequestMetadataAttributeKey(mappedKey)
              : rpcResponseMetadataAttributeKey(mappedKey);

          attributes[attributeKey] = value;
        }
      }
    }

    return attributes;
  };
};

const createStartSpan = (config: ConnectNodeInstrumentationConfig, tracer: Tracer, kind: RpcKind) => {
  const extractMetadata = createMetadataAttributesExtractor(config, kind, 'request');
  const parseUrl = memoize((url: string) => new URL(url));

  // See: https://opentelemetry.io/docs/specs/semconv/rpc/
  return (req: UnaryRequest | StreamRequest) => {
    const fullName = `${req.service.typeName}/${req.method.name}`;
    const url = parseUrl(req.url);
    const rpcSystem = resolveRpcSystem(req.header);
    const rpcSystemName = resolveRpcSystemName(req.header);

    const span = tracer.startSpan(fullName, {
      attributes: {
        [ATTR_RPC_METHOD]: req.method.name,
        [ATTR_RPC_SERVICE]: req.service.typeName,
        [ATTR_RPC_SYSTEM]: rpcSystem,
        [ATTR_RPC_SYSTEM_NAME]: rpcSystemName,
        [ATTR_SERVER_ADDRESS]: url.hostname,
        [ATTR_SERVER_PORT]: url.port || undefined
      },
      kind: rpcKindToSpanKind(kind)
    });

    span.setAttributes(extractMetadata(req.header));

    return span;
  };
};

const createEndSpanWithSuccess = (config: ConnectNodeInstrumentationConfig, kind: RpcKind) => {
  const extractMetadata = createMetadataAttributesExtractor(config, kind, 'response');

  // See: https://opentelemetry.io/docs/specs/semconv/rpc/
  return (span: Span, res: UnaryResponse | StreamResponse) => {
    if (span.ended) {
      return;
    }

    const rpcSystemName = span.attributes?.[ATTR_RPC_SYSTEM_NAME];

    span.setStatus({ code: SpanStatusCode.OK });

    if (rpcSystemName === 'grpc') {
      span.setAttribute(ATTR_RPC_RESPONSE_STATUS_CODE, 0);
      span.setAttribute(ATTR_RPC_GRPC_STATUS_CODE, 0);
    } else if (rpcSystemName === 'connectrpc') {
      span.setAttribute(ATTR_RPC_RESPONSE_STATUS_CODE, 'ok');
      span.setAttribute(ATTR_RPC_CONNECT_RPC_ERROR_CODE, 'ok');
    }

    span.setAttributes(extractMetadata(res.header));
    span.end();
  };
};

const createEndSpanWithError = (config: ConnectNodeInstrumentationConfig, kind: RpcKind) => {
  const extractMetadata = createMetadataAttributesExtractor(config, kind, 'response');

  // See: https://opentelemetry.io/docs/specs/semconv/rpc/
  return (span: Span, err: unknown) => {
    if (span.ended) {
      return;
    }

    const error = err instanceof Error ? (err as Error) : undefined;
    const connectError = isConnectError(error) ? (error as ConnectError) : undefined;
    const rpcSystemName = span.attributes?.[ATTR_RPC_SYSTEM_NAME];

    span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message });

    if (rpcSystemName === 'grpc') {
      const statusCode = connectError?.code ?? 2;

      span.setAttribute(ATTR_RPC_RESPONSE_STATUS_CODE, statusCode);
      span.setAttribute(ATTR_RPC_GRPC_STATUS_CODE, statusCode);
    } else if (rpcSystemName === 'connectrpc') {
      const statusCode = errorCodeToString(connectError?.code);

      span.setAttribute(ATTR_RPC_RESPONSE_STATUS_CODE, statusCode);
      span.setAttribute(ATTR_RPC_CONNECT_RPC_ERROR_CODE, statusCode);
    }

    span.setAttributes(extractMetadata(connectError?.metadata));

    if (error) {
      span.recordException(error);
    }

    span.end();
  };
};

const carrierSetterAndGetter = {
  get: (carrier: Headers, key: string) => carrier.get(key) ?? undefined,
  keys: (carrier: Headers) => Array.from(carrier.keys()),
  set: (carrier: Headers, key: string, value: string) => carrier.set(key, value)
};

export const createClientInterceptor = (config: ConnectNodeInstrumentationConfig, diag: DiagLogger, tracer: Tracer) => {
  const startSpan = createStartSpan(config, tracer, 'client');
  const endSpanWithSuccess = createEndSpanWithSuccess(config, 'client');
  const endSpanWithError = createEndSpanWithError(config, 'client');

  return (next: InterceptorAnyFn): InterceptorAnyFn =>
    async req => {
      // Only unary requests are supported due to a bug in Node.js async context propagation on generator functions.
      // See https://github.com/open-telemetry/opentelemetry-js/issues/2951 and https://github.com/nodejs/node/issues/42237
      if (req.method.methodKind !== 'unary') {
        return await next(req);
      }

      const shouldIgnoreRequest = safeExecuteInTheMiddle(
        () => config.ignoreRequest?.(req) === true,
        (err: unknown) => {
          if (err != null) {
            diag.error('caught ignoreRequest error: ', err);
          }
        },
        true
      );

      if (shouldIgnoreRequest) {
        return await next(req);
      }

      const span = startSpan(req);

      try {
        return await context.with(trace.setSpan(context.active(), span), async () => {
          propagation.inject(context.active(), req.header, carrierSetterAndGetter);

          const res = await next(req);

          endSpanWithSuccess(span as Span, res);

          return res;
        });
      } catch (err) {
        endSpanWithError(span as Span, err);

        throw err;
      }
    };
};

export const createServerInterceptor = (config: ConnectNodeInstrumentationConfig, diag: DiagLogger, tracer: Tracer) => {
  const startSpan = createStartSpan(config, tracer, 'server');
  const endSpanWithSuccess = createEndSpanWithSuccess(config, 'server');
  const endSpanWithError = createEndSpanWithError(config, 'server');

  return (next: InterceptorAnyFn): InterceptorAnyFn =>
    async req => {
      // Only unary requests are supported due to a bug in Node.js async context propagation on generator functions.
      // See https://github.com/open-telemetry/opentelemetry-js/issues/2951 and https://github.com/nodejs/node/issues/42237
      if (req.method.methodKind !== 'unary') {
        return await next(req);
      }

      const shouldIgnoreRequest = safeExecuteInTheMiddle(
        () => config.ignoreRequest?.(req) === true,
        (err: unknown) => {
          if (err != null) {
            diag.error('caught ignoreRequest error: ', err);
          }
        },
        true
      );

      if (shouldIgnoreRequest) {
        return await next(req);
      }

      return await context.with(propagation.extract(context.active(), req.header, carrierSetterAndGetter), async () => {
        const span = startSpan(req);

        try {
          return await context.with(trace.setSpan(context.active(), span), async () => {
            const res = await next(req);

            endSpanWithSuccess(span as Span, res);

            return res;
          });
        } catch (err) {
          endSpanWithError(span as Span, err);

          throw err;
        }
      });
    };
};
