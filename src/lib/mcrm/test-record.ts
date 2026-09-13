const TEST_MARKER =
  /(^|[\s:_-])(live_test|mobile_test|p0_test|test)([\s:_-]|$)/i;

/**
 * Test fixtures stay in the database for traceability, but must not leak into
 * normal sales views or influence operational counts.
 */
export function isOperationalTestRecord(value: string | null | undefined) {
  const label = value?.trim() ?? '';
  return label.toLowerCase() === 'yyy' || TEST_MARKER.test(label);
}
