self.addEventListener("push", (event) => {
  let message = {
    title: "Layer Forge Canada",
    body: "A visitor sent a new message.",
    url: "/admin/chats",
  };

  try {
    if (event.data) message = { ...message, ...event.data.json() };
  } catch {
    // Use the safe fallback notification.
  }

  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: "/icon-192.png",
      badge: "/favicon-32.png",
      tag: "layer-forge-team-chat",
      renotify: true,
      data: { url: message.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/chats";
  event.waitUntil(clients.openWindow(url));
});

