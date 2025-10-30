import * as indexExports from '.';
import { TemporalioSdkInstrumentation } from '.';
import { expect, it } from 'vitest';

it('should have the correct exports', () => {
  expect({ ...indexExports }).toEqual({
    TemporalioSdkInstrumentation
  });
});
