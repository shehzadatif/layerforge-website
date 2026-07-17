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

export function getNextOrderStatus(status: string) {
  switch (status) {
    case ORDER_STATUS.NEW:
      return ORDER_STATUS.IN_PROGRESS;

    case ORDER_STATUS.IN_PROGRESS:
      return ORDER_STATUS.READY;

    case ORDER_STATUS.READY:
      return ORDER_STATUS.SHIPPED;

    case ORDER_STATUS.SHIPPED:
      return ORDER_STATUS.COMPLETED;

    default:
      return null;
  }
}

export function getNextButtonLabel(status: string) {
  switch (status) {
    case ORDER_STATUS.NEW:
      return "▶ Start Order";

    case ORDER_STATUS.IN_PROGRESS:
      return "▶ Mark Ready";

    case ORDER_STATUS.READY:
      return "▶ Mark Shipped";

    case ORDER_STATUS.SHIPPED:
      return "▶ Complete Order";

    default:
      return "";
  }
}