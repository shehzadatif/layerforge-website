import type { APIRoute } from "astro";
import { APPAREL_ARTWORK_BUCKET } from "../../lib/apparelDesigner";
import { isSameOriginRequest } from "../../lib/isSameOriginRequest";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const prerender = false;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

function safeBaseName(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base || "artwork";
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const side = String(formData.get("side") ?? "");

    if (!(file instanceof File) || file.size === 0) {
      return Response.json(
        { error: "Select an artwork file." },
        { status: 400 },
      );
    }
    if (side !== "front" && side !== "back") {
      return Response.json(
        { error: "Select a valid print side." },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { error: "Artwork must be a PNG, JPG, or WebP image." },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "Artwork must be 20 MB or smaller." },
        { status: 400 },
      );
    }

    const uploadId = crypto.randomUUID();
    const extension = ALLOWED_TYPES.get(file.type) as string;
    const path = `incoming/${uploadId}/${side}-${safeBaseName(file.name)}.${extension}`;
    const { error } = await supabaseAdmin.storage
      .from(APPAREL_ARTWORK_BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Unable to upload apparel artwork.", { error });
      return Response.json(
        { error: "Unable to upload artwork. Please try again." },
        { status: 500 },
      );
    }

    return Response.json({
      path,
      originalName: file.name,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Apparel artwork upload failed.", { error });
    return Response.json(
      { error: "Unable to upload artwork. Please try again." },
      { status: 500 },
    );
  }
};
