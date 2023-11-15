import { InstrumentationConfig } from '@opentelemetry/instrumentation';

export type NameMatcher = string | RegExp | ((name: string) => boolean);

export interface KoaComposeInstrumentationConfig extends InstrumentationConfig {
  spanLayers?: NameMatcher[];
}
