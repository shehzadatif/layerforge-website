export const ORDER_STATUS = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  READY: "Ready",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export const ACTIVE_ORDER_STATUSES = [
  ORDER_STATUS.NEW,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.READY,
  ORDER_STATUS.SHIPPED,
];

export function getNextOrderStatus(status: string, isPickupOrder = false) {
  switch (status) {
    case ORDER_STATUS.NEW:
      return ORDER_STATUS.IN_PROGRESS;

    case ORDER_STATUS.IN_PROGRESS:
      return ORDER_STATUS.READY;

    case ORDER_STATUS.READY:
      return isPickupOrder ? ORDER_STATUS.COMPLETED : null;

    case ORDER_STATUS.SHIPPED:
      return ORDER_STATUS.COMPLETED;

    default:
      return null;
  }
}

export function getNextButtonLabel(status: string, isPickupOrder = false) {
  switch (status) {
    case ORDER_STATUS.NEW:
      return "▶ Start Order";

    case ORDER_STATUS.IN_PROGRESS:
      return "▶ Mark Production Complete";

    case ORDER_STATUS.READY:
      return isPickupOrder ? "▶ Complete Pickup" : "";

    case ORDER_STATUS.SHIPPED:
      return "▶ Complete Order";

    default:
      return "";
  }
}

export function getOrderStatusDisplayLabel(
  status: string,
  isPickupOrder: boolean,
) {
  if (status === ORDER_STATUS.READY) {
    return isPickupOrder ? "Ready for Pickup" : "Production Complete";
  }

  return status;
}
