import type { APIRoute } from "astro";

import {
  cloudSlicerQueueErrorMessage,
  cleanupCloudSlicerJob,
  queueCloudSlicerQuote,
  resolveCloudSlicerConfiguration,
} from "../../../../lib/cloudSlicer";
import { getCloudSlicerServerEnvironment } from "../../../../lib/cloudSlicerServer";
import { isSameOriginRequest } from "../../../../lib/isSameOriginRequest";
import {
  signThreeDSlicerJobToken,
  THREE_D_SLICER_JOB_TOKEN_TTL_SECONDS,
  verifyThreeDSlicerJobToken,
} from "../../../../lib/threeDSlicerJobToken";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, error: "Invalid request origin." },
      { status: 403 },
    );
  }

  let fileId = "";
  let quoteId = "";
  let configuration:
    NonNullable<ReturnType<typeof resolveCloudSlicerConfiguration>> | undefined;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const jobToken = String(body.jobToken ?? "").trim();
    const uploadedFileId = String(body.fileId ?? "").trim();
    const environment = getCloudSlicerServerEnvironment();
    const signingSecret =
      environment.CLOUD_SLICER_JOB_SIGNING_SECRET?.trim() ?? "";
    const job = await verifyThreeDSlicerJobToken(
      jobToken,
      signingSecret,
      "upload",
    );

    if (!job) {
      return Response.json(
        { success: false, error: "The refinement job has expired." },
        { status: 403 },
      );
    }

    if (
      !uploadedFileId ||
      uploadedFileId.length > 128 ||
      !/^[A-Za-z0-9_-]+$/.test(uploadedFileId)
    ) {
      return Response.json(
        { success: false, error: "The uploaded slicer file ID is invalid." },
        { status: 400 },
      );
    }

    fileId = uploadedFileId;
    configuration =
      resolveCloudSlicerConfiguration(environment, job.material) ?? undefined;

    if (!configuration) {
      return Response.json(
        {
          success: false,
          error: "Bambu Studio refinement is not configured.",
        },
        { status: 503 },
      );
    }

    const queuedQuote = await queueCloudSlicerQuote(configuration, fileId, {
      material: job.material,
      quality: job.quality,
      infillPercent: job.infillPercent,
      quantity: job.quantity,
    });
    quoteId = queuedQuote.quoteId;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const pollToken = await signThreeDSlicerJobToken(
      {
        ...job,
        fileId,
        stage: "poll",
        quoteId,
        expiresAt: nowSeconds + THREE_D_SLICER_JOB_TOKEN_TTL_SECONDS,
      },
      configuration.jobSigningSecret,
    );

    return Response.json(
      {
        success: true,
        jobToken: pollToken,
      },
      {
        status: 202,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    if (configuration && fileId) {
      try {
        await cleanupCloudSlicerJob(
          configuration,
          fileId,
          quoteId || undefined,
        );
      } catch (cleanupError) {
        console.warn("Unable to clean up a failed slicer queue job.", {
          cleanupError,
        });
      }
    }

    console.error("Unable to queue Bambu Studio refinement.", { error });

    return Response.json(
      {
        success: false,
        error: cloudSlicerQueueErrorMessage(error),
      },
      { status: 502 },
    );
  }
};
