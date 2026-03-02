export function toISO8601(date: Date): string {
  return date.toISOString();
}

export function parseISO8601(str: string): Date {
  return new Date(str);
}
