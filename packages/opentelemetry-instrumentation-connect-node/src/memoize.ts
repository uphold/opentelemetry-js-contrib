/**
 * Simple memoization function for single-argument functions.
 * Optimized for the URL parsing use case in this package.
 *
 * @param {(arg: string) => unknown} fn - The function to memoize.
 * @returns {(arg: string) => unknown} The memoized version of the function.
 */
export function memoize<T extends (arg: string) => unknown>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((arg: string) => {
    if (cache.has(arg)) {
      return cache.get(arg);
    }

    const result = fn(arg) as ReturnType<T>;

    cache.set(arg, result);

    return result;
  }) as T;
}
