import * as exports from '.';
import { BaggageSpanProcessor } from '.';
import { expect, it } from 'vitest';

it('should have the correct exports', () => {
  expect({ ...exports }).toEqual({
    BaggageSpanProcessor
  });
});
