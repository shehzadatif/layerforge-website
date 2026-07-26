import type { APIRoute } from "astro";

import {
  cloudSlicerQueueErrorMessage,
  resolveCloudSlicerConfiguration,
  synchronizeCloudSlicerP1sProfile,
} from "../../../lib/cloudSlicer";
import { getCloudSlicerServerEnvironment } from "../../../lib/cloudSlicerServer";
import { isSameOriginRequest } from "../../../lib/isSameOriginRequest";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isSameOriginRequest(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const configuration = resolveCloudSlicerConfiguration(
      getCloudSlicerServerEnvironment(),
      "PLA",
    );

    if (!configuration) {
      throw new Error("Cloud Slicer PLA pricing is not configured.");
    }

    await synchronizeCloudSlicerP1sProfile(configuration);
    return redirect("/admin/cost-estimator?slicer-synced=1", 303);
  } catch (error) {
    console.error("Unable to synchronize the Cloud Slicer P1S profile.", {
      error: error instanceof Error ? error.message : String(error),
    });

    const message =
      error instanceof Error
        ? cloudSlicerQueueErrorMessage(error)
        : "Unable to synchronize the Cloud Slicer P1S profile.";

    return new Response(message, { status: 400 });
  }
};
