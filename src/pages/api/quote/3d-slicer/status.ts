import type { APIRoute } from "astro";

import {
  cleanupCloudSlicerJob,
  getCloudSlicerQuoteStatus,
  resolveCloudSlicerConfiguration,
} from "../../../../lib/cloudSlicer";
import { getCloudSlicerServerEnvironment } from "../../../../lib/cloudSlicerServer";
import { isSameOriginRequest } from "../../../../lib/isSameOriginRequest";
import { priceThreeDPrintQuoteFromSlicer } from "../../../../lib/threeDQuoteEstimator";
import { loadThreeDQuotePublicPricing } from "../../../../lib/threeDQuotePricingServer";
import { verifyThreeDSlicerJobToken } from "../../../../lib/threeDSlicerJobToken";

export const prerender = false;

async function cleanUpCompletedJob(
  configuration: NonNullable<
    ReturnType<typeof resolveCloudSlicerConfiguration>
  >,
  fileId: string,
  quoteId: string,
): Promise<boolean> {
  try {
    await cleanupCloudSlicerJob(configuration, fileId, quoteId);
    return true;
  } catch (error) {
    console.warn("Unable to clean up a completed slicer job.", { error });
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, error: "Invalid request origin." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const jobToken = String(body.jobToken ?? "").trim();
    const environment = getCloudSlicerServerEnvironment();
    const signingSecret =
      environment.CLOUD_SLICER_JOB_SIGNING_SECRET?.trim() ?? "";
    const job = await verifyThreeDSlicerJobToken(
      jobToken,
      signingSecret,
      "poll",
    );

    if (!job) {
      return Response.json(
        { success: false, error: "The refinement job has expired." },
        { status: 403 },
      );
    }

    const configuration = resolveCloudSlicerConfiguration(
      environment,
      job.material,
    );

    if (!configuration) {
      return Response.json(
        {
          success: false,
          error: "Bambu Studio refinement is not configured.",
        },
        { status: 503 },
      );
    }

    const slicerStatus = await getCloudSlicerQuoteStatus(
      configuration,
      job.quoteId,
    );

    if (slicerStatus.status === "pending") {
      return Response.json(
        {
          success: true,
          status: "pending",
          progress: slicerStatus.progress,
        },
        {
          status: 202,
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    if (slicerStatus.status === "failed") {
      await cleanUpCompletedJob(configuration, job.fileId, job.quoteId);

      return Response.json(
        {
          success: false,
          error:
            "Bambu Studio could not slice this model. The instant estimate is still available.",
        },
        { status: 422 },
      );
    }

    const materialGramsPerUnit = slicerStatus.filamentWeightGrams;
    const estimatedTimeSeconds = slicerStatus.estimatedTimeSeconds;

    if (
      !Number.isFinite(materialGramsPerUnit) ||
      Number(materialGramsPerUnit) <= 0 ||
      !Number.isFinite(estimatedTimeSeconds) ||
      Number(estimatedTimeSeconds) <= 0
    ) {
      await cleanUpCompletedJob(configuration, job.fileId, job.quoteId);
      throw new Error("The completed slice did not include usable metrics.");
    }

    const pricing = await loadThreeDQuotePublicPricing();
    const estimate = priceThreeDPrintQuoteFromSlicer({
      material: job.material,
      quality: job.quality,
      infillPercent: job.infillPercent,
      quantity: job.quantity,
      materialGramsPerUnit: Number(materialGramsPerUnit),
      printHoursPerUnit: Number(estimatedTimeSeconds) / 3600,
      pricing,
    });

    const cleanupComplete = await cleanUpCompletedJob(
      configuration,
      job.fileId,
      job.quoteId,
    );

    if (!estimate) {
      throw new Error("The completed slice could not be priced.");
    }

    return Response.json(
      {
        success: true,
        status: "success",
        estimate,
        cleanupComplete,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    console.error("Unable to read Bambu Studio refinement.", { error });

    return Response.json(
      {
        success: false,
        error:
          "Bambu Studio refinement is temporarily unavailable. The instant estimate is still available.",
      },
      { status: 502 },
    );
  }
};
