import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const name = String(formData.get("name") ?? "").trim();

    const markup_percent = Number(
      formData.get("markup_percent") ?? 0
    );

    const default_production_days = Number(
      formData.get("default_production_days") ?? 3
    );

    const description = String(
      formData.get("description") ?? ""
    );

    const active = formData.get("active") === "on";

    const { error } = await supabaseAdmin
      .from("materials")
      .insert({
        name,
        markup_percent,
        default_production_days,
        description,
        active,
      });

    if (error) {
      console.error(error);

      return new Response(error.message, {
        status: 500,
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin/materials",
      },
    });

  } catch (err) {
    console.error(err);

    return new Response("Server Error", {
      status: 500,
    });
  }
};