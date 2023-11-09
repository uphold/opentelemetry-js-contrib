# @uphold/opentelemetry-baggage-span-processor

Package that sets all baggage entries as span attributes.

## Installation

```sh
npm install @uphold/opentelemetry-baggage-span-processor
```

## Why?

Finding spans or traces that match contextual data stored in baggage is not an out-of-the-box feature in OpenTelemetry. This packages sets all baggage entries as span attributes so that you can search any span based on data stored in the baggage, like a `user.id` or `request.id`.

## Usage

Add `BaggageSpanProcessor` as a `spanProcessor` to the `tracerProvider`. Here's how it looks if you are using the NodeSDK:

```js
import { BaggageSpanProcessor } from '@uphold/opentelemetry-baggage-span-processor';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ProxyTracerProvider, trace } from '@opentelemetry/api';

const sdk = new NodeSDK({});

sdk.start();

const proxyTracerProvider = trace.getTracerProvider() as ProxyTracerProvider;
const tracerProvider = proxyTracerProvider.getDelegate() as NodeTracerProvider;

tracerProvider.addSpanProcessor(new BaggageSpanProcessor());
```

## Tests

```sh
npm test
```

## License

Licensed under MIT.
