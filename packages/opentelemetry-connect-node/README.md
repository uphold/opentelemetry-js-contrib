# @uphold/opentelemetry-connect-node

OpenTelemetry instrumentation for `@connectrpc/connect-node` RPC client and server.

## Installation

```sh
npm install @uphold/opentelemetry-connect-node
```

## Supported versions

- [`@connectrpc/connect-node`](https://www.npmjs.com/package/@connectrpc/connect-node) versions `^2.0.0`

## Usage

Enable the instrumentation offered by this package, like so:

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { ConnectNodeInstrumentation } = require('@uphold/opentelemetry-connect-node');

const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())]
});

provider.register();

registerInstrumentations({
  instrumentations: [new ConnectNodeInstrumentation()]
});
```

### Instrumentation options

The instrumentation accepts the following configuration:

| Options | Type | Description |
| ------- | ---- | ----------- |
| `ignoreRequest` | `IgnoreRequestMatcher` | The instrumentation will not trace any requests return `true` from the function. |
| `metadataToSpanAttributes` | `MetadataToSpanAttributes` | List of case insensitive metadata to convert to span attributes. Client and server (outgoing requests, incoming responses) metadata attributes will be converted to span attributes in the form of `rpc.{rpc_system}{request/response}.metadata.metadata_key`, e.g. `rpc.grpc.response.metadata.date` |

## Caveats

<details>
  <summary>Non-unary requests will not be traced</summary>
  <br>

  Only unary requests will be traced. Server streaming, client streaming and bidirectional streaming are not supported due to a bug in context propagation for generator functions. Supposedly, there are workarounds but none of them worked. See https://github.com/open-telemetry/opentelemetry-js/issues/2951 and https://github.com/nodejs/node/issues/42237 for more details.
</details>

## Tests

```sh
npm test
```

## License

Licensed under MIT.
