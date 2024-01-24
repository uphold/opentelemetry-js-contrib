import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { KoaComposeInstrumentation } from '../src';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { context, trace } from '@opentelemetry/api';

const plugin = new KoaComposeInstrumentation();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const compose = require('koa-compose');

describe('KoaComposeInstrumentation', () => {
  const provider = new NodeTracerProvider();
  const memoryExporter = new InMemorySpanExporter();
  const spanProcessor = new SimpleSpanProcessor(memoryExporter);

  provider.addSpanProcessor(spanProcessor);
  plugin.setTracerProvider(provider);
  const tracer = provider.getTracer('default');

  beforeAll(() => {
    plugin.enable();
  });

  afterAll(() => {
    plugin.disable();
  });

  beforeEach(() => {
    expect(memoryExporter.getFinishedSpans()).toHaveLength(0);
    plugin.setConfig({ enabled: true, spanLayers: [() => true] });
  });

  afterEach(() => {
    memoryExporter.reset();
    context.disable();
  });

  async function simpleResponse(ctx, next) {
    ctx.body = 'test';
    await next();
  }

  async function asyncMiddleware(ctx, next) {
    const start = Date.now();

    await next();
    const ms = Date.now() - start;

    ctx.body = `${ctx.method} ${ctx.url} - ${ms}ms`;
  }

  function failingMiddleware() {
    throw new Error('Foobar');
  }

  describe('Instrumenting koa-compose calls', () => {
    it('should create a child span for middlewares', async () => {
      const rootSpan = tracer.startSpan('rootSpan');
      const composed = compose([asyncMiddleware, simpleResponse]);
      const ctx = {};

      await context.with(trace.setSpan(context.active(), rootSpan), async () => {
        await composed(ctx, async () => {});

        rootSpan.end();

        expect(memoryExporter.getFinishedSpans()).toHaveLength(3);

        const composeSpan1 = memoryExporter
          .getFinishedSpans()
          .find(span => span.name.includes('compose - [1/2] asyncMiddleware'));
        const composeSpan2 = memoryExporter
          .getFinishedSpans()
          .find(span => span.name.includes('compose - [2/2] simpleResponse'));

        expect(composeSpan1).not.toBeUndefined();
        expect(composeSpan2).not.toBeUndefined();
      });
    });

    it('should create a child span witha default name for anonymous middlewares', async () => {
      const rootSpan = tracer.startSpan('rootSpan');
      const composed = compose([(_, next) => next()]);
      const ctx = {};

      await context.with(trace.setSpan(context.active(), rootSpan), async () => {
        await composed(ctx, async () => {});

        rootSpan.end();

        expect(memoryExporter.getFinishedSpans()).toHaveLength(2);

        const composeSpan = memoryExporter
          .getFinishedSpans()
          .find(span => span.name.includes('compose - [1/1] unnamed'));

        expect(composeSpan).not.toBeUndefined();
      });
    });

    it('should create a child span only for whitelisted middlewares', async () => {
      plugin.setConfig({ spanLayers: ['simpleResponse'] });

      const rootSpan = tracer.startSpan('rootSpan');
      const composed = compose([asyncMiddleware, simpleResponse]);
      const ctx = {};

      await context.with(trace.setSpan(context.active(), rootSpan), async () => {
        await composed(ctx, async () => {});

        rootSpan.end();

        expect(memoryExporter.getFinishedSpans()).toHaveLength(2);

        const composeSpan = memoryExporter
          .getFinishedSpans()
          .find(span => span.name.includes('compose - [2/2] simpleResponse'));

        expect(composeSpan).not.toBeUndefined();
      });
    });

    it('should record an event on the span if a middleware throws an error', async () => {
      const rootSpan = tracer.startSpan('rootSpan');
      const composed = compose([failingMiddleware, simpleResponse]);
      const ctx = {};

      await context.with(trace.setSpan(context.active(), rootSpan), async () => {
        await composed(ctx, async () => {}).catch(() => {});

        rootSpan.end();

        expect(memoryExporter.getFinishedSpans()).toHaveLength(2);

        const errorSpan = memoryExporter
          .getFinishedSpans()
          .find(span => span.name.includes('compose - [1/2] failingMiddleware'));

        expect(errorSpan).not.toBeUndefined();

        expect(errorSpan?.events[0].name).toBe('exception');
        expect(errorSpan?.events[0].attributes?.['exception.type']).toBe('Error');
        expect(errorSpan?.events[0].attributes?.['exception.message']).toBe('Foobar');
      });
    });
  });

  describe('Disabling koa instrumentation', () => {
    it('should not create new spans', async () => {
      plugin.disable();
      const rootSpan = tracer.startSpan('rootSpan');

      const composed = compose([simpleResponse]);

      await context.with(trace.setSpan(context.active(), rootSpan), async () => {
        await composed({}, async () => {});

        rootSpan.end();

        expect(memoryExporter.getFinishedSpans()).toHaveLength(1);
        expect(memoryExporter.getFinishedSpans()[0]).not.toBeUndefined();
      });
    });
  });

  describe('getConfig()', () => {
    it('should get the config', () => {
      expect(plugin.getConfig()).toEqual({
        enabled: true,
        spanLayers: [expect.any(Function)]
      });
    });
  });

  describe('setConfig()', () => {
    it('should update the config', () => {
      expect(plugin.getConfig().enabled).toBeTruthy();

      plugin.setConfig({ enabled: false });

      expect(plugin.getConfig().enabled).toBeFalsy();
    });
  });
});
