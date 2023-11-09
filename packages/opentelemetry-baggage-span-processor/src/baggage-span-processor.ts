import { Context, Span, propagation } from '@opentelemetry/api';
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace-base';

export class BaggageSpanProcessor extends NoopSpanProcessor {
  override onStart(span: Span, parentContext: Context): void {
    // Set all baggage entries as span attributes.
    const baggageEntries = propagation.getBaggage(parentContext)?.getAllEntries();

    baggageEntries?.forEach(([key, baggageEntry]) => {
      span.setAttribute(key, baggageEntry.value);
    });
  }
}
