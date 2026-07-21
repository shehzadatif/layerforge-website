import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { formatPacificDate } from "./dateUtils";
import {
  formatEstimatedReadyDate,
  getOrderProductionDays,
} from "./productionEstimate";

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
  delivery_method?: string;
  order_items?: Array<{
    product_name: string;
    material?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    production_days?: number;
  }>;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT_MARGIN = 50;
const RIGHT_MARGIN = 50;

function getSiteUrl(): string {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  if (!siteUrl) {
    throw new Error("PUBLIC_SITE_URL environment variable is required.");
  }

  return siteUrl;
}

async function embedLogo(pdf: PDFDocument, siteUrl: string) {
  try {
    const logoUrl = `${siteUrl}/images/pdf/logo.png`;

    const response = await fetch(logoUrl);

    if (!response.ok) {
      throw new Error(`Logo request returned ${response.status}.`);
    }

    const logoBytes = await response.arrayBuffer();

    return await pdf.embedPng(logoBytes);
  } catch (error) {
    console.error("Unable to load the invoice logo.", {
      error,
    });

    return null;
  }
}

function formatCurrency(value: number): string {
  return `$${Number(value).toFixed(2)}`;
}

function truncateText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }

  let truncated = text;

  while (
    truncated.length > 0 &&
    font.widthOfTextAtSize(`${truncated}…`, size) > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }

  return `${truncated}…`;
}

export async function generateInvoicePdf(
  order: InvoiceOrder,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const siteUrl = getSiteUrl();
  const logo = await embedLogo(pdf, siteUrl);

  const orderNumber = `LF${String(order.order_number).padStart(6, "0")}`;

  let y = 742;

  const drawText = (
    text: string,
    x: number,
    size = 11,
    font: PDFFont = regular,
    targetPage: PDFPage = page,
  ) => {
    targetPage.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0.06, 0.09, 0.16),
    });
  };

  /*
   * Header and logo
   */
  if (logo) {
    const logoWidth = 150;
    const logoHeight = logo.height * (logoWidth / logo.width);

    page.drawImage(logo, {
      x: LEFT_MARGIN,
      y: y - logoHeight + 15,
      width: logoWidth,
      height: logoHeight,
    });
  } else {
    page.drawText("Layer Forge", {
      x: LEFT_MARGIN,
      y,
      size: 24,
      font: bold,
      color: rgb(0.06, 0.09, 0.16),
    });
  }

  page.drawText("PAID INVOICE", {
    x: 420,
    y,
    size: 16,
    font: bold,
    color: rgb(0.06, 0.09, 0.16),
  });

  y -= 34;

  drawText(`Invoice: ${orderNumber}`, 420, 10);

  y -= 22;

  drawText(`Date: ${formatPacificDate(order.created_at)}`, 420, 10);

  y -= 48;

  /*
   * Billing address
   */
  drawText("Bill To", LEFT_MARGIN, 14, bold);

  y -= 20;
  drawText(order.customer_name || "", LEFT_MARGIN);

  y -= 16;
  drawText(order.email || "", LEFT_MARGIN);

  if (order.phone) {
    y -= 16;
    drawText(order.phone, LEFT_MARGIN);
  }

  if (order.shipping_address) {
    y -= 16;
    drawText(order.shipping_address, LEFT_MARGIN);
  }

  if (order.unit) {
    y -= 16;
    drawText(`Unit ${order.unit}`, LEFT_MARGIN);
  }

  const cityLine = [order.city, order.province, order.postal_code]
    .filter(Boolean)
    .join(", ");

  if (cityLine) {
    y -= 16;
    drawText(cityLine, LEFT_MARGIN);
  }

  y -= 45;

  /*
   * Order items table
   */
  page.drawRectangle({
    x: LEFT_MARGIN,
    y: y - 5,
    width: PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN,
    height: 24,
    color: rgb(0.94, 0.95, 0.97),
  });

  drawText("Item", 60, 10, bold);
  drawText("Qty", 330, 10, bold);
  drawText("Unit", 390, 10, bold);
  drawText("Total", 490, 10, bold);

  y -= 32;

  for (const item of order.order_items ?? []) {
    const itemName = item.material
      ? `${item.product_name} (${item.material})`
      : item.product_name;

    drawText(truncateText(itemName, regular, 10, 250), 60, 10);

    drawText(String(item.quantity), 330, 10);

    drawText(formatCurrency(item.unit_price), 390, 10);

    drawText(formatCurrency(item.total_price), 490, 10);

    y -= 24;
  }

  y -= 20;

  /*
   * Totals
   */
  drawText("Subtotal", 390, 11, bold);
  drawText(formatCurrency(order.subtotal), 490, 11);

  y -= 20;

  drawText("Shipping", 390, 11, bold);
  drawText(formatCurrency(order.shipping), 490, 11);

  y -= 20;

  drawText("Tax", 390, 11, bold);
  drawText(formatCurrency(order.tax), 490, 11);

  y -= 25;

  page.drawLine({
    start: {
      x: 390,
      y: y + 15,
    },
    end: {
      x: 562,
      y: y + 15,
    },
    thickness: 1,
    color: rgb(0.82, 0.84, 0.88),
  });

  drawText("Total Paid", 390, 14, bold);
  drawText(`${formatCurrency(order.total)} CAD`, 480, 14, bold);

  y -= 55;

  /*
   * Footer
   */
  drawText(
    "Payment received. Thank you for choosing Layer Forge.",
    LEFT_MARGIN,
    11,
    bold,
  );

  y -= 22;

  drawText(
    "Taxes and shipping charges, where applicable, were calculated during secure checkout.",
    LEFT_MARGIN,
    9,
  );

  const productionDays = getOrderProductionDays(order.order_items);
  const estimatedReadyDate = formatEstimatedReadyDate(
    order.created_at,
    productionDays,
  );

  if (estimatedReadyDate) {
    y -= 22;

    drawText(
      `${String(order.delivery_method).toLowerCase() === "pickup" ? "Estimated ready for pickup" : "Estimated ready to ship"}: ${estimatedReadyDate}`,
      LEFT_MARGIN,
      9,
      bold,
    );
  }

  if (order.tracking_token) {
    y -= 22;

    const trackingUrl = `${siteUrl}/t/${encodeURIComponent(
      order.tracking_token,
    )}`;

    drawText(`Track your order: ${trackingUrl}`, LEFT_MARGIN, 9);
  }

  y -= 32;

  page.drawLine({
    start: {
      x: LEFT_MARGIN,
      y,
    },
    end: {
      x: PAGE_WIDTH - RIGHT_MARGIN,
      y,
    },
    thickness: 1,
    color: rgb(0.88, 0.89, 0.91),
  });

  y -= 18;

  drawText(
    `Layer Forge · ${siteUrl.replace(/^https?:\/\//, "")}`,
    LEFT_MARGIN,
    9,
  );

  return pdf.save();
}
