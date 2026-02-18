/**
 * This file was copied from '@opentelemetry/api' since it does export these utility functions since v2.
 */

import {
  BAGGAGE_ITEMS_SEPARATOR,
  BAGGAGE_KEY_PAIR_SEPARATOR,
  BAGGAGE_MAX_TOTAL_LENGTH,
  BAGGAGE_PROPERTIES_SEPARATOR
} from './constants';
import { Baggage, BaggageEntryMetadata, baggageEntryMetadataFromString } from '@opentelemetry/api';

type ParsedBaggageKeyValue = {
  key: string;
  value: string;
  metadata: BaggageEntryMetadata | undefined;
};

export function serializeKeyPairs(keyPairs: string[]): string {
  const parts: string[] = [];
  let totalLength = 0;

  for (const pair of keyPairs) {
    const newLength = totalLength + pair.length + (totalLength > 0 ? BAGGAGE_ITEMS_SEPARATOR.length : 0);

    if (newLength > BAGGAGE_MAX_TOTAL_LENGTH) {
      break;
    }

    parts.push(pair);
    totalLength = newLength;
  }

  return parts.join(BAGGAGE_ITEMS_SEPARATOR);
}

export function getKeyPairs(baggage: Baggage): string[] {
  return baggage.getAllEntries().map(([key, value]) => {
    let entry = `${encodeURIComponent(key)}=${encodeURIComponent(value.value)}`;

    // include opaque metadata if provided
    // NOTE: we intentionally don't URI-encode the metadata - that responsibility falls on the metadata implementation
    if (value.metadata !== undefined) {
      entry += BAGGAGE_PROPERTIES_SEPARATOR + value.metadata.toString();
    }

    return entry;
  });
}

export function parsePairKeyValue(entry: string): ParsedBaggageKeyValue | undefined {
  const valueProps = entry.split(BAGGAGE_PROPERTIES_SEPARATOR);

  if (valueProps.length <= 0) {
    return;
  }

  const keyPairPart = valueProps.shift();

  if (!keyPairPart) {
    return;
  }

  const separatorIndex = keyPairPart.indexOf(BAGGAGE_KEY_PAIR_SEPARATOR);

  if (separatorIndex <= 0) {
    return;
  }

  const key = decodeURIComponent(keyPairPart.substring(0, separatorIndex).trim());
  const value = decodeURIComponent(keyPairPart.substring(separatorIndex + 1).trim());
  let metadata;

  if (valueProps.length > 0) {
    metadata = baggageEntryMetadataFromString(valueProps.join(BAGGAGE_PROPERTIES_SEPARATOR));
  }

  return { key, metadata, value };
}

export function parseKeyPairsIntoRecord(value?: string): Record<string, string> {
  const result: Record<string, string> = {};

  if (typeof value === 'string' && value.length > 0) {
    value.split(BAGGAGE_ITEMS_SEPARATOR).forEach(entry => {
      const keyPair = parsePairKeyValue(entry);

      if (keyPair !== undefined && keyPair.value.length > 0) {
        result[keyPair.key] = keyPair.value;
      }
    });
  }

  return result;
}
