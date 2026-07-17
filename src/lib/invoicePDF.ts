import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

type InvoiceOrder = {
  order_number: number;
  customer_name: string;
  email: string;
  phone?: string;
  shipping_address?: string;
  unit?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  created_at: string;
  tracking_token?: string;
  order_items?: Array<{
    product_name: string;
    material?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
};

export async function generateInvoicePdf(
  order: InvoiceOrder
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  const page = pdf.addPage([612, 792]);

  const regular = await pdf.embedFont(
    StandardFonts.Helvetica
  );

  const bold = await pdf.embedFont(
    StandardFonts.HelveticaBold
  );

  const orderNumber =
    "LF" +
    String(order.order_number).padStart(6, "0");

  let y = 740;

  const drawText = (
    text: string,
    x: number,
    size = 11,
    font = regular
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0.06, 0.09, 0.16),
    });
  };

  page.drawText("Layer Forge", {
    x: 50,
    y,
    size: 24,
    font: bold,
  });

  page.drawText("PAID INVOICE", {
    x: 420,
    y,
    size: 16,
    font: bold,
  });

  y -= 32;

  drawText("layerforgecanada.com", 50, 10);
  drawText(`Invoice: ${orderNumber}`, 420, 10);

  y -= 22;

  drawText(
    `Date: ${new Date(order.created_at).toLocaleDateString("en-CA")}`,
    420,
    10
  );

  y -= 45;

  drawText("Bill To", 50, 14, bold);

  y -= 20;
  drawText(order.customer_name || "", 50);

  y -= 16;
  drawText(order.email || "", 50);

  if (order.phone) {
    y -= 16;
    drawText(order.phone, 50);
  }

  if (order.shipping_address) {
    y -= 16;
    drawText(order.shipping_address, 50);
  }

  if (order.unit) {
    y -= 16;
    drawText(`Unit ${order.unit}`, 50);
  }

  const cityLine = [
    order.city,
    order.province,
    order.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  if (cityLine) {
    y -= 16;
    drawText(cityLine, 50);
  }

  y -= 45;

  page.drawRectangle({
    x: 50,
    y: y - 5,
    width: 512,
    height: 24,
    color: rgb(0.94, 0.95, 0.97),
  });

  drawText("Item", 60, 10, bold);
  drawText("Qty", 330, 10, bold);
  drawText("Unit", 390, 10, bold);
  drawText("Total", 490, 10, bold);

  y -= 32;

  for (const item of order.order_items ?? []) {
    drawText(
      item.material
        ? `${item.product_name} (${item.material})`
        : item.product_name,
      60,
      10
    );

    drawText(
      String(item.quantity),
      330,
      10
    );

    drawText(
      `$${Number(item.unit_price).toFixed(2)}`,
      390,
      10
    );

    drawText(
      `$${Number(item.total_price).toFixed(2)}`,
      490,
      10
    );

    y -= 24;
  }

  y -= 20;

  drawText("Subtotal", 390, 11, bold);
  drawText(
    `$${Number(order.subtotal).toFixed(2)}`,
    490,
    11
  );

  y -= 20;

  drawText("Shipping", 390, 11, bold);
  drawText(
    `$${Number(order.shipping).toFixed(2)}`,
    490,
    11
  );

  y -= 20;

  drawText("Tax", 390, 11, bold);
  drawText(
    `$${Number(order.tax).toFixed(2)}`,
    490,
    11
  );

  y -= 25;

  drawText("Total Paid", 390, 14, bold);
  drawText(
    `$${Number(order.total).toFixed(2)} CAD`,
    480,
    14,
    bold
  );

  y -= 55;

  drawText(
    "Payment received. Thank you for choosing Layer Forge.",
    50,
    11,
    bold
  );

  if (order.tracking_token) {
    y -= 22;

    drawText(
      `Track your order: https://layerforgecanada.com/t/${order.tracking_token}`,
      50,
      9
    );
  }

  return pdf.save();
}