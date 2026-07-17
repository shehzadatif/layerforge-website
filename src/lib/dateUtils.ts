export function formatOrderDate(date: string | Date) {
  const orderDate = new Date(date);

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const orderDay = new Date(
    orderDate.getFullYear(),
    orderDate.getMonth(),
    orderDate.getDate()
  );

  const time = orderDate.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (orderDay.getTime() === today.getTime()) {
    return {
      label: "Today",
      color: "text-green-600",
      time,
    };
  }

  if (orderDay.getTime() === yesterday.getTime()) {
    return {
      label: "Yesterday",
      color: "text-blue-600",
      time,
    };
  }

  return {
    label: orderDate.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    color: "text-slate-500",
    time,
  };
}