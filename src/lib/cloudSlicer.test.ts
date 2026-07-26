import { describe, expect, it, vi } from "vitest";

import {
  buildCloudSlicerQuotePayload,
  cleanupCloudSlicerJob,
  createCloudSlicerUploadSession,
  getConfiguredCloudSlicerMaterials,
  getCloudSlicerQuoteStatus,
  queueCloudSlicerQuote,
  resolveCloudSlicerConfiguration,
  type CloudSlicerConfiguration,
  type CloudSlicerEnvironment,
} from "./cloudSlicer";

const environment: CloudSlicerEnvironment = {
  CLOUD_SLICER_API_TOKEN: "api-token",
  CLOUD_SLICER_JOB_SIGNING_SECRET: "a-secure-signing-secret-with-32-characters",
  CLOUD_SLICER_PRINTER_ID: "p1s-printer",
  CLOUD_SLICER_FILAMENT_ID_PLA: "pla-filament",
  CLOUD_SLICER_FILAMENT_ID_PETG: "petg-filament",
};

const configuration: CloudSlicerConfiguration = {
  apiToken: "api-token",
  jobSigningSecret: "a-secure-signing-secret-with-32-characters",
  printerId: "p1s-printer",
  filamentId: "pla-filament",
};

describe("Cloud Slicer configuration", () => {
  it("enables only materials that have a configured filament profile", () => {
    expect(getConfiguredCloudSlicerMaterials(environment)).toEqual([
      "PLA",
      "PETG",
    ]);
    expect(resolveCloudSlicerConfiguration(environment, "PLA")).toEqual(
      configuration,
    );
    expect(resolveCloudSlicerConfiguration(environment, "TPU")).toBeNull();
  });

  it("requires a strong job signing secret", () => {
    expect(
      getConfiguredCloudSlicerMaterials({
        ...environment,
        CLOUD_SLICER_JOB_SIGNING_SECRET: "too-short",
      }),
    ).toEqual([]);
  });
});

describe("Cloud Slicer Bambu Studio payload", () => {
  it("uses P1S 0.4 mm quality settings and automatic supports", () => {
    expect(
      buildCloudSlicerQuotePayload(configuration, {
        material: "PLA",
        quality: "standard",
        infillPercent: 30,
        quantity: 2,
      }),
    ).toMatchObject({
      printer_id: "p1s-printer",
      filament_id: "pla-filament",
      slicer_model: "bambu_studio",
      print_settings: {
        layers_and_perimeters: {
          layer_height: {
            layer_height: 0.2,
            first_layer_height: 0.2,
          },
        },
        infill: {
          fill_density: "30%",
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
    });
  });
});

describe("Cloud Slicer API client", () => {
  it("creates an anonymous direct-upload session without exposing the token", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        upload_id: "upload-123",
        file_id: "file-123",
      }),
    );

    await expect(
      createCloudSlicerUploadSession(configuration, fetcher),
    ).resolves.toEqual({
      uploadId: "upload-123",
      fileId: "file-123",
      uploadUrl: "https://api.cloudslicer3d.com/v1/file/public/upload-123",
    });

    const [, init] = fetcher.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer api-token");
  });

  it("queues and reads a successful Bambu Studio slice", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          {
            quote_id: "quote-123",
            status: "pending",
            progress: 0,
          },
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({
          quote_id: "quote-123",
          status: "success",
          progress: 100,
          pricing: { filament_weight: 82.4 },
          time: { estimated_time_seconds: 7200 },
        }),
      );

    await expect(
      queueCloudSlicerQuote(
        configuration,
        "file-123",
        {
          material: "PLA",
          quality: "draft",
          infillPercent: 20,
          quantity: 1,
        },
        fetcher,
      ),
    ).resolves.toEqual({ quoteId: "quote-123" });

    await expect(
      getCloudSlicerQuoteStatus(configuration, "quote-123", fetcher),
    ).resolves.toEqual({
      status: "success",
      progress: 100,
      filamentWeightGrams: 82.4,
      estimatedTimeSeconds: 7200,
    });
  });

  it("deletes both the generated quote and uploaded model", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ status: "deleted" }),
    );

    await cleanupCloudSlicerJob(
      configuration,
      "file-123",
      "quote-123",
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "https://api.cloudslicer3d.com/v1/quote/quote-123",
      "https://api.cloudslicer3d.com/v1/file/file-123",
    ]);
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(fetcher.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });

  it("still deletes the model when quote-record cleanup fails", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ error: "unavailable" }, { status: 500 }),
      )
      .mockResolvedValueOnce(Response.json({ status: "deleted" }));

    await expect(
      cleanupCloudSlicerJob(configuration, "file-123", "quote-123", fetcher),
    ).rejects.toThrow("HTTP 500");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "https://api.cloudslicer3d.com/v1/file/file-123",
    );
  });
});
