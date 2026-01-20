export type DateInput = Date | string | null | undefined;

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateLocal(input: DateInput): Date | null {
  if (!input) return null;
  if (input instanceof Date) return new Date(input.getTime());

  const s = String(input).trim();
  if (!s) return null;

  const m = s.match(YMD_RE);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    return new Date(year, month - 1, day);
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatYmdLocal(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
