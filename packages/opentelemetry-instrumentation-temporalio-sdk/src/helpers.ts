import * as otel from '@opentelemetry/api';
import {
  ApplicationFailure,
  ApplicationFailureCategory,
  type Headers,
  defaultPayloadConverter
} from '@temporalio/common';

const TRACE_HEADER = '_tracer-data';
const payloadConverter = defaultPayloadConverter;

export function extractContextFromHeaders(headers: Headers): otel.Context | undefined {
  const encodedSpanContext = headers[TRACE_HEADER];

  if (encodedSpanContext === undefined) {
    return undefined;
  }

  const textMap: Record<string, string> = payloadConverter.fromPayload(encodedSpanContext);

  return otel.propagation.extract(otel.context.active(), textMap, otel.defaultTextMapGetter);
}

export function headersWithContext(headers: Headers): Headers {
  const carrier = {};

  otel.propagation.inject(otel.context.active(), carrier, otel.defaultTextMapSetter);

  return { ...headers, [TRACE_HEADER]: payloadConverter.toPayload(carrier) };
}

async function wrapWithSpan<T>(
  span: otel.Span,
  fn: (span: otel.Span) => Promise<T>,
  acceptableErrors?: (err: unknown) => boolean
): Promise<T> {
  try {
    const ret = await fn(span);

    span.setStatus({ code: otel.SpanStatusCode.OK });

    return ret;
  } catch (err) {
    const isBenignErr = err instanceof ApplicationFailure && err.category === ApplicationFailureCategory.BENIGN;

    if (acceptableErrors === undefined || !acceptableErrors(err)) {
      const statusCode = isBenignErr ? otel.SpanStatusCode.UNSET : otel.SpanStatusCode.ERROR;

      span.setStatus({ code: statusCode, message: (err as Error).message ?? String(err) });
      span.recordException(err as Error);
    } else {
      span.setStatus({ code: otel.SpanStatusCode.OK });
    }

    throw err;
  } finally {
    span.end();
  }
}

export interface InstrumentOptions<T> {
  tracer: otel.Tracer;
  spanName: string;
  fn: (span: otel.Span) => Promise<T>;
  context?: otel.Context;
  acceptableErrors?: (err: unknown) => boolean;
}

export async function instrument<T>({
  acceptableErrors,
  context,
  fn,
  spanName,
  tracer
}: InstrumentOptions<T>): Promise<T> {
  if (context) {
    return await otel.context.with(context, async () => {
      return await tracer.startActiveSpan(spanName, async span => await wrapWithSpan(span, fn, acceptableErrors));
    });
  }

  return await tracer.startActiveSpan(spanName, async span => await wrapWithSpan(span, fn, acceptableErrors));
}
