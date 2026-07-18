import type { Queryable } from "../db";

interface Rule {
  match: string;
  rows: unknown[];
}

/** Scriptable stand-in for a mysql2 Pool — no real MySQL server is available
 * in this environment (no Docker), so lib/ query functions are unit-tested
 * against this instead. Mirrors the same substring-matching approach used
 * for the Python scribe loader's tests (scribe/tests/fake_db.py). */
export class FakeQueryable implements Queryable {
  calls: { sql: string; params?: unknown[] }[] = [];

  constructor(private rules: Rule[]) {}

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<[T[], unknown]> {
    const normalized = sql.replace(/\s+/g, " ").trim();
    this.calls.push({ sql: normalized, params });
    const rule = this.rules.find((r) => normalized.toUpperCase().includes(r.match.toUpperCase()));
    return [(rule?.rows ?? []) as T[], undefined];
  }
}
