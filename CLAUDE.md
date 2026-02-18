# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a monorepo for OpenTelemetry JavaScript contributions maintained by Uphold. It uses npm workspaces with all packages living under `packages/`. The repository contains three packages:

- **@uphold/opentelemetry-baggage-span-processor**: Sets all baggage entries as span attributes
- **@uphold/opentelemetry-mutable-baggage**: Provides a mutable baggage implementation (vs immutable default)
- **@uphold/opentelemetry-instrumentation-connect-node**: Instrumentation for @connectrpc/connect-node

## Common Commands

### Root Level
- **Install dependencies**: `npm ci`
- **Run all tests**: `npm test`
- **Build all packages**: `npm run build`
- **Lint all packages**: `npm run lint`

### Working with Specific Packages
- **Test single package**: `npm run test --workspace packages/<package-name>`
- **Build single package**: `npm run build --workspace packages/<package-name>`
- **Lint single package**: `npm run lint --workspace packages/<package-name>`
- **Release a package**: `cd packages/<package-name> && npm run release`

Example: `npm run test --workspace packages/opentelemetry-baggage-span-processor`

### Running Tests with Vitest
Within a package directory, you can use vitest directly:
- **Run tests**: `npm test` (or `vitest`)
- **Run tests in watch mode**: `vitest --watch`
- **Run with coverage**: `vitest --coverage`

## Repository Structure

### Package Layout
Each package follows this structure:
```
packages/<package-name>/
├── src/
│   ├── *.ts           # Source files
│   └── *.test.ts      # Test files (colocated with source)
├── dist/              # Compiled output (gitignored)
├── package.json
├── tsconfig.json      # Extends ../../tsconfig.base
├── eslint.config.mjs  # Extends root config
└── README.md
```

### TypeScript Configuration
- Base config at `tsconfig.base.json` with strict mode enabled
- Package configs extend base and specify `src/` as rootDir and `dist/` as outDir
- Test files (*.test.ts) are excluded from compilation
- Target: ES2022, Module: node16

### Testing Setup
- Uses Vitest for testing with coverage enabled by default
- Coverage reports include all `src/**/*.ts` files except test files
- Tests are colocated with source files in `src/` directories
- Mocks are automatically cleared and restored between tests

### Linting
- ESLint with `eslint-config-uphold` and TypeScript support
- Additional config for Vitest test files
- Lint-staged runs on pre-commit hook
- Type checking runs after linting via `tsc --noEmit`

## Release Process

Releases are handled via GitHub Actions workflow. To release a package:
1. Navigate to the [release workflow](https://github.com/uphold/opentelemetry-js-contrib/actions/workflows/release.yaml)
2. Click "Run Workflow" and select the package to release
3. The workflow uses `release-it` which:
   - Generates changelog from git history
   - Bumps version
   - Runs build
   - Creates git tag and GitHub release
   - Publishes to npm

Package naming convention for releases: `@uphold/<package-name>@v<version>`

## Development Notes

- **Node version**: Requires Node >=22
- **Package manager**: npm (no yarn or pnpm)
- **Branch**: Main branch is `master`
- **Pre-commit hooks**: Automatically run lint-staged on git commits
- **OpenTelemetry patterns**: Packages implement standard OpenTelemetry interfaces (e.g., SpanProcessor interface for baggage-span-processor)
- **Immutability caveat**: The mutable-baggage package exists specifically to work around OpenTelemetry's default immutable baggage in middleware scenarios where context needs to be shared across stack-based middleware
