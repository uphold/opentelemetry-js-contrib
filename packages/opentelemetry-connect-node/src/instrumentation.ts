import type {
  ConnectNodeAdapterOptions,
  ConnectTransportOptions,
  GrpcTransportOptions,
  GrpcWebTransportOptions,
  connectNodeAdapter,
  createConnectTransport,
  createGrpcTransport,
  createGrpcWebTransport
} from '@connectrpc/connect-node';
import { ConnectNodeInstrumentationConfig } from './types';
import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { createInterceptor } from './interceptor';
import packageJson from '../package.json';

export class ConnectNodeInstrumentation extends InstrumentationBase<ConnectNodeInstrumentationConfig> {
  constructor(config: ConnectNodeInstrumentationConfig = {}) {
    super('@uphold/opentelemetry-connect-node', packageJson.version, config);
  }

  init() {
    return [
      new InstrumentationNodeModuleDefinition(
        '@connectrpc/connect-node',
        ['^2.0.0'],
        moduleExports => {
          this._wrap(moduleExports, 'createConnectTransport', this._patchCreateConnectTransport());
          this._wrap(moduleExports, 'createGrpcTransport', this._patchCreateGrpcTransport());
          this._wrap(moduleExports, 'createGrpcWebTransport', this._patchCreateGrpcWebTransport());
          this._wrap(moduleExports, 'connectNodeAdapter', this._patchConnectNodeAdapter());

          return moduleExports;
        },
        moduleExports => {
          if (moduleExports === undefined) {
            return;
          }

          this._unwrap(moduleExports, 'createConnectTransport');
          this._unwrap(moduleExports, 'createGrpcTransport');
          this._unwrap(moduleExports, 'createGrpcWebTransport');
          this._unwrap(moduleExports, 'connectNodeAdapter');
        }
      )
    ];
  }

  private _patchCreateConnectTransport() {
    return (original: typeof createConnectTransport) => {
      this._diag.debug('patched createConnectTransport');

      return (options: ConnectTransportOptions) => {
        const interceptor = createInterceptor(this.getConfig(), this._diag, this.tracer, 'client');

        return original({
          ...options,
          interceptors: [interceptor, ...(options.interceptors ?? [])]
        });
      };
    };
  }

  private _patchCreateGrpcTransport() {
    return (original: typeof createGrpcTransport) => {
      this._diag.debug('patched createGrpcTransport');

      return (options: GrpcTransportOptions) => {
        const interceptor = createInterceptor(this.getConfig(), this._diag, this.tracer, 'client');

        return original({
          ...options,
          interceptors: [interceptor, ...(options.interceptors ?? [])]
        });
      };
    };
  }

  private _patchCreateGrpcWebTransport() {
    return (original: typeof createGrpcWebTransport) => {
      this._diag.debug('patched createGrpcWebTransport');

      return (options: GrpcWebTransportOptions) => {
        const interceptor = createInterceptor(this.getConfig(), this._diag, this.tracer, 'client');

        return original({
          ...options,
          interceptors: [interceptor, ...(options.interceptors ?? [])]
        });
      };
    };
  }

  private _patchConnectNodeAdapter() {
    return (original: typeof connectNodeAdapter) => {
      this._diag.debug('patched connectNodeAdapter');

      return (options: ConnectNodeAdapterOptions) => {
        const interceptor = createInterceptor(this.getConfig(), this._diag, this.tracer, 'server');

        return original({
          ...options,
          interceptors: [interceptor, ...(options.interceptors ?? [])]
        });
      };
    };
  }
}
