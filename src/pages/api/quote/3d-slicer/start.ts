import type { APIRoute } from "astro";

import {
  cleanupCloudSlicerJob,
  createCloudSlicerUploadSession,
  isThreeDPrintMaterial,
  isThreeDPrintQuality,
  resolveCloudSlicerConfiguration,
} from "../../../../lib/cloudSlicer";
import { getCloudSlicerServerEnvironment } from "../../../../lib/cloudSlicerServer";
import { isSameOriginRequest } from "../../../../lib/isSameOriginRequest";
import {
  signThreeDSlicerJobToken,
  THREE_D_SLICER_JOB_TOKEN_TTL_SECONDS,
} from "../../../../lib/threeDSlicerJobToken";
import {
  resolveTurnstileSecretKey,
  TURNSTILE_ESTIMATE_ACTION,
  verifyTurnstileToken,
} from "../../../../lib/turnstile";
import { getTurnstileServerEnvironment } from "../../../../lib/turnstileServer";

export const prerender = false;

const MAX_REQUEST_SIZE = 8 * 1024;

class SlicerStartError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
    return Response.json(
      { success: false, error: "The refinement request is too large." },
      { status: 413 },
    );
  }

  let uploadSession:
    Awaited<ReturnType<typeof createCloudSlicerUploadSession>> | undefined;
  let configuration:
    NonNullable<ReturnType<typeof resolveCloudSlicerConfiguration>> | undefined;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const material = body.material;
    const quality = body.quality;
    const infillPercent = Number(body.infillPercent);
    const quantity = Number(body.quantity);
    const turnstileToken = String(body.turnstileToken ?? "").trim();

    if (
      !isThreeDPrintMaterial(material) ||
      !isThreeDPrintQuality(quality) ||
      !Number.isInteger(infillPercent) ||
      infillPercent < 5 ||
      infillPercent > 100 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10_000
    ) {
      throw new SlicerStartError("Select valid print options.");
    }

    const environment = getCloudSlicerServerEnvironment();
    configuration =
      resolveCloudSlicerConfiguration(environment, material) ?? undefined;

    if (!configuration) {
      throw new SlicerStartError(
        "Bambu Studio refinement is not configured for this material.",
        503,
      );
    }

    const turnstileEnvironment = getTurnstileServerEnvironment();
    const turnstileSecret = resolveTurnstileSecretKey(
      turnstileEnvironment.secretKey,
      turnstileEnvironment.nodeEnvironment,
    );

    if (!turnstileSecret) {
      throw new SlicerStartError(
        "Bambu Studio refinement is temporarily unavailable.",
        503,
      );
    }

    const requestUrl = new URL(request.url);
    const verification = await verifyTurnstileToken({
      token: turnstileToken,
      secret: turnstileSecret,
      remoteIp: request.headers.get("CF-Connecting-IP") ?? undefined,
      expectedAction: TURNSTILE_ESTIMATE_ACTION,
      expectedHostname: requestUrl.hostname,
    });

    if (!verification.success) {
      throw new SlicerStartError(
        "Please complete the refinement security check and try again.",
        403,
      );
    }

    uploadSession = await createCloudSlicerUploadSession(configuration);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const jobToken = await signThreeDSlicerJobToken(
      {
        version: 1,
        stage: "upload",
        fileId: uploadSession.fileId,
        material,
        quality,
        infillPercent,
        quantity,
        expiresAt: nowSeconds + THREE_D_SLICER_JOB_TOKEN_TTL_SECONDS,
      },
      configuration.jobSigningSecret,
    );

    return Response.json(
      {
        success: true,
        uploadUrl: uploadSession.uploadUrl,
        jobToken,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    if (uploadSession && configuration) {
      try {
        await cleanupCloudSlicerJob(configuration, uploadSession.fileId);
      } catch (cleanupError) {
        console.warn("Unable to clean up unused slicer upload session.", {
          cleanupError,
        });
      }
    }

    if (error instanceof SlicerStartError) {
      return Response.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }

    console.error("Unable to start Bambu Studio refinement.", { error });

    return Response.json(
      {
        success: false,
        error: "Bambu Studio refinement is temporarily unavailable.",
      },
      { status: 502 },
    );
  }
};
