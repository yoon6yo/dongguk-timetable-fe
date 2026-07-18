/**
 * Generic time-based cache for a single async value. The crawler updates
 * MySQL at most once a day, so there's no need for every page load across
 * every visitor to hit the DB fresh — this absorbs repeated requests within
 * the TTL window with a single in-memory value.
 *
 * Deliberately not Next.js's own route-segment/`fetch` caching: this app is
 * on a new-ish Next.js version with an in-flux caching model (Cache
 * Components), and this plain TTL cache is simple, version-independent, and
 * easy to unit-test directly (fake timers, no framework internals involved).
 */
export function createTtlCache<T>(ttlMs: number, loader: () => Promise<T>) {
  let entry: { data: T; expiresAt: number } | null = null;
  let pending: Promise<T> | null = null;

  return {
    async get(): Promise<T> {
      if (entry && Date.now() < entry.expiresAt) {
        return entry.data;
      }
      // Coalesce concurrent misses into a single load rather than hammering
      // the DB with N simultaneous queries the moment the TTL expires.
      if (!pending) {
        pending = loader()
          .then((data) => {
            entry = { data, expiresAt: Date.now() + ttlMs };
            return data;
          })
          .finally(() => {
            pending = null;
          });
      }
      return pending;
    },
    clear(): void {
      entry = null;
    },
  };
}
