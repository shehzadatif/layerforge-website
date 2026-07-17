import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { generateApprovalToken } from "../../../lib/tracking";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();

    const name = String(
      formData.get("customer_name") ?? ""
    ).trim();

    const email = String(
      formData.get("email") ?? ""
    ).trim();

    const phone = String(
      formData.get("phone") ?? ""
    ).trim();

    const projectName = String(
      formData.get("product_name") ?? ""
    ).trim();

    const material = String(
      formData.get("material") ?? ""
    ).trim();

    const notes = String(
      formData.get("notes") ?? ""
    ).trim();

    const quantity = Math.max(
      1,
      Number(formData.get("quantity") ?? 1)
    );

    const unitPrice = Math.max(
      0,
      Number(formData.get("unit_price") ?? 0)
    );

    if (!name || !email || !projectName) {
      return new Response(
        "Customer name, email, and project name are required.",
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(unitPrice)
    ) {
      return new Response(
        "Quantity and unit price must be valid numbers.",
        { status: 400 }
      );
    }

    const quotedPrice = quantity * unitPrice;
    const approvalToken = generateApprovalToken();

    const { data: quote, error } = await supabaseAdmin
      .from("quotes")
      .insert({
        name,
        email,
        phone,

        service: "Custom Quote",
        project_name: projectName,
        description: notes,
        material,
        quantity,

        estimated_price: quotedPrice,
        quoted_price: quotedPrice,

        status: "Draft",
        internal_notes: notes,

        project_details: {
          unit_price: unitPrice,
        },

        approval_token: approvalToken,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return redirect(
      `/admin/quotes/${quote.id}`,
      303
    );
  } catch (error) {
    console.error("Unable to create quote:", error);

    return new Response(
      error instanceof Error
        ? error.message
        : "Unable to create quote.",
      { status: 500 }
    );
  }
};