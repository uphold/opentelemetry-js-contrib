import { KoaComposeInstrumentationConfig, NameMatcher } from './types';

const satisfiesPattern = (constant: string, pattern: NameMatcher): boolean => {
  if (typeof pattern === 'string') {
    return pattern === constant;
  } else if (pattern instanceof RegExp) {
    return pattern.test(constant);
  } else if (typeof pattern === 'function') {
    return pattern(constant);
  }
  throw new TypeError('Pattern is in unsupported datatype');
};

export const isLayerIgnored = (name: string, config?: KoaComposeInstrumentationConfig): boolean => {
  if (!Array.isArray(config?.spanLayers)) {
    return true;
  }

  try {
    for (const pattern of config!.spanLayers) {
      if (satisfiesPattern(name, pattern)) {
        return false;
      }
    }
  } catch (e) {
    // No-op.
  }

  return true;
};
