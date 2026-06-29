export function shortAge(iso?: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${Math.max(1, min)}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}H`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}J`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}S`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}M`;
  return `${Math.floor(d / 365)}A`;
}
