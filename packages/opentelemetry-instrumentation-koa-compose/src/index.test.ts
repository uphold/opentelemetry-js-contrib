import * as exports from '.';
import { expect, it } from 'vitest';

it('should have the correct exports', () => {
  expect({ ...exports }).toEqual({
    KoaComposeInstrumentation: expect.any(Function)
  });
});
