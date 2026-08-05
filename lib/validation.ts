const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Not a security boundary by itself (every DB query is parameterized, so a
 * malformed id can never reach SQL as anything but a bind value) — this is
 * about returning a clean 404/400 for garbage input instead of letting a
 * Postgres "invalid input syntax for type uuid" error surface as a 500.
 */
export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}
