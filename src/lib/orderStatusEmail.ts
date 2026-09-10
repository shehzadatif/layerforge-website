import { ORDER_STATUS } from "./orderStatus";

export type OrderStatusEmailKind =
  | "in_progress"
  | "pickup_ready"
  | "shipped"
  | "completed"
  | null;

interface OrderStatusEmailDecision {
  previousStatus: string;
  requestedStatus: string;
  isPickupOrder: boolean;
}

export function getOrderStatusEmailKind({
  previousStatus,
  requestedStatus,
  isPickupOrder,
}: OrderStatusEmailDecision): OrderStatusEmailKind {
  if (
    requestedStatus === ORDER_STATUS.IN_PROGRESS &&
    previousStatus !== ORDER_STATUS.IN_PROGRESS
  ) {
    return "in_progress";
  }

  if (requestedStatus === ORDER_STATUS.READY && isPickupOrder) {
    return "pickup_ready";
  }

  if (requestedStatus === ORDER_STATUS.SHIPPED && !isPickupOrder) {
    return "shipped";
  }

  if (
    requestedStatus === ORDER_STATUS.COMPLETED &&
    previousStatus !== ORDER_STATUS.COMPLETED
  ) {
    return "completed";
  }

  return null;
}
