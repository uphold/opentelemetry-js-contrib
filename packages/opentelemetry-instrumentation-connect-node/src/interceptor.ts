import {
  ATTR_RPC_CONNECT_RPC_ERROR_CODE,
  ATTR_RPC_GRPC_STATUS_CODE,
  ATTR_RPC_METHOD,
  ATTR_RPC_SERVICE,
  ATTR_RPC_SYSTEM,
  ATTR_SERVER_ADDRESS,
  ATTR_SERVER_PORT
} from '@opentelemetry/semantic-conventions/incubating';
import { ConnectError, StreamRequest, StreamResponse, UnaryRequest, UnaryResponse } from '@connectrpc/connect';
import { ConnectNodeInstrumentationConfig } from './types';
import { DiagLogger, SpanStatusCode, Tracer, context, propagation, trace } from '@opentelemetry/api';
import { InterceptorAnyFn, RpcKind, RpcPhase } from './internal-types';
import { Span } from '@opentelemetry/sdk-trace-base';
import { errorCodeToString, isConnectError, resolveRpcSystem, rpcKindToSpanKind } from './utils';
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
  return (span: Span, metadata?: Headers) => {
    const rpcSystem = span.attributes[ATTR_RPC_SYSTEM];
    const attributes: Record<string, string> = {};

    if (rpcSystem && metadata) {
      for (const [key, mappedKey] of mappings) {
        const value = metadata.get(key);

        if (value != null) {
          attributes[`grpc.${rpcSystem}.${phase}.metadata.${mappedKey}`] = value;
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

    const span = tracer.startSpan(fullName, {
      attributes: {
        [ATTR_RPC_METHOD]: req.method.name,
        [ATTR_RPC_SERVICE]: req.service.typeName,
        [ATTR_RPC_SYSTEM]: rpcSystem,
        [ATTR_SERVER_ADDRESS]: url.hostname,
        [ATTR_SERVER_PORT]: url.port || undefined
      },
      kind: rpcKindToSpanKind(kind)
    });

    span.setAttributes(extractMetadata(span as Span, req.header));

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

    const rpcSystem = span.attributes[ATTR_RPC_SYSTEM];

    span.setStatus({ code: SpanStatusCode.OK });

    if (rpcSystem === 'grpc') {
      span.setAttribute(ATTR_RPC_GRPC_STATUS_CODE, 0);
    }

    span.setAttributes(extractMetadata(span as Span, res.header));
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
    const rpcSystem = span.attributes[ATTR_RPC_SYSTEM];

    span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message });

    if (rpcSystem === 'grpc') {
      span.setAttribute(ATTR_RPC_GRPC_STATUS_CODE, connectError?.code ?? 2);
    } else if (rpcSystem === 'connect_rpc') {
      span.setAttribute(ATTR_RPC_CONNECT_RPC_ERROR_CODE, errorCodeToString(connectError?.code));
    }

    span.setAttributes(extractMetadata(span as Span, connectError?.metadata));

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

export const createInterceptor = (
  config: ConnectNodeInstrumentationConfig,
  diag: DiagLogger,
  tracer: Tracer,
  kind: RpcKind
) => {
  const startSpan = createStartSpan(config, tracer, kind);
  const endSpanWithSuccess = createEndSpanWithSuccess(config, kind);
  const endSpanWithError = createEndSpanWithError(config, kind);

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

      let ctx = context.active();
      const span = startSpan(req);

      if (kind === 'server') {
        ctx = propagation.extract(ctx, req.header, carrierSetterAndGetter);
      } else {
        propagation.inject(ctx, req.header, carrierSetterAndGetter);
      }

      try {
        return await context.with(trace.setSpan(ctx, span), async () => {
          next = context.bind(ctx, next);

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
