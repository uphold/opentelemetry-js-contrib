import {
  BaggageEntry,
  Context,
  TextMapGetter,
  TextMapPropagator,
  TextMapSetter,
  propagation
} from '@opentelemetry/api';
import { MutableBaggageImpl } from './mutable-baggage-impl';
import { baggageUtils, isTracingSuppressed } from '@opentelemetry/core';

const BAGGAGE_HEADER = 'baggage';
const BAGGAGE_ITEMS_SEPARATOR = ',';
const BAGGAGE_MAX_NAME_VALUE_PAIRS = 180;
const BAGGAGE_MAX_PER_NAME_VALUE_PAIRS = 4096;

export class W3CMutableBaggagePropagator implements TextMapPropagator {
  inject(context: Context, carrier: unknown, setter: TextMapSetter): void {
    const baggage = propagation.getBaggage(context);

    if (!baggage || isTracingSuppressed(context)) {
      return;
    }

    const keyPairs = baggageUtils
      .getKeyPairs(baggage)
      .filter(pair => pair.length <= BAGGAGE_MAX_PER_NAME_VALUE_PAIRS)
      .slice(0, BAGGAGE_MAX_NAME_VALUE_PAIRS);

    const headerValue = baggageUtils.serializeKeyPairs(keyPairs);

    if (headerValue.length > 0) {
      setter.set(carrier, BAGGAGE_HEADER, headerValue);
    }
  }

  extract(context: Context, carrier: unknown, getter: TextMapGetter): Context {
    const headerValue = getter.get(carrier, BAGGAGE_HEADER);
    const baggageString = Array.isArray(headerValue) ? headerValue.join(BAGGAGE_ITEMS_SEPARATOR) : headerValue;

    const entries = {} as Record<string, BaggageEntry>;
    const pairs = (baggageString ?? '').split(BAGGAGE_ITEMS_SEPARATOR);

    pairs.forEach(entry => {
      const keyPair = baggageUtils.parsePairKeyValue(entry);

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
