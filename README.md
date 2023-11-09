# opentelemetry-js-contrib

A repository for [OpenTelemetry](https://opentelemetry.io/) JavaScript contributions made by Uphold.

## Packages

This repository is setup as a mono-repository and all packages live under [`packages`](./packages).

| Name | Description |
|------|-------------|
| [`@uphold/opentelemetry-baggage-span-processor`](./packages/opentelemetry-baggage-span-processor/) | Package that sets all baggage entries as span attributes |
| [`@uphold/opentelemetry-mutable-baggage`](./packages/opentelemetry-mutable-baggage/) | Package that allows an OpenTelemetry baggage to be mutable |

## Tests

```sh
npm test
```

## License

All packages are licensed under MIT.

## Release

Click on `Run Workflow` on the [release github action](https://github.com/uphold/opentelemetry-js-contrib/actions/workflows/release.yaml).
