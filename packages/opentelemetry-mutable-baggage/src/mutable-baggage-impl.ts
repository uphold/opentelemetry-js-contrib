import { Baggage, BaggageEntry } from '@opentelemetry/api';

export class MutableBaggageImpl implements Baggage {
  private entries: Map<string, BaggageEntry>;
  private cachedEntries: [string, BaggageEntry][] | null = null;

  constructor(entries?: Map<string, BaggageEntry>) {
    this.entries = entries ? new Map(entries) : new Map();
  }

  getEntry(key: string): BaggageEntry | undefined {
    return this.entries.get(key);
  }

  getAllEntries(): [string, BaggageEntry][] {
    if (this.cachedEntries === null) {
      this.cachedEntries = Array.from(this.entries.entries());
    }

    return this.cachedEntries;
  }

  setEntry(key: string, entry: BaggageEntry): MutableBaggageImpl {
    this.entries.set(key, entry);
    this.cachedEntries = null;

    return this;
  }

  removeEntry(key: string): MutableBaggageImpl {
    this.entries.delete(key);
    this.cachedEntries = null;

    return this;
  }

  removeEntries(...keys: string[]): MutableBaggageImpl {
    for (const key of keys) {
      this.entries.delete(key);
    }

    this.cachedEntries = null;

    return this;
  }

  clear(): MutableBaggageImpl {
    this.entries.clear();
    this.cachedEntries = null;

    return this;
  }
}
