const version = "v1";
const cacheName = `myapp-${version}`;

const filesToCache = [
  "/index.html",
  "/favoris.html",
  "/main.js",
  "/style.css",
  "/manifest.webmanifest",
  "/icons/150x150.jpg",
  "/icons/192x192.jpg",
  "/icons/360x360.jpg",
  "/icons/512x512.jpg",
  "/icons/heart-regular.svg",
  "/icons/heart-solid.svg",
  "/icons/share-solid.svg",
];

self.addEventListener("install", (e) => {
  console.log("[SW] Installed");
  e.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(filesToCache))
  );
});

self.addEventListener("fetch", (e) => {
  console.log("[SW] Fetching url: ", e.request.url);
  e.respondWith(
    (async () => {
      // If the request has already been cached,
      // return the cached value to avoid uncessary network usage.
      const match = await caches.match(e.request);
      if (match) return match;

      const response = await fetch(e.request);
      const cacheControl = response.headers.get("Cache-Control");

      if (
        e.request.method === "GET" &&
        !(cacheControl === "no-cache" || cacheControl === "no-store")
      ) {
        const cache = await caches.open(cacheName);
        console.log("[SW] Caching new resource: ", e.request.url);
        cache.put(e.request, response.clone());
      }

      return response;
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key === cacheName) return;
          return caches.delete(key);
        })
      );
    })()
  );
});

self.addEventListener("periodicsync", (e) => {});

self.addEventListener("sync", function (event) {
  if (event.tag === "daily-sync") {
    event.waitUntil(syncData());
  }
});

/**
 * Fetch the list of movies currently playing in theaters
 */
async function syncData() {
  const movies = await nowPlaying();
  const series = await airingToday();

  if (movies.length || series.length) {
    sendNotification();
  }
}

/**
 * Fetch the list of movies currently playing in theaters
 *
 * @param {*} movies
 */
function notificationMovies(movies) {
  sendNotification(
    "Nouveaux films",
    `Il y a ${movies.length} nouveaux films à découvrir !`
  );
}

/**
 * Fetch the list of TV shows airing today
 *
 * @param {*} series
 */
function notificationSeries(series) {
  sendNotification(
    "Nouvelles séries",
    `Il y a ${series.length} nouvelles séries à découvrir !`
  );
}

/**
 * Send a system notification
 *
 * @param {*} title
 * @param {*} body
 * @returns
 */
function sendNotification(title, body) {
  if (!("Notification" in window)) {
    console.error(
      "This browser does not support system notifications or the Notification request was denied."
    );
    return;
  }

  // Check if notification permissions have already been granted
  Notification.requestPermission().then(function (permission) {
    if (permission === "granted") {
      var notification = new Notification(title, { body });

      notification.onclick = function () {
        console.log("Notification clicked");
      };
    } else {
      console.warn("Permission to display notifications was denied");
    }
  });
}
