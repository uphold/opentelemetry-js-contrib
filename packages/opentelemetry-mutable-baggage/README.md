# @uphold/opentelemetry-mutable-baggage

Package that allows an OpenTelemetry baggage to be mutable.

## Installation

```sh
npm install @uphold/opentelemetry-mutable-baggage
```

## Why?

The default OpenTelemetry Baggage is immutable. Any change to it will create a new instance that you will need to save on the context. Because context is also immutable, saving the new baggage on the context will also create a new context. This makes it unsuitable for use-cases in which a piece of code needs to have visibility of items set on the baggage made by other pieces of code.

One common use-case is in frameworks with stack based middleware, such as Koa:

```js
// 1st middleware:
const requestLifecycleMiddleware = (context, next) => {
  const { request } = context;
  const createdAt = new Date();
  const startedAt = process.hrtime();

  try {
    await next();
  } finally {
    // This will always be undefined!
    const userId = api.propagation.getActiveBaggage()?.getEntry('user-id');

    log.info({ userId }, `Request to ${request.method} ${request.path}`);
  }
};

// 2nd middleware:
const authenticationMiddleware = (context, next) => {
  const baggage = api.propagation.getActiveBaggage();
  const newBaggage = baggage?.setEntry('user-id', { value: 'faaebf49-c915-43ae-84fc-96c1711d2394' });

  await api.context.with(api.context.setBaggage(baggage), next);
};
```

In the example above, `requestLifecycleMiddleware` will never see the `user-id` entry on the active baggage.

## Usage

Replace `W3CBaggagePropagator` with `W3CMutableBaggagePropagator`, since it's a drop-in replacement. Here's how it looks if you are using the NodeSDK:

```js
import { CompositePropagator, W3CTraceContextPropagator } from '@opentelemetry/core';
import { W3CMutableBaggagePropagator } from '@uphold/opentelemetry-mutable-baggage';

const textMapPropagator = new CompositePropagator({
  propagators: [new W3CTraceContextPropagator(), new W3CMutableBaggagePropagator()]
});

const sdk = new NodeSDK({
  // ...
  textMapPropagator
});
```

> ⚠️ The `textMapPropagator` option of the SDK will be ignored if both `spanProcessor` or `traceExporter` are not defined in the options. Either define those or call `api.propagation.setGlobalPropagator(textMapPropagator)` manually.

Then, use the regular `propagation` api to interact with the baggage:

```js
import { propagation } from '@opentelemetry/api';

// `setEntry` will no longer create a new baggage!
propagation.getActiveBaggage()?.setEntry('foo', 'bar');
```

## Tests

```sh
npm test
```

## License

Licensed under MIT.
