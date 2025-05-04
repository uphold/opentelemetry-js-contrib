import {
  BAGGAGE_HEADER,
  BAGGAGE_ITEMS_SEPARATOR,
  BAGGAGE_MAX_NAME_VALUE_PAIRS,
  BAGGAGE_MAX_PER_NAME_VALUE_PAIRS
} from './constants';
import {
  BaggageEntry,
  Context,
  TextMapGetter,
  TextMapPropagator,
  TextMapSetter,
  propagation
} from '@opentelemetry/api';
import { MutableBaggageImpl } from './mutable-baggage-impl';
import { getKeyPairs, parsePairKeyValue, serializeKeyPairs } from './utils';
import { isTracingSuppressed } from '@opentelemetry/core';

export class W3CMutableBaggagePropagator implements TextMapPropagator {
  inject(context: Context, carrier: unknown, setter: TextMapSetter): void {
    const baggage = propagation.getBaggage(context);

    if (!baggage || isTracingSuppressed(context)) {
      return;
    }

    const keyPairs = getKeyPairs(baggage)
      .filter((pair: string) => pair.length <= BAGGAGE_MAX_PER_NAME_VALUE_PAIRS)
      .slice(0, BAGGAGE_MAX_NAME_VALUE_PAIRS);
    const headerValue = serializeKeyPairs(keyPairs);

    if (headerValue.length > 0) {
      setter.set(carrier, BAGGAGE_HEADER, headerValue);
    }
  }

  extract(context: Context, carrier: unknown, getter: TextMapGetter): Context {
    const headerValue = getter.get(carrier, BAGGAGE_HEADER);
    const baggageString = Array.isArray(headerValue) ? headerValue.join(BAGGAGE_ITEMS_SEPARATOR) : headerValue;

    const entries: Record<string, BaggageEntry> = {};
    const pairs = (baggageString ?? '').split(BAGGAGE_ITEMS_SEPARATOR);

    pairs.forEach(entry => {
      const keyPair = parsePairKeyValue(entry);

      if (keyPair) {
        const baggageEntry: BaggageEntry = { value: keyPair.value };

        if (keyPair.metadata) {
          baggageEntry.metadata = keyPair.metadata;
        }

        entries[keyPair.key] = baggageEntry;
      }
    });

    const baggage = new MutableBaggageImpl(new Map(Object.entries(entries)));

    return propagation.setBaggage(context, baggage);
  }

  fields(): string[] {
    return [BAGGAGE_HEADER];
  }
}
