import { describe, expect, it } from "vitest";

import {
  signThreeDSlicerJobToken,
  THREE_D_SLICER_JOB_TOKEN_TTL_SECONDS,
  verifyThreeDSlicerJobToken,
  type ThreeDSlicerUploadJobToken,
} from "./threeDSlicerJobToken";

const secret = "a-secure-signing-secret-with-32-characters";
const now = 2_000_000_000;

function uploadPayload(
  overrides: Partial<ThreeDSlicerUploadJobToken> = {},
): ThreeDSlicerUploadJobToken {
  return {
    version: 1,
    stage: "upload",
    fileId: "file-123",
    material: "PLA",
    quality: "standard",
    infillPercent: 20,
    quantity: 2,
    expiresAt: now + THREE_D_SLICER_JOB_TOKEN_TTL_SECONDS,
    ...overrides,
  };
}

describe("3D slicer job tokens", () => {
  it("round trips a signed upload job", async () => {
    const token = await signThreeDSlicerJobToken(uploadPayload(), secret);

    await expect(
      verifyThreeDSlicerJobToken(token, secret, "upload", now),
    ).resolves.toEqual(uploadPayload());
  });

  it("rejects tampering, expired tokens, and the wrong job stage", async () => {
    const token = await signThreeDSlicerJobToken(uploadPayload(), secret);
    const [payload, signature] = token.split(".");
    const tampered = `${payload?.slice(0, -1)}A.${signature}`;

    await expect(
      verifyThreeDSlicerJobToken(tampered, secret, "upload", now),
    ).resolves.toBeNull();
    await expect(
      verifyThreeDSlicerJobToken(
        await signThreeDSlicerJobToken(
          uploadPayload({ expiresAt: now - 1 }),
          secret,
        ),
        secret,
        "upload",
        now,
      ),
    ).resolves.toBeNull();
    await expect(
      verifyThreeDSlicerJobToken(token, secret, "poll", now),
    ).resolves.toBeNull();
  });
});
