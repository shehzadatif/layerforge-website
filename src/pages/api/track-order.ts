import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../lib/isSameOriginRequest";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const prerender = false;

function parseOrderNumber(value: FormDataEntryValue | null): number | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/^LF/, "");

  if (!/^\d{1,12}$/.test(normalized)) {
    return null;
  }

  const orderNumber = Number(normalized);
  return Number.isSafeInteger(orderNumber) && orderNumber > 0
    ? orderNumber
    : null;
}

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isSameOriginRequest(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const orderNumber = parseOrderNumber(formData.get("order"));
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!orderNumber || !email || email.length > 254 || !email.includes("@")) {
    return redirect("/track?not-found=1", 303);
  }

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("email, tracking_token")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) {
    console.error("Unable to look up order tracking details.", {
      error: error.message,
    });
    return redirect("/track?not-found=1", 303);
  }

  const orderEmail = String(order?.email ?? "")
    .trim()
    .toLowerCase();
  const trackingToken = String(order?.tracking_token ?? "").trim();

  if (!trackingToken || orderEmail !== email) {
    return redirect("/track?not-found=1", 303);
  }

  return redirect(`/t/${encodeURIComponent(trackingToken)}`, 303);
};
