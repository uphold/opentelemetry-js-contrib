# @uphold/opentelemetry-instrumentation-koa-compose

Package that instruments koa-compose.

## Installation

```sh
npm install @uphold/opentelemetry-instrumentation-koa-compose
```

## Why?

When instrumenting koa, if koa-context is used, it can hide and obfuscate some middleware. This package allows these composed middlewares to be spanned.

## Usage

Add `KoaComposeInstrumentation` to the list of instrumentations. Here's how it looks if you are using the NodeSDK:

```js
import { KoaComposeInstrumentation } from '@uphold/opentelemetry-instrumentation-koa-compose';

const sdk = new NodeSDK({
  instrumentations: [
    KoaComposeInstrumentation({
      spanLayers: ['string', /regexp/, name => name === 'function']
    })
  ]
});

sdk.start();
```

## Tests

```sh
npm test
```

## License

Licensed under MIT.
