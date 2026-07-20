export const PACIFIC_TIME_ZONE = "America/Vancouver";

type DateInput = string | number | Date;

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PACIFIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDate(value: DateInput) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid date: ${String(value)}`);
  }

  return date;
}

function getPacificDateParts(value: DateInput) {
  const parts = dateKeyFormatter.formatToParts(toDate(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function getPacificDateKey(value: DateInput) {
  const { year, month, day } = getPacificDateParts(value);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatPacificDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
    timeZone: PACIFIC_TIME_ZONE,
  }).format(toDate(value));
}

export function formatPacificTime(value: DateInput) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(toDate(value));
}

export function formatPacificDateTime(value: DateInput) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(toDate(value));
}

export function getPacificDateInputValue(daysFromToday = 0) {
  const { year, month, day } = getPacificDateParts(new Date());
  const target = new Date(Date.UTC(year, month - 1, day + daysFromToday));
  return target.toISOString().slice(0, 10);
}

export function formatOrderDate(value: DateInput) {
  const orderDate = toDate(value);
  const now = new Date();
  const today = getPacificDateParts(now);
  const yesterday = new Date(
    Date.UTC(today.year, today.month - 1, today.day - 1),
  ).toISOString().slice(0, 10);
  const orderDateKey = getPacificDateKey(orderDate);

  if (orderDateKey === getPacificDateKey(now)) {
    return {
      label: "Today",
      color: "text-green-600",
      time: formatPacificTime(orderDate),
    };
  }

  if (orderDateKey === yesterday) {
    return {
      label: "Yesterday",
      color: "text-blue-600",
      time: formatPacificTime(orderDate),
    };
  }

  return {
    label: formatPacificDate(orderDate),
    color: "text-slate-500",
    time: formatPacificTime(orderDate),
  };
}
