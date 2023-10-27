import { Baggage, BaggageEntry } from '@opentelemetry/api';

export class MutableBaggageImpl implements Baggage {
  private entries: Map<string, BaggageEntry>;

  constructor(entries?: Map<string, BaggageEntry>) {
    this.entries = entries ? new Map(entries) : new Map();
  }

  getEntry(key: string): BaggageEntry | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    return Object.assign({}, entry);
  }

  getAllEntries(): [string, BaggageEntry][] {
    return Array.from(this.entries.entries()).map(([key, value]) => [key, value]);
  }

  setEntry(key: string, entry: BaggageEntry): MutableBaggageImpl {
    this.entries.set(key, entry);

    return this;
  }

  removeEntry(key: string): MutableBaggageImpl {
    this.entries.delete(key);

    return this;
  }

  removeEntries(...keys: string[]): MutableBaggageImpl {
    for (const key of keys) {
      this.entries.delete(key);
    }

    return this;
  }

  clear(): MutableBaggageImpl {
    this.entries.clear();

    return this;
  }
}
