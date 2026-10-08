import { Context, Span, propagation } from '@opentelemetry/api';

/**
 * Options accepted by {@link BaggageSpanProcessor}.
 */
export interface BaggageSpanProcessorOptions {
  /**
   * Baggage keys that may be copied onto a span, as exact names or regular-expression sources.
   *
   * When omitted, every baggage key is copied (the historical behaviour). Prefer an explicit list
   * in production: baggage is populated from inbound `baggage` request headers and routinely
   * carries `user.id`, e-mail addresses, session identifiers and auth material, all of which are
   * then exported verbatim to the tracing backend.
   */
  baggageKeys?: Array<string | RegExp>;

  /**
   * Maximum number of characters kept from a baggage value. Longer values are truncated.
   *
   * Defaults to `DEFAULT_MAX_VALUE_LENGTH`. Bounding the value keeps a single inbound header from
   * inflating every span.
   */
  maxValueLength?: number;

  /**
   * Baggage keys matching this pattern are never copied, regardless of `baggageKeys`.
   *
   * Defaults to {@link DEFAULT_DENY_PATTERN}. This is the backstop that keeps credentials out of
   * traces even when a caller allow-lists a broad pattern or leaves `baggageKeys` unset.
   */
  denyPattern?: RegExp;
}

/**
 * Default deny pattern for baggage keys.
 *
 * Matches the key names that conventionally carry credentials (`authorization`, `cookie`,
 * `session`, `token`, `password`, `secret`, `api-key`, …) so that a secret smuggled through
 * `baggage` is never attached to a span and exported.
 */
export const DEFAULT_DENY_PATTERN =
  /(?:^|[._-])(?:authorization|auth|cookie|credentials?|passw(?:or)?d|secret|token|api[-_.]?key|session(?:[-_.]?id)?|jwt|bearer|credential)(?:$|[._-])/i;

/**
 * Default maximum length of a copied baggage value.
 */
export const DEFAULT_MAX_VALUE_LENGTH = 256;

/**
 * Return a copy of `pattern` without the global/sticky flags.
 *
 * `RegExp#test` advances `lastIndex` on a `g`/`y` pattern, which would make the check alternate
 * between matching and not matching on successive calls — a filter that silently leaks every
 * other key.
 */
function stateless(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
}

export class BaggageSpanProcessor {
  private readonly baggageKeys?: Array<string | RegExp>;
  private readonly maxValueLength: number;
  private readonly denyPattern: RegExp;

  constructor(options: BaggageSpanProcessorOptions = {}) {
    this.baggageKeys = options.baggageKeys?.map(pattern =>
      typeof pattern === 'string' ? pattern : stateless(pattern)
    );
    this.maxValueLength = options.maxValueLength ?? DEFAULT_MAX_VALUE_LENGTH;
    this.denyPattern = stateless(options.denyPattern ?? DEFAULT_DENY_PATTERN);
  }

  /**
   * Report whether `key` may be copied onto a span.
   *
   * @param key The baggage entry name.
   * @returns `true` when the key passes the deny pattern and the allow list.
   */
  private isAllowed(key: string): boolean {
    if (this.denyPattern.test(key)) {
      return false;
    }

    if (!this.baggageKeys) {
      return true;
    }

    return this.baggageKeys.some(pattern =>
      typeof pattern === 'string' ? pattern === key : pattern.test(key)
    );
  }

  onStart(span: Span, parentContext: Context): void {
    // Copy baggage entries onto the span as attributes.
    //
    // Two hazards are handled here. First, baggage is attacker-influenceable (it arrives in the
    // inbound `baggage` header), so copying every entry verbatim exported credentials to the
    // tracing backend and turned arbitrary header names into span attribute names, giving
    // unbounded attribute cardinality and cost. Second, `onEnd` is a no-op, so attributes were
    // attached even to spans that are never sampled. Entries are therefore filtered through the
    // deny pattern and the optional allow list, and their values are truncated.
    const baggageEntries = propagation.getBaggage(parentContext)?.getAllEntries();

    baggageEntries?.forEach(([key, baggageEntry]) => {
      if (!this.isAllowed(key)) {
        return;
      }

      const value = baggageEntry.value;

      span.setAttribute(
        key,
        value.length > this.maxValueLength ? `${value.slice(0, this.maxValueLength)}…` : value
      );
    });
  }

  onEnd(): void {}

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}