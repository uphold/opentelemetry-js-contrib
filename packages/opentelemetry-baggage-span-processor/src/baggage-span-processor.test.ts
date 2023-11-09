import * as api from '@opentelemetry/api';
import { BaggageSpanProcessor } from './baggage-span-processor';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Span } from '@opentelemetry/sdk-trace-base';
import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(() => {
  new NodeTracerProvider().register();
});

describe('.onStart()', () => {
  it('should add all baggage attributes as span attributes', () => {
    const baggage = api.propagation.createBaggage({
      'request.id': { value: 'foo' },
      'user.id': { value: 'bar' }
    });
    const context = api.propagation.setBaggage(api.context.active(), baggage);
    const span = api.trace.getTracer('foo').startSpan('bar') as Span;
    const baggageSpanProcessor = new BaggageSpanProcessor();

    baggageSpanProcessor.onStart(span, context);

    expect(span.attributes).toEqual({ 'request.id': 'foo', 'user.id': 'bar' });
  });

  it('should not add any span attribute if there is no active baggage', () => {
    const context = api.context.active();
    const span = api.trace.getTracer('foo').startSpan('bar') as Span;
    const baggageSpanProcessor = new BaggageSpanProcessor();

    baggageSpanProcessor.onStart(span, context);

    expect(span.attributes).toEqual({});
  });

  it('should not add any span attribute if there active baggage is empty', () => {
    const baggage = api.propagation.createBaggage();
    const context = api.propagation.setBaggage(api.context.active(), baggage);
    const span = api.trace.getTracer('foo').startSpan('bar') as Span;
    const baggageSpanProcessor = new BaggageSpanProcessor();

    baggageSpanProcessor.onStart(span, context);

    expect(span.attributes).toEqual({});
  });
});
