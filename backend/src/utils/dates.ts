export function parseDate(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00');
  return d;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function eachDayInRange(start: string, end: string): string[] {
  const days: string[] = [];
  let current = parseDate(start);
  const endDate = parseDate(end);
  while (current <= endDate) {
    days.push(formatDate(current));
    current = addDays(current, 1);
  }
  return days;
}

export function isWeekday(dateStr: string): boolean {
  const day = parseDate(dateStr).getDay();
  return day !== 0 && day !== 6;
}

export function workingDaysInRange(start: string, end: string): number {
  return eachDayInRange(start, end).filter(isWeekday).length;
}

export function rangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 <= end2 && start2 <= end1;
}

export function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

export function getWeekKey(dateStr: string): string {
  const d = parseDate(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return formatDate(monday);
}

export function getNextMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}
