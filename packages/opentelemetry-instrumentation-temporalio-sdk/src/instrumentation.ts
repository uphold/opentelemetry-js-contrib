import type { Client, ClientOptions } from '@temporalio/client';
import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import {
  OpenTelemetryWorkerActivityInboundInterceptor,
  OpenTelemetryWorkerActivityOutboundInterceptor,
  OpenTelemetryWorkflowClientInterceptor
} from './interceptors';
import { TemporalioSdkInstrumentationConfig } from './types';
import type { Worker, WorkerOptions } from '@temporalio/worker';
import packageJson from '../package.json';

export class TemporalioSdkInstrumentation extends InstrumentationBase<TemporalioSdkInstrumentationConfig> {
  constructor(config: TemporalioSdkInstrumentationConfig = {}) {
    super('@uphold/opentelemetry-instrumentation-temporalio-sdk', packageJson.version, config);
  }

  init() {
    return [
      new InstrumentationNodeModuleDefinition(
        '@temporalio/client',
        ['^1.0.0'],
        moduleExports => {
          this._wrap(moduleExports, 'Client', this._patchClient());

          return moduleExports;
        },
        moduleExports => {
          if (moduleExports === undefined) {
            return;
          }

          this._unwrap(moduleExports, 'Client');
        }
      ),
      new InstrumentationNodeModuleDefinition(
        '@temporalio/worker',
        ['^1.0.0'],
        moduleExports => {
          this._wrap(moduleExports.Worker, 'create', this._patchWorkerCreate());

          return moduleExports;
        },
        moduleExports => {
          if (moduleExports === undefined) {
            return;
          }

          this._unwrap(moduleExports.Worker, 'create');
        }
      )
    ];
  }

  private _patchClient() {
    return (original: typeof Client) => {
      this._diag.debug('patched Client constructor');

      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;

      return class extends original {
        constructor(options?: ClientOptions) {
          const existingWorkflowInterceptors = options?.interceptors?.workflow ?? [];

          // If the deprecated object form is used, do not patch.
          if (!Array.isArray(existingWorkflowInterceptors)) {
            self._diag.warn(
              'detected deprecated object form of interceptors, skipping adding `OpenTelemetryWorkflowClientInterceptor`...'
            );

            super(options);
          } else {
            const clientInterceptor = new OpenTelemetryWorkflowClientInterceptor(self.tracer);

            super({
              ...options,
              interceptors: {
                ...options?.interceptors,
                workflow: [clientInterceptor, ...existingWorkflowInterceptors]
              }
            });
          }
        }
      };
    };
  }

  private _patchWorkerCreate() {
    return (original: typeof Worker.create) => {
      this._diag.debug('patched Worker.create');

      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;

      return (options: WorkerOptions) => {
        const patchedOptions: WorkerOptions = {
          ...options,
          interceptors: {
            ...options.interceptors,
            activity: [
              ctx => ({
                inbound: new OpenTelemetryWorkerActivityInboundInterceptor(ctx, self.tracer),
                outbound: new OpenTelemetryWorkerActivityOutboundInterceptor()
              }),
              ...(options.interceptors?.activity ?? [])
            ]
          }
        };

        return original(patchedOptions);
      };
    };
  }
}
