/**
 * Small, short-lived memos for the things every till request looks up again.
 *
 * A branch with three tablets open was asking the database for the same handful
 * of rows all day. One navigation to /pos/till costs the session, the shift, the
 * stale-shift check, the settings, the categories, the items and the add-on
 * groups — and the order board on the other two screens repeated the settings,
 * the device list, the staff list and both order prefixes every fifteen seconds
 * each. Almost none of it had changed since the last time it was asked.
 *
 * So the slow-changing lookups are held for a few seconds. The window is
 * deliberately short — a price edited in admin has to reach a live till, and a
 * dish switched off has to reach it faster than that — and anything the till
 * itself writes clears the entry outright rather than waiting the window out.
 *
 * Nothing per-staff and nothing per-order is cached here. A session, a shift
 * and a basket are answers to "who is asking, right now", and a stale answer to
 * that is a wrong screen rather than a slightly old one.
 *
 * Per process. Several instances mean several copies, each at most `ttlMs` out
 * of date, which is the same guarantee as one.
 */

interface Entry<T> {
  value: T;
  expires: number;
  /** The request already in flight, so ten callers at once make one query. */
  inFlight: Promise<T> | null;
}

const store = new Map<string, Entry<unknown>>();

export interface Memo<T> {
  (): Promise<T>;
  /** Drop it now. Called by whatever just changed the underlying rows. */
  invalidate: () => void;
}

export function memo<T>(key: string, ttlMs: number, loader: () => Promise<T>): Memo<T> {
  const read = async (): Promise<T> => {
    const entry = store.get(key) as Entry<T> | undefined;
    const now = Date.now();

    if (entry && entry.expires > now) return entry.value;
    /* A miss under load is the moment that hurts: fifty requests arrive, all
       miss, and all fifty query. Sharing the promise makes it one. */
    if (entry?.inFlight) return entry.inFlight;

    const pending = loader()
      .then((value) => {
        store.set(key, { value, expires: Date.now() + ttlMs, inFlight: null });
        return value;
      })
      .catch((err) => {
        store.delete(key);
        /* A failed load must not be remembered as an answer. Serving the last
           good value would be kinder to the screen and dishonest about the
           database being down. */
        throw err;
      });

    store.set(key, {
      value: entry?.value as T,
      // Keep the stale value only as something to overwrite, never to serve.
      expires: 0,
      inFlight: pending,
    });

    return pending;
  };

  const wrapped = read as Memo<T>;
  wrapped.invalidate = () => { store.delete(key); };
  return wrapped;
}

/** Clear several at once, by prefix. For a write that touches a whole area. */
export function invalidatePrefix(prefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * How long each kind of lookup is held.
 *
 * Set by how bad it is to be wrong for that long, not by how expensive the
 * query is. Availability is the tightest: a cashier switching the tea off and
 * watching it stay on the screen will switch it off again, and then twice more.
 */
export const TTL = {
  /** Prefixes, thresholds, the discount cap. Edited in admin, rarely. */
  settings: 30_000,
  /** Device labels and staff names, for putting a name to an order. */
  directory: 60_000,
  /** The menu the till sells, including what is switched off. */
  menu: 10_000,
  /** Yesterday's unclosed shifts. A day old already; ten more seconds is nothing. */
  stale: 30_000,
} as const;
