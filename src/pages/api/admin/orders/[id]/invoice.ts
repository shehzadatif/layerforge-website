import type { APIRoute } from "astro";

import { generateInvoicePdf } from "../../../../../lib/invoicePdf";
import { getOrder } from "../../../../../lib/orders";

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const orderId = String(params.id ?? "").trim();

  if (!orderId) {
    return new Response("Order ID is required.", { status: 400 });
  }

  try {
    const order = await getOrder(orderId);

    if (order.payment_status !== "Paid") {
      return new Response("An invoice is available after payment.", {
        status: 409,
      });
    }

    const invoicePdf = await generateInvoicePdf(order);
    const orderNumber = `LF${String(order.order_number).padStart(6, "0")}`;
    const disposition =
      url.searchParams.get("download") === "1" ? "attachment" : "inline";

    return new Response(Buffer.from(invoicePdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `${disposition}; filename="Layer-Forge-Invoice-${orderNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Unable to generate admin invoice.", {
      orderId,
      error,
    });

    return new Response("Unable to generate invoice.", { status: 500 });
  }
};
