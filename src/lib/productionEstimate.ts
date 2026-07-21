import { formatPacificDate } from "./dateUtils";

type ProductionItem = {
  productionDays?: unknown;
  production_days?: unknown;
};

export function normalizeProductionDays(value: unknown): number {
  const days = Number(value ?? 0);

  if (!Number.isFinite(days) || days <= 0) {
    return 0;
  }

  return Math.min(365, Math.ceil(days));
}

export function getOrderProductionDays(
  items: ProductionItem[] | null | undefined,
): number {
  return Math.max(
    0,
    ...(items ?? []).map((item) =>
      normalizeProductionDays(item.productionDays ?? item.production_days),
    ),
  );
}

export function getEstimatedReadyDate(
  start: string | number | Date,
  productionDays: unknown,
): Date | null {
  const days = normalizeProductionDays(productionDays);

  if (!days) {
    return null;
  }

  const startDate = start instanceof Date ? start : new Date(start);

  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const pacificParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(startDate);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(pacificParts.find((part) => part.type === type)?.value);

  const target = new Date(
    Date.UTC(getPart("year"), getPart("month") - 1, getPart("day"), 12),
  );

  let added = 0;

  while (added < days) {
    target.setUTCDate(target.getUTCDate() + 1);

    const dayOfWeek = target.getUTCDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added += 1;
    }
  }

  return target;
}

export function formatProductionDuration(productionDays: unknown): string {
  const days = normalizeProductionDays(productionDays);
  return `${days} business ${days === 1 ? "day" : "days"}`;
}

export function formatEstimatedReadyDate(
  start: string | number | Date,
  productionDays: unknown,
): string | null {
  const date = getEstimatedReadyDate(start, productionDays);

  return date
    ? formatPacificDate(date, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
}
