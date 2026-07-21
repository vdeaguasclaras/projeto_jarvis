/* Service worker do Kairós — Marco 7 (PWA).
   Shell offline: navegação com rede primeiro (atualiza o cache), cache como
   reserva sem conexão; estáticos do Next com cache primeiro (são imutáveis). */

const CACHE = "kairos-v1";
const SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put("/", copia));
          return r;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || SHELL.includes(url.pathname) || url.pathname.endsWith(".svg")) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ??
          fetch(e.request).then((r) => {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copia));
            return r;
          }),
      ),
    );
  }
});

// Clique na notificação do check do dia → foca (ou abre) o app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => "focus" in w);
      return win ? win.focus() : self.clients.openWindow("/");
    }),
  );
});
