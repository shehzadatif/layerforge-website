import { PACIFIC_TIME_ZONE } from "./dateUtils";

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const DEFAULT_HOSTNAME = "layerforgecanada.com";
const REPORT_DAYS = 30;
const REPORT_LOOKBACK_DAYS = REPORT_DAYS + 1;
const DAY_SECONDS = 24 * 60 * 60;
const QUERY_LIMIT_BUFFER_SECONDS = 60;
const DEFAULT_MAX_DURATION_SECONDS = DAY_SECONDS;
const DEFAULT_NOT_OLDER_THAN_SECONDS = 7 * DAY_SECONDS;
const DEFAULT_MAX_PAGE_SIZE = 1000;
const CACHE_DURATION_MS = 5 * 60 * 1000;

let cachedAnalytics:
  | { report: WebsiteTrafficAnalytics; expiresAt: number }
  | undefined;

type HourlyGroup = {
  count?: number;
  dimensions?: { datetimeHour?: string };
  sum?: { visits?: number };
};

type DimensionGroup = {
  count?: number;
  dimensions?: {
    clientCountryName?: string;
    clientRefererHost?: string;
    clientRequestPath?: string;
  };
  sum?: { visits?: number };
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

type DatasetSettings = {
  enabled?: boolean;
  maxDuration?: number;
  maxPageSize?: number;
  notOlderThan?: number;
};

type DatasetLimits = {
  maxDuration: number;
  maxPageSize: number;
  notOlderThan: number;
};

type QueryWindow = {
  datetimeGeq: string;
  datetimeLt: string;
};

type QueryPlan = {
  breakdownLimit: number;
  historyLimited: boolean;
  hourlyLimit: number;
  periodDays: number;
  windows: QueryWindow[];
};

export type TrafficBreakdownItem = {
  label: string;
  pageViews?: number;
  visits?: number;
};

export type TrafficTrendItem = {
  date: string;
  label: string;
  pageViews: number;
  visits: number;
};

export type WebsiteTrafficAnalytics = {
  configured: boolean;
  available: boolean;
  hostname: string;
  generatedAt: string;
  message?: string;
  periodDays: number;
  warnings: string[];
  totals: {
    visitsToday: number;
    visits7Days: number;
    visits30Days: number;
    pageViews30Days: number | null;
  };
  trend: TrafficTrendItem[];
  topPages: TrafficBreakdownItem[];
  referrers: TrafficBreakdownItem[];
  countries: TrafficBreakdownItem[];
};

const emptyTotals = {
  visitsToday: 0,
  visits7Days: 0,
  visits30Days: 0,
  pageViews30Days: null,
};

function envValue(name: string) {
  const metaEnv = import.meta.env as Record<string, string | undefined>;
  return metaEnv[name]?.trim();
}

function getHostname() {
  const configured = envValue("CLOUDFLARE_ANALYTICS_HOSTNAME");
  if (configured) return configured.toLowerCase();

  const siteUrl = envValue("PUBLIC_SITE_URL");
  if (siteUrl) {
    try {
      return new URL(siteUrl).hostname.toLowerCase();
    } catch {
      // The dashboard will still work with the production hostname fallback.
    }
  }

  return DEFAULT_HOSTNAME;
}

function pacificDateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function dateKeys(days: number, now = new Date()) {
  const keys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    keys.push(
      pacificDateKey(new Date(now.getTime() - offset * DAY_SECONDS * 1000)),
    );
  }
  return keys;
}

function compactError(errors?: Array<{ message?: string }>) {
  return errors
    ?.map((error) => error.message)
    .filter(Boolean)
    .join(" ");
}

function positiveInteger(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0
    ? Math.floor(Number(value))
    : fallback;
}

function normalizeDatasetLimits(settings?: DatasetSettings): DatasetLimits {
  return {
    maxDuration: positiveInteger(
      settings?.maxDuration,
      DEFAULT_MAX_DURATION_SECONDS,
    ),
    maxPageSize: positiveInteger(
      settings?.maxPageSize,
      DEFAULT_MAX_PAGE_SIZE,
    ),
    notOlderThan: positiveInteger(
      settings?.notOlderThan,
      DEFAULT_NOT_OLDER_THAN_SECONDS,
    ),
  };
}

function createQueryWindows(
  start: Date,
  end: Date,
  maxDurationSeconds: number,
) {
  const windows: QueryWindow[] = [];
  const endTime = end.getTime();
  const maxDurationMs = Math.max(1000, maxDurationSeconds * 1000);
  let cursor = start.getTime();

  while (cursor < endTime) {
    const windowEnd = Math.min(cursor + maxDurationMs, endTime);
    windows.push({
      datetimeGeq: new Date(cursor).toISOString(),
      datetimeLt: new Date(windowEnd).toISOString(),
    });
    cursor = windowEnd;
  }

  return windows;
}

function createQueryPlan(now: Date, limits: DatasetLimits): QueryPlan {
  const requestedLookbackSeconds = REPORT_LOOKBACK_DAYS * DAY_SECONDS;
  const safeLookbackSeconds = Math.max(
    1,
    Math.min(
      requestedLookbackSeconds - QUERY_LIMIT_BUFFER_SECONDS,
      limits.notOlderThan - QUERY_LIMIT_BUFFER_SECONDS,
    ),
  );
  const hourlyLimit = Math.max(1, Math.min(1000, limits.maxPageSize));
  const breakdownLimit = Math.max(1, Math.min(100, limits.maxPageSize));
  const safeMaxDurationSeconds = Math.max(
    1,
    limits.maxDuration - QUERY_LIMIT_BUFFER_SECONDS,
  );
  const maxHourlyRowsSeconds = Math.max(60 * 60, hourlyLimit * 60 * 60);
  const maxWindowSeconds = Math.min(
    safeMaxDurationSeconds,
    maxHourlyRowsSeconds,
  );
  const start = new Date(now.getTime() - safeLookbackSeconds * 1000);
  const availableReportSeconds = Math.min(
    REPORT_DAYS * DAY_SECONDS,
    safeLookbackSeconds,
  );

  return {
    breakdownLimit,
    historyLimited: limits.notOlderThan < REPORT_DAYS * DAY_SECONDS,
    hourlyLimit,
    periodDays: Math.max(
      1,
      Math.min(REPORT_DAYS, Math.ceil(availableReportSeconds / DAY_SECONDS)),
    ),
    windows: createQueryWindows(start, now, maxWindowSeconds),
  };
}

function redactSecret(message: string, secret: string) {
  return secret ? message.split(secret).join("[redacted]") : message;
}

function getSafeCloudflareErrorMessage(
  error: unknown,
  secrets: string[] = [],
) {
  let message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown Cloudflare Analytics error.";

  for (const secret of secrets) {
    message = redactSecret(message, secret);
  }

  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1000);
}

function logCloudflareIssue(
  level: "error" | "warn",
  context: string,
  error: unknown,
  secrets: string[] = [],
) {
  const message = `${context}: ${getSafeCloudflareErrorMessage(error, secrets)}`;
  console[level](message);
  return message;
}

async function queryCloudflare<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  operation: string,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    throw new Error(
      `${operation}: ${getSafeCloudflareErrorMessage(error, [token])}`,
    );
  }

  let payload: GraphqlResponse<T>;
  try {
    payload = (await response.json()) as GraphqlResponse<T>;
  } catch {
    throw new Error(
      `${operation}: Cloudflare Analytics returned HTTP ${response.status} with an unreadable response.`,
    );
  }

  const errorMessage = compactError(payload.errors);

  if (!response.ok || errorMessage || !payload.data) {
    throw new Error(
      `${operation}: ${getSafeCloudflareErrorMessage(
        errorMessage ||
          `Cloudflare Analytics returned HTTP ${response.status}.`,
        [token],
      )}`,
    );
  }

  return payload.data;
}

async function loadDatasetLimits(token: string, zoneTag: string) {
  const fallback = normalizeDatasetLimits();
  const settingsQuery = `
    query WebsiteAnalyticsSettings($zoneTag: string) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          settings {
            httpRequestsAdaptiveGroups {
              enabled
              maxDuration
              maxPageSize
              notOlderThan
            }
          }
        }
      }
    }
  `;
  type SettingsData = {
    viewer?: {
      zones?: Array<{
        settings?: { httpRequestsAdaptiveGroups?: DatasetSettings };
      }>;
    };
  };

  let data: SettingsData;
  try {
    data = await queryCloudflare<SettingsData>(
      token,
      settingsQuery,
      { zoneTag },
      "Cloudflare analytics settings",
    );
  } catch (error) {
    logCloudflareIssue(
      "warn",
      "Unable to load Cloudflare analytics dataset settings; using conservative limits",
      error,
      [token],
    );
    return {
      limits: fallback,
      warning:
        "Cloudflare dataset limits could not be discovered, so the dashboard used a conservative analytics window.",
    };
  }

  const zone = data.viewer?.zones?.[0];
  if (!zone) {
    throw new Error(
      "Cloudflare analytics settings returned no zone for the configured zone ID.",
    );
  }

  const settings = zone.settings?.httpRequestsAdaptiveGroups;
  if (!settings) {
    logCloudflareIssue(
      "warn",
      "Cloudflare analytics dataset settings were incomplete; using conservative limits",
      "The httpRequestsAdaptiveGroups settings node was missing.",
    );
    return {
      limits: fallback,
      warning:
        "Cloudflare dataset limits were incomplete, so the dashboard used a conservative analytics window.",
    };
  }

  if (settings.enabled === false) {
    throw new Error(
      "Cloudflare httpRequestsAdaptiveGroups analytics are not enabled for this zone.",
    );
  }

  return { limits: normalizeDatasetLimits(settings) };
}

function blankReport(
  configured: boolean,
  hostname: string,
  message?: string,
): WebsiteTrafficAnalytics {
  return {
    configured,
    available: false,
    hostname,
    generatedAt: new Date().toISOString(),
    message,
    periodDays: REPORT_DAYS,
    warnings: [],
    totals: { ...emptyTotals },
    trend: [],
    topPages: [],
    referrers: [],
    countries: [],
  };
}

function windowFilter(window: QueryWindow, hostname: string) {
  return {
    datetime_geq: window.datetimeGeq,
    datetime_lt: window.datetimeLt,
    requestSource: "eyeball",
    clientRequestHTTPHost: hostname,
  };
}

function increment(map: Map<string, number>, label: string, amount: number) {
  map.set(label, (map.get(label) ?? 0) + amount);
}

function topItems(map: Map<string, number>, value: "pageViews" | "visits") {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([label, total]) => ({ label, [value]: total }));
}

async function loadOptionalWindows<TData, TValue>({
  token,
  query,
  operation,
  variables,
  windows,
  extract,
}: {
  token: string;
  query: string;
  operation: string;
  variables: (window: QueryWindow) => Record<string, unknown>;
  windows: QueryWindow[];
  extract: (data: TData) => TValue;
}): Promise<TValue[] | null> {
  const results = await Promise.all(
    windows.map(async (window, index) => {
      try {
        const data = await queryCloudflare<TData>(
          token,
          query,
          variables(window),
          `${operation} window ${index + 1} of ${windows.length}`,
        );
        return { value: extract(data) };
      } catch (error) {
        return { error };
      }
    }),
  );
  const failure = results.find((result) => "error" in result);

  if (failure && "error" in failure) {
    logCloudflareIssue("warn", `Unable to load ${operation}`, failure.error, [
      token,
    ]);
    return null;
  }

  return results.map((result) => result.value as TValue);
}

export async function getWebsiteTrafficAnalytics(): Promise<WebsiteTrafficAnalytics> {
  if (cachedAnalytics && cachedAnalytics.expiresAt > Date.now()) {
    return cachedAnalytics.report;
  }

  const token = envValue("CLOUDFLARE_ANALYTICS_API_TOKEN");
  const zoneTag = envValue("CLOUDFLARE_ZONE_ID");
  const hostname = getHostname();

  if (!token || !zoneTag) {
    return blankReport(
      false,
      hostname,
      "Add the Cloudflare Analytics API token and zone ID to display website traffic.",
    );
  }

  const now = new Date();
  let limitsResult: Awaited<ReturnType<typeof loadDatasetLimits>>;

  try {
    limitsResult = await loadDatasetLimits(token, zoneTag);
  } catch (error) {
    logCloudflareIssue(
      "error",
      "Unable to load Cloudflare website analytics",
      error,
      [token],
    );
    return blankReport(
      true,
      hostname,
      "Cloudflare Analytics is configured, but traffic data could not be loaded.",
    );
  }

  const plan = createQueryPlan(now, limitsResult.limits);
  const coreQuery = `
    query WebsiteTraffic($zoneTag: string, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          hourly: httpRequestsAdaptiveGroups(
            limit: ${plan.hourlyLimit}
            orderBy: [datetimeHour_ASC]
            filter: $filter
          ) {
            dimensions { datetimeHour }
            sum { visits }
          }
        }
      }
    }
  `;
  type CoreData = {
    viewer?: { zones?: Array<{ hourly?: HourlyGroup[] }> };
  };

  let hourly: HourlyGroup[] = [];
  try {
    const chunks = await Promise.all(
      plan.windows.map((window, index) =>
        queryCloudflare<CoreData>(
          token,
          coreQuery,
          { zoneTag, filter: windowFilter(window, hostname) },
          `Website traffic window ${index + 1} of ${plan.windows.length}`,
        ),
      ),
    );

    hourly = chunks.flatMap((chunk) => {
      const zone = chunk.viewer?.zones?.[0];
      if (!zone) {
        throw new Error(
          "Cloudflare returned no analytics zone for the configured zone ID.",
        );
      }
      return zone.hourly ?? [];
    });
  } catch (error) {
    logCloudflareIssue(
      "error",
      "Unable to load Cloudflare website analytics",
      error,
      [token],
    );
    return blankReport(
      true,
      hostname,
      "Cloudflare Analytics is configured, but traffic data could not be loaded.",
    );
  }

  const keys = dateKeys(plan.periodDays, now);
  const todayKey = keys.at(-1) ?? pacificDateKey(now);
  const sevenDayKeys = new Set(keys.slice(-7));
  const periodKeys = new Set(keys);
  const trendMap = new Map(
    keys.map((date) => [date, { pageViews: 0, visits: 0 }]),
  );

  let visitsToday = 0;
  let visits7Days = 0;
  let visitsPeriod = 0;

  for (const row of hourly) {
    const hour = row.dimensions?.datetimeHour;
    if (!hour) continue;
    const key = pacificDateKey(hour);
    const visits = row.sum?.visits ?? 0;

    if (key === todayKey) visitsToday += visits;
    if (sevenDayKeys.has(key)) visits7Days += visits;
    if (periodKeys.has(key)) visitsPeriod += visits;

    const day = trendMap.get(key);
    if (day) day.visits += visits;
  }

  const warnings: string[] = [];
  if (limitsResult.warning) warnings.push(limitsResult.warning);
  if (plan.historyLimited) {
    warnings.push(
      `Cloudflare provides ${plan.periodDays} days of analytics history for this zone, so totals and breakdowns use the available period.`,
    );
  }

  const pageQuery = `
    query WebsitePageViews($zoneTag: string, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          hourly: httpRequestsAdaptiveGroups(
            limit: ${plan.hourlyLimit}
            orderBy: [datetimeHour_ASC]
            filter: $filter
          ) {
            count
            dimensions { datetimeHour }
          }
          topPages: httpRequestsAdaptiveGroups(
            limit: ${plan.breakdownLimit}
            orderBy: [count_DESC]
            filter: $filter
          ) {
            count
            dimensions { clientRequestPath }
          }
        }
      }
    }
  `;
  type PageZone = { hourly?: HourlyGroup[]; topPages?: DimensionGroup[] };
  type PageData = { viewer?: { zones?: PageZone[] } };
  const pageZones = await loadOptionalWindows<PageData, PageZone>({
    token,
    query: pageQuery,
    operation: "Cloudflare page analytics",
    variables: (window) => ({
      zoneTag,
      filter: {
        ...windowFilter(window, hostname),
        edgeResponseStatus_geq: 200,
        edgeResponseStatus_lt: 400,
        edgeResponseContentTypeName: "html",
      },
    }),
    windows: plan.windows,
    extract: (data) => {
      const zone = data.viewer?.zones?.[0];
      if (!zone) throw new Error("Cloudflare returned no page analytics zone.");
      return zone;
    },
  });

  let pageViewsPeriod: number | null = null;
  const topPageTotals = new Map<string, number>();

  if (pageZones) {
    pageViewsPeriod = 0;
    for (const zone of pageZones) {
      for (const row of zone.hourly ?? []) {
        const hour = row.dimensions?.datetimeHour;
        if (!hour) continue;
        const key = pacificDateKey(hour);
        if (!periodKeys.has(key)) continue;
        const pageViews = row.count ?? 0;
        pageViewsPeriod += pageViews;
        const day = trendMap.get(key);
        if (day) day.pageViews += pageViews;
      }

      for (const row of zone.topPages ?? []) {
        increment(
          topPageTotals,
          row.dimensions?.clientRequestPath || "/",
          row.count ?? 0,
        );
      }
    }
  } else {
    warnings.push(
      "Page-view and top-page details are unavailable for the current Cloudflare analytics plan.",
    );
  }

  const referrerQuery = `
    query WebsiteReferrers($zoneTag: string, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          referrers: httpRequestsAdaptiveGroups(
            limit: ${plan.breakdownLimit}
            orderBy: [sum_visits_DESC]
            filter: $filter
          ) {
            dimensions { clientRefererHost }
            sum { visits }
          }
        }
      }
    }
  `;
  type ReferrerZone = { referrers?: DimensionGroup[] };
  type ReferrerData = { viewer?: { zones?: ReferrerZone[] } };
  const referrerZones = await loadOptionalWindows<ReferrerData, ReferrerZone>({
    token,
    query: referrerQuery,
    operation: "Cloudflare referrer analytics",
    variables: (window) => ({
      zoneTag,
      filter: windowFilter(window, hostname),
    }),
    windows: plan.windows,
    extract: (data) => {
      const zone = data.viewer?.zones?.[0];
      if (!zone) throw new Error("Cloudflare returned no referrer analytics zone.");
      return zone;
    },
  });
  const referrerTotals = new Map<string, number>();

  if (referrerZones) {
    for (const zone of referrerZones) {
      for (const row of zone.referrers ?? []) {
        increment(
          referrerTotals,
          row.dimensions?.clientRefererHost || "Direct / unknown",
          row.sum?.visits ?? 0,
        );
      }
    }
  } else {
    warnings.push(
      "Referring websites are unavailable for the current Cloudflare analytics plan.",
    );
  }

  const countryQuery = `
    query WebsiteCountries($zoneTag: string, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          countries: httpRequestsAdaptiveGroups(
            limit: ${plan.breakdownLimit}
            orderBy: [sum_visits_DESC]
            filter: $filter
          ) {
            dimensions { clientCountryName }
            sum { visits }
          }
        }
      }
    }
  `;
  type CountryZone = { countries?: DimensionGroup[] };
  type CountryData = { viewer?: { zones?: CountryZone[] } };
  const countryZones = await loadOptionalWindows<CountryData, CountryZone>({
    token,
    query: countryQuery,
    operation: "Cloudflare country analytics",
    variables: (window) => ({
      zoneTag,
      filter: windowFilter(window, hostname),
    }),
    windows: plan.windows,
    extract: (data) => {
      const zone = data.viewer?.zones?.[0];
      if (!zone) throw new Error("Cloudflare returned no country analytics zone.");
      return zone;
    },
  });
  const countryTotals = new Map<string, number>();

  if (countryZones) {
    for (const zone of countryZones) {
      for (const row of zone.countries ?? []) {
        increment(
          countryTotals,
          row.dimensions?.clientCountryName || "Unknown",
          row.sum?.visits ?? 0,
        );
      }
    }
  } else {
    warnings.push(
      "Visitor-country details are unavailable for the current Cloudflare analytics plan.",
    );
  }

  const formatDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_TIME_ZONE,
    month: "short",
    day: "numeric",
  });

  const report: WebsiteTrafficAnalytics = {
    configured: true,
    available: true,
    hostname,
    generatedAt: now.toISOString(),
    periodDays: plan.periodDays,
    warnings,
    totals: {
      visitsToday,
      visits7Days,
      visits30Days: visitsPeriod,
      pageViews30Days: pageViewsPeriod,
    },
    trend: keys.map((date) => {
      const totals = trendMap.get(date) ?? { pageViews: 0, visits: 0 };
      return {
        date,
        label: formatDay.format(new Date(`${date}T12:00:00-07:00`)),
        ...totals,
      };
    }),
    topPages: topItems(topPageTotals, "pageViews"),
    referrers: topItems(referrerTotals, "visits"),
    countries: topItems(countryTotals, "visits"),
  };

  cachedAnalytics = {
    report,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  };

  return report;
}

export const cloudflareAnalyticsTestUtils = {
  createQueryPlan,
  getSafeCloudflareErrorMessage,
  logCloudflareIssue,
};
