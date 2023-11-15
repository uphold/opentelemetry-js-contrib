import * as api from '@opentelemetry/api';
import type * as koaCompose from 'koa-compose';
import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { KoaComposeInstrumentationConfig } from './types';
import type { Middleware } from 'koa';
import { VERSION } from './version';
import { isLayerIgnored } from './utils';

export class KoaComposeInstrumentation extends InstrumentationBase<typeof koaCompose> {
  private originalCompose?: typeof koaCompose;

  constructor(config: KoaComposeInstrumentationConfig = {}) {
    super('@uphold/opentelemetry-instrumentation-koa-compose', VERSION, Object.assign({}, config));
  }

  override setConfig(config: KoaComposeInstrumentationConfig = {}) {
    this._config = Object.assign({}, config);
  }

  override getConfig(): KoaComposeInstrumentationConfig {
    return this._config as KoaComposeInstrumentationConfig;
  }

  protected init() {
    return new InstrumentationNodeModuleDefinition<typeof koaCompose>(
      'koa-compose',
      ['^4.0.0'],
      moduleExports => {
        api.diag.debug('Patching koa-compose');

        this.originalCompose = moduleExports;

        moduleExports = (middlewares: Middleware[]) => {
          middlewares = middlewares.map((middleware, index) => {
            if (isLayerIgnored(middleware.name, this._config)) {
              return middleware;
            }

            return (context, next) => {
              if (!this.isEnabled()) {
                return middleware(context, next);
              }

              const span = this.tracer.startSpan(
                `compose - [${index + 1}/${middlewares.length}] ${middleware.name || 'unnamed'}`
              );
              const newContext = api.trace.setSpan(api.context.active(), span);

              return api.context.with(newContext, async () => {
                try {
                  return await middleware(context, next);
                } catch (error: unknown) {
                  span.recordException(error as api.Exception);

                  throw error;
                } finally {
                  span.end();
                }
              });
            };
          });

          return this.originalCompose!(middlewares);
        };

        return moduleExports;
      },
      moduleExports => {
        api.diag.debug('Unpatching koa-compose');

        moduleExports = this.originalCompose!;

        return moduleExports;
      }
    );
  }
}
