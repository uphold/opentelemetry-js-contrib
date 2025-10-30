# @uphold/opentelemetry-instrumentation-temporalio-sdk

OpenTelemetry instrumentation for [Temporal SDK](https://www.npmjs.com/package/@temporalio/client) that automatically installs OpenTelemetry interceptors for tracing Temporal workflows and activities.

This package provides automatic instrumentation inspired by [`@temporalio/interceptors-opentelemetry`](https://github.com/temporalio/sdk-typescript/tree/main/packages/interceptors-opentelemetry), but uses up-to-date OpenTelemetry dependencies consistent with other packages in this repository.

## Installation

```sh
npm install @uphold/opentelemetry-instrumentation-temporalio-sdk
```

## Supported versions

- [`@temporalio/client`](https://www.npmjs.com/package/@temporalio/client) versions `^1.0.0`
- [`@temporalio/worker`](https://www.npmjs.com/package/@temporalio/worker) versions `^1.0.0`

## Usage

Enable the instrumentation offered by this package, like so:

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { TemporalioSdkInstrumentation } = require('@uphold/opentelemetry-instrumentation-temporalio-sdk');

const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())]
});

provider.register();

registerInstrumentations({
  instrumentations: [new TemporalioSdkInstrumentation()]
});
```

After registration, the instrumentation will automatically inject OpenTelemetry interceptors into:

- **Client**: `@temporalio/client` - Traces workflow starts and signals
- **Worker**: `@temporalio/worker` - Traces activity executions

## Tests

```sh
npm test
```

## License

Licensed under MIT.
