import * as exports from '.';
import { ConnectNodeInstrumentation } from '.';
import { expect, it } from 'vitest';

it('should have the correct exports', () => {
  expect({ ...exports }).toEqual({
    ConnectNodeInstrumentation
  });
});
