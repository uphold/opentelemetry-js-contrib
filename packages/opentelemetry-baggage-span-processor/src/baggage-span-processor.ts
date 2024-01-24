import { Context, Span, propagation } from '@opentelemetry/api';

export class BaggageSpanProcessor {
  onStart(span: Span, parentContext: Context): void {
    // Set all baggage entries as span attributes.
    const baggageEntries = propagation.getBaggage(parentContext)?.getAllEntries();

    baggageEntries?.forEach(([key, baggageEntry]) => {
      span.setAttribute(key, baggageEntry.value);
    });
  }

  onEnd(): void {}

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}
