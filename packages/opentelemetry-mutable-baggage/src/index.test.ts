import * as exports from '.';
import { MutableBaggageImpl, W3CMutableBaggagePropagator } from '.';
import { expect, it } from 'vitest';

it('should have the correct exports', () => {
  expect({ ...exports }).toEqual({
    MutableBaggageImpl,
    W3CMutableBaggagePropagator
  });
});
