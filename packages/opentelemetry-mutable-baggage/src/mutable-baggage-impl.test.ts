import { MutableBaggageImpl } from './mutable-baggage-impl';
import { describe, expect, it } from 'vitest';

describe('constructor()', () => {
  it('should create an instance with no entries', () => {
    const mutableBaggageImpl = new MutableBaggageImpl();

    expect(mutableBaggageImpl.getAllEntries().length).toEqual(0);
  });

  it('should create an instance with a set of entries', () => {
    const entries = new Map([
      ['key1', { value: 'd4cda95b652f4a1592b449d5929fda1b' }],
      ['key2', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }]
    ]);
    const mutableBaggageImpl = new MutableBaggageImpl(entries);

    const allEntries = mutableBaggageImpl.getAllEntries();

    expect(allEntries.length).toEqual(2);
    expect(allEntries).toEqual([
      ['key1', { value: 'd4cda95b652f4a1592b449d5929fda1b' }],
      ['key2', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }]
    ]);
  });
});

describe('getEntry()', () => {
  const entries = new Map([
    ['key1', { value: 'd4cda95b652f4a1592b449d5929fda1b' }],
    ['key2', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }]
  ]);
  const mutableBaggageImpl = new MutableBaggageImpl(entries);

  it('should return undefined if the entry does not exist', () => {
    expect(mutableBaggageImpl.getEntry('foo')).toBeUndefined();
  });

  it('should return the correct value if the entry exists', () => {
    expect(mutableBaggageImpl.getEntry('key1')).toEqual({ value: 'd4cda95b652f4a1592b449d5929fda1b' });
  });
});

describe('getAllEntries()', () => {
  it('should return an empty array', () => {
    const mutableBaggageImpl = new MutableBaggageImpl();

    expect(mutableBaggageImpl.getAllEntries()).toEqual([]);
  });

  it('should return the entries set on the baggage', () => {
    const entries = new Map([
      ['key1', { value: 'd4cda95b652f4a1592b449d5929fda1b' }],
      ['key2', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }]
    ]);
    const mutableBaggageImpl = new MutableBaggageImpl(entries);

    expect(mutableBaggageImpl.getAllEntries()).toEqual([
      ['key1', { value: 'd4cda95b652f4a1592b449d5929fda1b' }],
      ['key2', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }]
    ]);
  });
});

describe('setEntry()', () => {
  it('should add an entry', () => {
    const mutableBaggageImpl = new MutableBaggageImpl();

    mutableBaggageImpl.setEntry('foo', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' });

    expect(mutableBaggageImpl.getAllEntries()).toEqual([['foo', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }]]);
  });

  it('should update an entry', () => {
    const entries = new Map([
      ['key1', { value: 'd4cda95b652f4a1592b449d5929fda1b' }],
      ['key2', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }]
    ]);
    const mutableBaggageImpl = new MutableBaggageImpl(entries);

    mutableBaggageImpl.setEntry('key1', { value: 'foo' });

    expect(mutableBaggageImpl.getAllEntries()).toEqual([
      ['key1', { value: 'foo' }],
      ['key2', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }]
    ]);
  });
});

describe('removeEntry()', () => {
  it('should not remove an entry if does not exist', () => {
    const mutableBaggageImpl = new MutableBaggageImpl();

    mutableBaggageImpl.removeEntry('foo');

    expect(mutableBaggageImpl.getAllEntries()).toEqual([]);
  });

  it('should remove an entry', () => {
    const entries = new Map([
      ['key1', { value: 'd4cda95b652f4a1592b449d5929fda1b' }],
      ['key2', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }]
    ]);
    const mutableBaggageImpl = new MutableBaggageImpl(entries);

    mutableBaggageImpl.removeEntry('key1');

    expect(mutableBaggageImpl.getAllEntries()).toEqual([['key2', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }]]);
  });
});

describe('removeEntries()', () => {
  it('should not remove entries if they do not exist', () => {
    const mutableBaggageImpl = new MutableBaggageImpl();

    mutableBaggageImpl.removeEntries('foo', 'biz');

    expect(mutableBaggageImpl.getAllEntries()).toEqual([]);
  });

  it('should remove an entry', () => {
    const entries = new Map([
      ['key1', { value: 'd4cda95b652f4a1592b449d5929fda1b' }],
      ['key2', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }],
      ['key3', { value: 'biz' }]
    ]);
    const mutableBaggageImpl = new MutableBaggageImpl(entries);

    mutableBaggageImpl.removeEntries('key1', 'key2');

    expect(mutableBaggageImpl.getAllEntries()).toEqual([['key3', { value: 'biz' }]]);
  });
});

describe('clear()', () => {
  it('should clear all entries', () => {
    const entries = new Map([
      ['key1', { value: 'd4cda95b652f4a1592b449d5929fda1b' }],
      ['key2', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }]
    ]);
    const mutableBaggageImpl = new MutableBaggageImpl(entries);

    expect(mutableBaggageImpl.getAllEntries()).toHaveLength(2);

    mutableBaggageImpl.clear();

    expect(mutableBaggageImpl.getAllEntries()).toHaveLength(0);
  });
});
