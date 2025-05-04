import {
  BaggageEntry,
  ROOT_CONTEXT,
  baggageEntryMetadataFromString,
  defaultTextMapGetter,
  defaultTextMapSetter,
  propagation
} from '@opentelemetry/api';
import { MutableBaggageImpl } from './mutable-baggage-impl';
import { W3CMutableBaggagePropagator } from './w3c-mutable-baggage-propagator';
import { beforeEach, describe, expect, it } from 'vitest';
import { suppressTracing } from '@opentelemetry/core';

const mutableBaggagePropagator = new W3CMutableBaggagePropagator();

let carrier: { [key: string]: unknown };

beforeEach(() => {
  carrier = {};
});

describe('.inject()', () => {
  it('should set baggage header', () => {
    const entries = new Map([
      ['key1', { value: 'd4cda95b652f4a1592b449d5929fda1b' }],
      ['key3', { value: 'c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a' }],
      [
        'key4',
        {
          metadata: baggageEntryMetadataFromString('key4prop1=value1;key4prop2=value2;key4prop3WithNoValue'),
          value: 'foo'
        }
      ],
      ['with/slash', { value: 'with spaces' }]
    ]);
    const baggage = new MutableBaggageImpl(entries);
    const context = propagation.setBaggage(ROOT_CONTEXT, baggage);

    mutableBaggagePropagator.inject(context, carrier, defaultTextMapSetter);

    expect(carrier.baggage).toBe(
      'key1=d4cda95b652f4a1592b449d5929fda1b,key3=c88815a7-0fa9-4d95-a1f1-cdccce3c5c2a,key4=foo;key4prop1=value1;key4prop2=value2;key4prop3WithNoValue,with%2Fslash=with%20spaces'
    );
  });

  it('should not set baggage header if baggage is undefined', () => {
    mutableBaggagePropagator.inject(ROOT_CONTEXT, carrier, defaultTextMapSetter);

    expect(carrier.baggage).toBeUndefined();
  });

  it('should not set baggage header if tracing is suppressed', () => {
    const entries = new Map([['key1', { value: 'd4cda95b652f4a1592b449d5929fda1b' }]]);
    const baggage = new MutableBaggageImpl(entries);
    const context = propagation.setBaggage(suppressTracing(ROOT_CONTEXT), baggage);

    mutableBaggagePropagator.inject(context, carrier, defaultTextMapSetter);

    expect(carrier.baggage).toBeUndefined();
  });

  it('should skip all entries whose length exceeds the W3C standard limit of 4096 bytes', () => {
    const longKey = Array(96).fill('k').join('');
    const shortKey = Array(95).fill('k').join('');
    const value = Array(4000).fill('v').join('');

    const baggage = new MutableBaggageImpl(
      new Map([
        ['aa', { value: 'shortvalue' }],
        ['a'.repeat(4097), { value: 'foo' }],
        [`${[shortKey]}`, { value }],
        [`${[longKey]}`, { value }]
      ])
    );
    const context = propagation.setBaggage(ROOT_CONTEXT, baggage);

    mutableBaggagePropagator.inject(context, carrier, defaultTextMapSetter);

    expect(carrier.baggage).toBe(`aa=shortvalue,${shortKey}=${value}`);
  });

  it('should not exceed the W3C standard header length limit of 8192 bytes', () => {
    const longKey0 = Array(48).fill('0').join('');
    const longKey1 = Array(49).fill('1').join('');
    const longValue = Array(4000).fill('v').join('');

    const baggage = new MutableBaggageImpl(
      new Map([
        ['aa', { value: Array(8000).fill('v').join('') }],
        [`${[longKey0]}`, { value: longValue }],
        [`${[longKey1]}`, { value: longValue }]
      ])
    );
    const context = propagation.setBaggage(ROOT_CONTEXT, baggage);

    mutableBaggagePropagator.inject(context, carrier, defaultTextMapSetter);

    const header = carrier.baggage as string;

    expect(header.length).toEqual(8100);
    expect(carrier.baggage).toBe(`${longKey0}=${longValue},${longKey1}=${longValue}`);
  });

  it('should not exceed the W3C standard header entry limit of 180 entries', () => {
    const entries: Map<string, BaggageEntry> = new Map();

    Array(200)
      .fill(0)
      .forEach((_, i) => {
        entries.set(`${i}`, { value: 'v' });
      });

    const baggage = new MutableBaggageImpl(entries);
    const context = propagation.setBaggage(ROOT_CONTEXT, baggage);

    mutableBaggagePropagator.inject(context, carrier, defaultTextMapSetter);

    const header = carrier.baggage as string;

    expect(header.length).toEqual(969);
    expect(header.split(',').length).toEqual(180);
  });
});

describe('.extract()', () => {
  const baggageValue =
    'key1=d4cda95b==,key3=c88815a7,key4=foo;key4prop1=value1;k>ey4prop2=value2;key4prop3WithNoValue, keyn   = valn, keym =valm';
  const expected = new MutableBaggageImpl(
    new Map([
      ['key1', { value: 'd4cda95b==' }],
      ['key3', { value: 'c88815a7' }],
      [
        'key4',
        {
          value: 'foo',
          // eslint-disable-next-line sort-keys-fix/sort-keys-fix
          metadata: baggageEntryMetadataFromString('key4prop1=value1;key4prop2=value2;key4prop3WithNoValue')
        }
      ],
      ['keyn', { value: 'valn' }],
      ['keym', { value: 'valm' }]
    ])
  );

  it('should extract context of a sampled span from carrier', () => {
    carrier.baggage = baggageValue;

    const extractedContext = mutableBaggagePropagator.extract(ROOT_CONTEXT, carrier, defaultTextMapGetter);
    const extractedBaggage = propagation.getBaggage(extractedContext);

    expect(extractedBaggage).toBeInstanceOf(MutableBaggageImpl);
    expect(JSON.stringify(extractedBaggage?.getAllEntries())).toEqual(JSON.stringify(expected.getAllEntries()));
  });

  it('should extract context of a sampled span when the headerValue comes as array', () => {
    carrier.baggage = [baggageValue];
    const extractedBaggage = propagation.getBaggage(
      mutableBaggagePropagator.extract(ROOT_CONTEXT, carrier, defaultTextMapGetter)
    );

    expect(extractedBaggage).toBeInstanceOf(MutableBaggageImpl);
    expect(JSON.stringify(extractedBaggage?.getAllEntries())).toEqual(JSON.stringify(expected.getAllEntries()));
  });

  it('should extract context of a sampled span when the headerValue comes as array with multiple items', () => {
    carrier.baggage = [
      'key1=d4cda95b==,key3=c88815a7,key4=foo;key4prop1=value1;k>ey4prop2=value2;key4prop3WithNoValue, keyn   = valn',
      'keym =valm'
    ];

    const extractedContext = mutableBaggagePropagator.extract(ROOT_CONTEXT, carrier, defaultTextMapGetter);
    const extractedBaggage = propagation.getBaggage(extractedContext);

    expect(extractedBaggage).toBeInstanceOf(MutableBaggageImpl);
    expect(JSON.stringify(extractedBaggage?.getAllEntries())).toEqual(JSON.stringify(expected.getAllEntries()));
  });

  it('should set baggage even if carrier is empty', () => {
    const extractedContext = mutableBaggagePropagator.extract(ROOT_CONTEXT, carrier, defaultTextMapGetter);
    const extractedBaggage = propagation.getBaggage(extractedContext);

    expect(extractedBaggage).toBeInstanceOf(MutableBaggageImpl);
    expect(JSON.stringify(extractedBaggage?.getAllEntries())).toEqual('[]');
  });
});

describe('.fields()', () => {
  it('returns the fields used by the baggage spec', () => {
    const propagator = new W3CMutableBaggagePropagator();

    expect(propagator.fields()).toEqual(['baggage']);
  });
});
