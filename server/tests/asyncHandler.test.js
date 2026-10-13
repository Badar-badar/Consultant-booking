const asyncHandler = require('../src/utils/asyncHandler');

describe('asyncHandler', () => {
  test('forwards synchronous throws to next', async () => {
    const error = new Error('handler failed');
    const next = jest.fn();
    const handler = asyncHandler(() => {
      throw error;
    });

    handler({}, {}, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(error);
  });

  test('forwards rejected promises to next', async () => {
    const error = new Error('async handler failed');
    const next = jest.fn();
    const handler = asyncHandler(() => Promise.reject(error));

    handler({}, {}, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(error);
  });
});
