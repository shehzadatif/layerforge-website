import type { APIRoute } from "astro";

import {
  cleanupCloudSlicerJob,
  resolveCloudSlicerConfiguration,
} from "../../../../lib/cloudSlicer";
import { getCloudSlicerServerEnvironment } from "../../../../lib/cloudSlicerServer";
import { isSameOriginRequest } from "../../../../lib/isSameOriginRequest";
import { verifyThreeDSlicerJobToken } from "../../../../lib/threeDSlicerJobToken";

export const prerender = false;

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
    const uploadJob = await verifyThreeDSlicerJobToken(
      jobToken,
      signingSecret,
      "upload",
    );
    const job =
      uploadJob ??
      (await verifyThreeDSlicerJobToken(jobToken, signingSecret, "poll"));

    if (!job) {
      return Response.json({ success: true });
    }

    const configuration = resolveCloudSlicerConfiguration(
      environment,
      job.material,
    );

    if (configuration) {
      await cleanupCloudSlicerJob(
        configuration,
        job.fileId,
        job.stage === "poll" ? job.quoteId : undefined,
      );
    }
  } catch (error) {
    console.warn("Unable to cancel a Bambu Studio refinement.", { error });
  }

  return Response.json(
    { success: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
};
