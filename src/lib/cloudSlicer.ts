import type {
  ThreeDPrintQuality,
  ThreeDPrintMaterial,
} from "./threeDQuoteEstimator";
import {
  THREE_D_QUOTE_MATERIALS,
  type ThreeDQuoteMaterial,
} from "./threeDQuotePricing";

export const CLOUD_SLICER_API_BASE_URL = "https://api.cloudslicer3d.com/v1";

const CLOUD_SLICER_REQUEST_TIMEOUT_MS = 10_000;
const LAYER_HEIGHT_MM: Record<ThreeDPrintQuality, number> = {
  draft: 0.28,
  standard: 0.2,
  fine: 0.12,
};

export interface CloudSlicerEnvironment {
  CLOUD_SLICER_API_TOKEN?: string;
  CLOUD_SLICER_JOB_SIGNING_SECRET?: string;
  CLOUD_SLICER_PRINTER_ID?: string;
  CLOUD_SLICER_FILAMENT_ID_PLA?: string;
  CLOUD_SLICER_FILAMENT_ID_PETG?: string;
  CLOUD_SLICER_FILAMENT_ID_ABS?: string;
  CLOUD_SLICER_FILAMENT_ID_TPU?: string;
}

export interface CloudSlicerConfiguration {
  apiToken: string;
  jobSigningSecret: string;
  printerId: string;
  filamentId: string;
}

export interface CloudSlicerQuoteOptions {
  material: ThreeDPrintMaterial;
  quality: ThreeDPrintQuality;
  infillPercent: number;
  quantity: number;
}

export interface CloudSlicerUploadSession {
  uploadId: string;
  fileId: string;
  uploadUrl: string;
}

export interface CloudSlicerQueuedQuote {
  quoteId: string;
}

export interface CloudSlicerQuoteStatus {
  status: "pending" | "success" | "failed";
  progress: number;
  errorMessage?: string;
  filamentWeightGrams?: number;
  estimatedTimeSeconds?: number;
}

export class CloudSlicerApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

function configuredValue(value: string | undefined): string {
  return value?.trim() ?? "";
}

function filamentIdForMaterial(
  environment: CloudSlicerEnvironment,
  material: ThreeDQuoteMaterial,
): string {
  return configuredValue(
    environment[
      `CLOUD_SLICER_FILAMENT_ID_${material}` as keyof CloudSlicerEnvironment
    ],
  );
}

export function getConfiguredCloudSlicerMaterials(
  environment: CloudSlicerEnvironment,
): ThreeDQuoteMaterial[] {
  const commonConfigurationPresent =
    configuredValue(environment.CLOUD_SLICER_API_TOKEN).length > 0 &&
    configuredValue(environment.CLOUD_SLICER_JOB_SIGNING_SECRET).length >= 32 &&
    configuredValue(environment.CLOUD_SLICER_PRINTER_ID).length > 0;

  if (!commonConfigurationPresent) {
    return [];
  }

  return THREE_D_QUOTE_MATERIALS.filter(
    (material) => filamentIdForMaterial(environment, material).length > 0,
  );
}

export function resolveCloudSlicerConfiguration(
  environment: CloudSlicerEnvironment,
  material: ThreeDQuoteMaterial,
): CloudSlicerConfiguration | null {
  if (!getConfiguredCloudSlicerMaterials(environment).includes(material)) {
    return null;
  }

  return {
    apiToken: configuredValue(environment.CLOUD_SLICER_API_TOKEN),
    jobSigningSecret: configuredValue(
      environment.CLOUD_SLICER_JOB_SIGNING_SECRET,
    ),
    printerId: configuredValue(environment.CLOUD_SLICER_PRINTER_ID),
    filamentId: filamentIdForMaterial(environment, material),
  };
}

export function isThreeDPrintMaterial(
  value: unknown,
): value is ThreeDPrintMaterial {
  return (
    typeof value === "string" &&
    THREE_D_QUOTE_MATERIALS.includes(value as ThreeDQuoteMaterial)
  );
}

export function isThreeDPrintQuality(
  value: unknown,
): value is ThreeDPrintQuality {
  return value === "draft" || value === "standard" || value === "fine";
}

export function buildCloudSlicerQuotePayload(
  configuration: CloudSlicerConfiguration,
  options: CloudSlicerQuoteOptions,
) {
  return {
    printer_id: configuration.printerId,
    filament_id: configuration.filamentId,
    slicer_model: "bambu_studio",
    print_settings: {
      name: `Layer Forge P1S 0.4 mm - ${options.quality}`,
      layers_and_perimeters: {
        layer_height: {
          layer_height: LAYER_HEIGHT_MM[options.quality],
          first_layer_height: 0.2,
          top_layers: 5,
          bottom_layers: 3,
          perimeters: 3,
        },
      },
      infill: {
        fill_density: `${options.infillPercent}%`,
        fill_pattern: "grid",
      },
      support_material: {
        enable: true,
        style: "grid",
        pattern: "rectilinear",
        threshold_angle: 40,
        buildplate_only: false,
      },
    },
  };
}

async function fetchCloudSlicerJson(
  path: string,
  configuration: CloudSlicerConfiguration,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    CLOUD_SLICER_REQUEST_TIMEOUT_MS,
  );

  try {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${configuration.apiToken}`);

    const response = await fetcher(`${CLOUD_SLICER_API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new CloudSlicerApiError(
        `Cloud Slicer request failed with HTTP ${response.status}.`,
        response.status,
      );
    }

    const value = (await response.json()) as unknown;

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new CloudSlicerApiError(
        "Cloud Slicer returned an invalid response.",
      );
    }

    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof CloudSlicerApiError) {
      throw error;
    }

    throw new CloudSlicerApiError(
      error instanceof Error && error.name === "AbortError"
        ? "Cloud Slicer request timed out."
        : "Cloud Slicer is unavailable.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function createCloudSlicerUploadSession(
  configuration: CloudSlicerConfiguration,
  fetcher: typeof fetch = fetch,
): Promise<CloudSlicerUploadSession> {
  const response = await fetchCloudSlicerJson(
    "/file/upload-id",
    configuration,
    {},
    fetcher,
  );
  const uploadId = String(response.upload_id ?? "").trim();
  const fileId = String(response.file_id ?? "").trim();

  if (!uploadId || !fileId) {
    throw new CloudSlicerApiError(
      "Cloud Slicer did not return an upload session.",
    );
  }

  return {
    uploadId,
    fileId,
    uploadUrl:
      `${CLOUD_SLICER_API_BASE_URL}/file/public/` +
      encodeURIComponent(uploadId),
  };
}

export async function queueCloudSlicerQuote(
  configuration: CloudSlicerConfiguration,
  fileId: string,
  options: CloudSlicerQuoteOptions,
  fetcher: typeof fetch = fetch,
): Promise<CloudSlicerQueuedQuote> {
  const response = await fetchCloudSlicerJson(
    `/quote/queue/${encodeURIComponent(fileId)}`,
    configuration,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildCloudSlicerQuotePayload(configuration, options),
      ),
    },
    fetcher,
  );
  const quoteId = String(response.quote_id ?? "").trim();

  if (!quoteId) {
    throw new CloudSlicerApiError("Cloud Slicer did not queue the slice.");
  }

  return { quoteId };
}

export async function getCloudSlicerQuoteStatus(
  configuration: CloudSlicerConfiguration,
  quoteId: string,
  fetcher: typeof fetch = fetch,
): Promise<CloudSlicerQuoteStatus> {
  const response = await fetchCloudSlicerJson(
    `/quote/${encodeURIComponent(quoteId)}`,
    configuration,
    {},
    fetcher,
  );
  const rawStatus = String(response.status ?? "").toLowerCase();

  if (!["pending", "success", "failed"].includes(rawStatus)) {
    throw new CloudSlicerApiError(
      "Cloud Slicer returned an unknown quote status.",
    );
  }

  const pricing =
    response.pricing && typeof response.pricing === "object"
      ? (response.pricing as Record<string, unknown>)
      : {};
  const time =
    response.time && typeof response.time === "object"
      ? (response.time as Record<string, unknown>)
      : {};
  const progress = Number(response.progress);
  const filamentWeightGrams = Number(pricing.filament_weight);
  const estimatedTimeSeconds = Number(time.estimated_time_seconds);

  return {
    status: rawStatus as CloudSlicerQuoteStatus["status"],
    progress: Number.isFinite(progress)
      ? Math.max(0, Math.min(100, Math.round(progress)))
      : 0,
    ...(typeof response.error_message === "string" &&
    response.error_message.trim()
      ? { errorMessage: response.error_message.trim() }
      : {}),
    ...(Number.isFinite(filamentWeightGrams) ? { filamentWeightGrams } : {}),
    ...(Number.isFinite(estimatedTimeSeconds) ? { estimatedTimeSeconds } : {}),
  };
}

async function deleteCloudSlicerResource(
  configuration: CloudSlicerConfiguration,
  path: string,
  fetcher: typeof fetch,
): Promise<void> {
  try {
    await fetchCloudSlicerJson(
      path,
      configuration,
      { method: "DELETE" },
      fetcher,
    );
  } catch (error) {
    if (!(error instanceof CloudSlicerApiError) || error.status !== 404) {
      throw error;
    }
  }
}

export async function cleanupCloudSlicerJob(
  configuration: CloudSlicerConfiguration,
  fileId: string,
  quoteId?: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  let cleanupError: unknown;

  if (quoteId) {
    try {
      await deleteCloudSlicerResource(
        configuration,
        `/quote/${encodeURIComponent(quoteId)}`,
        fetcher,
      );
    } catch (error) {
      cleanupError = error;
    }
  }

  try {
    await deleteCloudSlicerResource(
      configuration,
      `/file/${encodeURIComponent(fileId)}`,
      fetcher,
    );
  } catch (error) {
    cleanupError ??= error;
  }

  if (cleanupError) {
    throw cleanupError;
  }
}
