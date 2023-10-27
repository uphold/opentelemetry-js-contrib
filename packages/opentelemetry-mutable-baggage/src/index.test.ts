import * as exports from '.';
import { expect, it } from 'vitest';

it('should have the correct exports', () => {
  expect({ ...exports }).toEqual({
    MutableBaggageImpl: expect.any(Function),
    W3CMutableBaggagePropagator: expect.any(Function)
  });
});
