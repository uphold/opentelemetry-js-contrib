import { Context, Span, propagation } from '@opentelemetry/api';

export class BaggageSpanProcessor {
  onStart(span: Span, parentContext: Context): void {
    // Set all baggage entries as span attributes.
    const baggage = propagation.getBaggage(parentContext);

    if (!baggage) {
      return;
    }

    const baggageEntries = baggage.getAllEntries();

    if (baggageEntries.length === 0) {
      return;
    }

    for (const [key, baggageEntry] of baggageEntries) {
      span.setAttribute(key, baggageEntry.value);
    }
  }

  onEnd(): void {}

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}
