export function buildReadableNumber(prefix: string, date: Date, sequence: number) {
  return `${prefix}-${formatCompactDate(date)}-${String(sequence).padStart(3, "0")}`;
}

export function buildClosingNumber(date: Date) {
  return `CLS-${formatCompactDate(date)}`;
}

export function formatCompactDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDayRange(value?: string) {
  const date = parseDateInput(value) ?? new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return { start, end, date: formatDateInput(start) };
}

function parseDateInput(value?: string) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
}
