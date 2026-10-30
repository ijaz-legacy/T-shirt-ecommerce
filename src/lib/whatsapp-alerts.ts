/**
 * WhatsApp order alerts — sent to the owner (and later: staff members)
 * whenever a customer places a new order.
 *
 * Delivery uses the official Meta WhatsApp Cloud API:
 *   1. Create a Meta developer app and add the "WhatsApp" product.
 *   2. Set these secrets on the deployed environment (and .env.local for dev):
 *        WHATSAPP_ALERT_TOKEN=<permanent access token>
 *        WHATSAPP_ALERT_PHONE_ID=<Meta business phone number id>
 *   3. While the customer-facing Meta number is in "doctor mode", message once
 *      from the owner/staff phone to link it; after that alerts arrive 24/7.
 *
 * Until both secrets are present, alerts are skipped quietly — placing an
 * order is never blocked or slowed down by a WhatsApp outage.
 */
import type { Order } from "@/lib/types";
import { formatINR } from "@/lib/currency";

/** Phonenumbersto notify. Owner first — add staff numbers here when hired. */
export const WHATSAPP_ALERT_NUMBERS: readonly string[] = [
  "918754750458", // IJAZ LEGACY owner
  // "91XXXXXXXXXX", // future staff #1
];

const API_VERSION = "v22.0";

function buildNewOrderText(order: Order): string {
  const items = order.items
    .map((item) => {
      const label =
        item.kind === "custom" ? "Custom tee" : item.nameEn || "Tee";
      return `• ${label} × ${item.quantity}${item.size ? ` (${item.size})` : ""}`;
    })
    .join("\n");

  return [
    "🛍️ New order received — IJAZ LEGACY",
    "",
    `Order: ${order.orderNumber}`,
    `Customer: ${order.customerName} (${order.phone})`,
    `Ship to: ${order.city}, ${order.state} ${order.pincode}`,
    "",
    items,
    "",
    `Total: ${formatINR(order.total)} (Cash on delivery)`,
  ].join("\n");
}

async function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_ALERT_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_ALERT_PHONE_ID?.trim();
  if (!token || !phoneId) return false; // not configured yet

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) {
      console.warn(`WhatsApp alert to ${to} failed: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`WhatsApp alert to ${to} could not be sent`, error);
    return false;
  }
}

/** Fire-and-forget: never awaited by the order route, never throws. */
export function notifyOwnerNewOrder(order: Order): void {
  const body = buildNewOrderText(order);
  for (const number of WHATSAPP_ALERT_NUMBERS) {
    void sendWhatsAppText(number, body);
  }
}
