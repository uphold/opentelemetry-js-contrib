import { InstrumentationConfig } from '@opentelemetry/instrumentation';
import { StreamRequest, UnaryRequest } from '@connectrpc/connect';

export type IgnoreRequestMatcher = (req: UnaryRequest | StreamRequest) => boolean;

export type MetadataToSpanAttributes = {
  client?: {
    response?: string[];
    request?: string[];
  };
  server?: {
    response?: string[];
    request?: string[];
  };
};

export interface ConnectNodeInstrumentationConfig extends InstrumentationConfig {
  // Omits tracing on any requests that match the given predicate.
  ignoreRequest?: IgnoreRequestMatcher;
  // Map the following metadata to span attributes.
  metadataToSpanAttributes?: MetadataToSpanAttributes;
}
