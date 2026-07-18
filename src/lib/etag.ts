import { createHash } from "node:crypto";

/** Weak-enough-for-our-purposes content hash, quoted per the ETag header spec. */
export function computeEtag(payload: unknown): string {
  const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return `"${hash.slice(0, 16)}"`;
}
