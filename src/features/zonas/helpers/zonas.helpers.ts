export function formatZonaDateParam(value: Date | null) {
  return value ? value.toISOString() : "";
}
