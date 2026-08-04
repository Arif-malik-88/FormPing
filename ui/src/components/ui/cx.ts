/** Tiny classname joiner — drops falsy values, joins with spaces. No dependency.
 *  `cx('a', cond && 'b', undefined)` → 'a b'. Used across the component kit (FR-35). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
