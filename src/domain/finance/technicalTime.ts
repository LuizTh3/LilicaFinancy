/** Millisecond read model, including the fractional precision of a server Timestamp.
 * Writers must preserve original SDK timestamps for immutable fields rather than
 * reconstructing them from this numeric view. Monetary values use money.ts.
 */
export const instanteTecnicoValido = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
