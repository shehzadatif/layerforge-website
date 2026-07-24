import { PACIFIC_TIME_ZONE } from "./dateUtils";

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const DEFAULT_HOSTNAME = "layerforgecanada.com";
const REPORT_DAYS = 30;
const CACHE_DURATION_MS = 5 * 60 * 1000;

let cachedAnalytics:
  { report: WebsiteTrafficAnalytics; expiresAt: number } | undefined;

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
      pacificDateKey(new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)),
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

async function queryCloudflare<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  optional = false,
): Promise<T | null> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as GraphqlResponse<T>;
  const errorMessage = compactError(payload.errors);

  if (!response.ok || errorMessage || !payload.data) {
    if (optional) return null;
    throw new Error(
      errorMessage || `Cloudflare Analytics returned HTTP ${response.status}.`,
    );
  }

  return payload.data;
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
    warnings: [],
    totals: { ...emptyTotals },
    trend: [],
    topPages: [],
    referrers: [],
    countries: [],
  };
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
  const start = new Date(
    now.getTime() - (REPORT_DAYS + 1) * 24 * 60 * 60 * 1000,
  );
  const filter = {
    datetime_geq: start.toISOString(),
    datetime_leq: now.toISOString(),
    requestSource: "eyeball",
    clientRequestHTTPHost: hostname,
  };

  const coreQuery = `
    query WebsiteTraffic($zoneTag: string, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          hourly: httpRequestsAdaptiveGroups(
            limit: 1000
            orderBy: [datetimeHour_ASC]
            filter: $filter
          ) {
            count
            dimensions { datetimeHour }
            sum { visits }
          }
          countries: httpRequestsAdaptiveGroups(
            limit: 10
            orderBy: [sum_visits_DESC]
            filter: $filter
          ) {
            count
            dimensions { clientCountryName }
            sum { visits }
          }
        }
      }
    }
  `;

  type CoreData = {
    viewer?: {
      zones?: Array<{
        hourly?: HourlyGroup[];
        countries?: DimensionGroup[];
      }>;
    };
  };

  let core: CoreData | null;
  try {
    core = await queryCloudflare<CoreData>(token, coreQuery, {
      zoneTag,
      filter,
    });
  } catch (error) {
    console.error("Unable to load Cloudflare website analytics.", { error });
    return blankReport(
      true,
      hostname,
      "Cloudflare Analytics is configured, but traffic data could not be loaded.",
    );
  }

  const zone = core?.viewer?.zones?.[0];
  const hourly = zone?.hourly ?? [];
  const keys = dateKeys(REPORT_DAYS, now);
  const todayKey = keys.at(-1) ?? pacificDateKey(now);
  const sevenDayKeys = new Set(keys.slice(-7));
  const thirtyDayKeys = new Set(keys);
  const trendMap = new Map(
    keys.map((date) => [date, { pageViews: 0, visits: 0 }]),
  );

  let visitsToday = 0;
  let visits7Days = 0;
  let visits30Days = 0;

  for (const row of hourly) {
    const hour = row.dimensions?.datetimeHour;
    if (!hour) continue;
    const key = pacificDateKey(hour);
    const visits = row.sum?.visits ?? 0;

    if (key === todayKey) visitsToday += visits;
    if (sevenDayKeys.has(key)) visits7Days += visits;
    if (thirtyDayKeys.has(key)) visits30Days += visits;

    const day = trendMap.get(key);
    if (day) day.visits += visits;
  }

  const pageFilter = {
    ...filter,
    edgeResponseStatus_geq: 200,
    edgeResponseStatus_lt: 400,
    edgeResponseContentTypeName: "html",
  };
  const pageQuery = `
    query WebsitePageViews($zoneTag: string, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          hourly: httpRequestsAdaptiveGroups(
            limit: 1000
            orderBy: [datetimeHour_ASC]
            filter: $filter
          ) {
            count
            dimensions { datetimeHour }
          }
          topPages: httpRequestsAdaptiveGroups(
            limit: 10
            orderBy: [count_DESC]
            filter: $filter
          ) {
            count
            dimensions { clientRequestPath }
            sum { visits }
          }
        }
      }
    }
  `;
  type PageData = {
    viewer?: {
      zones?: Array<{
        hourly?: HourlyGroup[];
        topPages?: DimensionGroup[];
      }>;
    };
  };
  const pages = await queryCloudflare<PageData>(
    token,
    pageQuery,
    { zoneTag, filter: pageFilter },
    true,
  );
  const pageZone = pages?.viewer?.zones?.[0];
  let pageViews30Days: number | null = null;
  const warnings: string[] = [];

  if (pageZone) {
    pageViews30Days = 0;
    for (const row of pageZone.hourly ?? []) {
      const hour = row.dimensions?.datetimeHour;
      if (!hour) continue;
      const key = pacificDateKey(hour);
      if (!thirtyDayKeys.has(key)) continue;
      const pageViews = row.count ?? 0;
      pageViews30Days += pageViews;
      const day = trendMap.get(key);
      if (day) day.pageViews += pageViews;
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
            limit: 10
            orderBy: [sum_visits_DESC]
            filter: $filter
          ) {
            count
            dimensions { clientRefererHost }
            sum { visits }
          }
        }
      }
    }
  `;
  type ReferrerData = {
    viewer?: {
      zones?: Array<{ referrers?: DimensionGroup[] }>;
    };
  };
  const referrerData = await queryCloudflare<ReferrerData>(
    token,
    referrerQuery,
    { zoneTag, filter },
    true,
  );
  if (!referrerData) {
    warnings.push(
      "Referring websites are unavailable for the current Cloudflare analytics plan.",
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
    warnings,
    totals: {
      visitsToday,
      visits7Days,
      visits30Days,
      pageViews30Days,
    },
    trend: keys.map((date) => {
      const totals = trendMap.get(date) ?? { pageViews: 0, visits: 0 };
      return {
        date,
        label: formatDay.format(new Date(`${date}T12:00:00-07:00`)),
        ...totals,
      };
    }),
    topPages: (pageZone?.topPages ?? []).map((row) => ({
      label: row.dimensions?.clientRequestPath || "/",
      pageViews: row.count ?? 0,
      visits: row.sum?.visits ?? 0,
    })),
    referrers: (referrerData?.viewer?.zones?.[0]?.referrers ?? []).map(
      (row) => ({
        label: row.dimensions?.clientRefererHost || "Direct / unknown",
        visits: row.sum?.visits ?? 0,
      }),
    ),
    countries: (zone?.countries ?? []).map((row) => ({
      label: row.dimensions?.clientCountryName || "Unknown",
      visits: row.sum?.visits ?? 0,
    })),
  };

  cachedAnalytics = {
    report,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  };

  return report;
}
