/**
 * iCal (.ics) minimal parser for Edge Functions (Deno)
 *
 * Goal: extract VEVENT date ranges in a resilient way without external deps.
 * - Supports DTSTART/DTEND with VALUE=DATE or date-time
 * - Handles folded lines (RFC5545)
 */

export interface IcalEvent {
  uid: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (exclusive, like checkOut)
  summary?: string;
  description?: string;
  status?: string;
}

function unfoldLines(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const out: string[] = [];

  for (const line of lines) {
    if (!line) {
      out.push(line);
      continue;
    }

    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }

  return out;
}

function toIsoDateFromIcalValue(value: string): string | null {
  const v = value.trim();
  // Date-time: 20251224T130000Z or 20251224T130000
  // Date: 20251224
  const m = v.match(/(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseProp(line: string): { name: string; value: string } | null {
  const idx = line.indexOf(':');
  if (idx <= 0) return null;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const name = left.split(';')[0].trim().toUpperCase();
  return { name, value };
}

export function parseIcalEvents(ics: string): IcalEvent[] {
  const lines = unfoldLines(ics);
  const events: IcalEvent[] = [];

  let inEvent = false;
  let current: Partial<IcalEvent> = {};
  let dtStart: string | null = null;
  let dtEnd: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
      dtStart = null;
      dtEnd = null;
      continue;
    }

    if (line === 'END:VEVENT') {
      if (inEvent) {
        const startDate = dtStart;
        let endDate = dtEnd;

        if (startDate && !endDate) {
          // Some feeds omit DTEND; treat as 1-day (exclusive end)
          endDate = addDays(startDate, 1);
        }

        if (startDate && endDate) {
          const uid = (current.uid || '').trim() || `uid-${crypto.randomUUID()}`;
          events.push({
            uid,
            startDate,
            endDate,
            summary: current.summary,
            description: current.description,
            status: current.status,
          });
        }
      }

      inEvent = false;
      current = {};
      continue;
    }

    if (!inEvent) continue;

    const prop = parseProp(line);
    if (!prop) continue;

    if (prop.name === 'UID') {
      current.uid = prop.value.trim();
    } else if (prop.name === 'DTSTART') {
      dtStart = toIsoDateFromIcalValue(prop.value);
    } else if (prop.name === 'DTEND') {
      dtEnd = toIsoDateFromIcalValue(prop.value);
    } else if (prop.name === 'SUMMARY') {
      current.summary = prop.value;
    } else if (prop.name === 'DESCRIPTION') {
      current.description = prop.value;
    } else if (prop.name === 'STATUS') {
      current.status = prop.value.trim().toUpperCase();
    }
  }

  return events;
}

export function rangesOverlap(aStart: string, aEndExclusive: string, bStart: string, bEndExclusive: string): boolean {
  // overlap if aStart < bEnd && bStart < aEnd
  return aStart < bEndExclusive && bStart < aEndExclusive;
}

export function calcNights(startDate: string, endDateExclusive: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDateExclusive}T00:00:00.000Z`);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
