import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let materialId = "";

  try {
    const formData = await request.formData();

    materialId = String(
      formData.get("material_id") ?? "",
    ).trim();

    if (!materialId) {
      return new Response("Material ID is required.", {
        status: 400,
      });
    }

    const { count, error: usageError } =
      await supabaseAdmin
        .from("product_materials")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("material_id", materialId);

    if (usageError) {
      console.error(
        "Unable to check material usage.",
        {
          materialId,
          error: usageError,
        },
      );

      return new Response(
        "Unable to verify whether the material is in use.",
        {
          status: 500,
        },
      );
    }

    if ((count ?? 0) > 0) {
      return new Response(
        "This material is assigned to one or more products and cannot be deleted.",
        {
          status: 409,
        },
      );
    }

    const { error: deleteError } =
      await supabaseAdmin
        .from("materials")
        .delete()
        .eq("id", materialId);

    if (deleteError) {
      console.error("Unable to delete material.", {
        materialId,
        error: deleteError,
      });

      return new Response(deleteError.message, {
        status: 500,
      });
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: "/admin/materials",
      },
    });
  } catch (error) {
    console.error("Material deletion failed.", {
      materialId: materialId || undefined,
      error,
    });

    return new Response("Delete failed.", {
      status: 500,
    });
  }
};