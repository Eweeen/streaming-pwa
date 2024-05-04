// Config
const URL = "https://api.themoviedb.org/3/";
const token =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjMmU2NWYwYWZmMWE3ZDVlOGEwNjk5MzFlNDkyZjJmYiIsInN1YiI6IjYzZTYxNjNhZDI5YmRkMDA3Y2E3NGFiZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.W6Ro6CCwXWIfCdXUyv8cmwdR9hnK10ia-BJEhZLGajs";
const options = {
  method: "GET",
  headers: { accept: "application/json", Authorization: `Bearer ${token}` },
};
const data = { movies: [], series: [] };

// IndexedDB
const dbVersion = 2;
const dbName = "streaming";
const storesNames = [
  {
    name: "movies",
    index: ["title", "release_date", "poster_path", "vote_average"],
  },
  {
    name: "series",
    index: ["name", "first_air_date", "poster_path", "vote_average"],
  },
];
const storeKeyPath = "id";

// DOM
const popularMovies = document.getElementById("popular-movies");
const popularSeries = document.getElementById("popular-series");
const favoritesMovies = document.getElementById("favorites-movies");
const favoritesSeries = document.getElementById("favorites-series");

// Utils
const localeDateString = (date) =>
  date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

window.addEventListener("load", () => {
  getPopularMovies();
  getPopularSeries();
  getFavoritesMovies();
  getFavoritesSeries();
});

/**
 * Open the IndexedDB database.
 *
 * @async
 * @returns {Promise<IDBDatabase>} - The IndexedDB database.
 */
async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, dbVersion);

    req.onerror = (event) => reject(event.target.error);
    req.onsuccess = (event) => resolve(event.target.result);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      for (const storeName of storesNames) {
        if (!db.objectStoreNames.contains(storeName.name)) {
          const store = db.createObjectStore(storeName.name, {
            keyPath: storeKeyPath,
          });

          for (const index of storeName.index) {
            store.createIndex(index, index, { unique: false });
          }
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get all the data from a store.
 *
 * @async
 * @param {'movies' | 'series'} storeName - The store name.
 * @returns {Promise<any[]>} - The data from the store.
 */
async function getAll(storeName) {
  const transaction = (await openDB()).transaction([storeName], "readonly");

  return new Promise((resolve, reject) => {
    transaction.onerror = reject;
    const store = transaction.objectStore(storeName);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Add movie to a store.
 *
 * @async
 * @param {number} id - The id of the movie or serie
 * @param {string} title - The title of the movie or serie
 * @param {string} release_date - The release date of the movie or serie
 * @param {string} poster_path - The poster path of the movie or serie
 */
async function addMovie(id, title, release_date, poster_path, vote_average) {
  const transaction = (await openDB()).transaction(["movies"], "readwrite");

  return new Promise((resolve, reject) => {
    transaction.onerror = reject;
    const store = transaction.objectStore("movies");
    const req = store.add({
      id,
      title,
      release_date,
      poster_path,
      vote_average,
    });

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Add serie to a store.
 *
 * @async
 * @param {number} id - The id of the serie
 * @param {string} name - The name of the serie
 * @param {string} first_air_date - The first air date of the serie
 * @param {string} poster_path - The poster path of the serie
 */
async function addSerie(id, name, first_air_date, poster_path, vote_average) {
  const transaction = (await openDB()).transaction(["series"], "readwrite");

  return new Promise((resolve, reject) => {
    transaction.onerror = reject;
    const store = transaction.objectStore("series");
    const req = store.add({
      id,
      name,
      first_air_date,
      poster_path,
      vote_average,
    });

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Remove data from a store.
 *
 * @async
 * @param {'movies' | 'series'} storeName - The store name.
 * @param {number} id - The id of the movie or serie.
 */
async function remove(storeName, id) {
  const transaction = (await openDB()).transaction([storeName], "readwrite");

  return new Promise((resolve, reject) => {
    transaction.onerror = reject;
    const store = transaction.objectStore(storeName);
    const req = store.delete(id);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Build a card
 *
 * @param {number} id - The id of the movie or serie
 * @param {string} title - The title of the movie or serie
 * @param {string} release_date - The release date of the movie or serie
 * @param {string} poster_path - The poster path of the movie or serie
 * @param {number} vote_average - The vote average of the movie or serie
 * @param {boolean} isFavorite - If the movie or serie is favorite
 * @param {'movie' | 'serie'} type - The type of the card
 * @returns {HTMLElement} card - The card element
 */
function buildCard(
  id,
  title,
  release_date,
  poster_path,
  vote_average,
  isFavorite,
  type
) {
  const date = localeDateString(new Date(release_date));

  const card = document.createElement("div");
  card.classList.add("card");
  card.dataset.id = id;

  const src = isFavorite ? "icons/heart-solid.svg" : "icons/heart-regular.svg";
  const alt = isFavorite ? "Retirer des favoris" : "Ajouter aux favoris";

  card.innerHTML = `
    <div data-id="${id}" class="favorite-${type} absolute z-10 top-2 right-2 cursor-pointer bg-black p-2 rounded-full">
      <img src="${src}" alt="${alt}" class="w-6 h-6" />
    </div>

    <div class="poster relative flex-1">
      <img src="https://image.tmdb.org/t/p/w300${poster_path}" alt="${title}" />

      <div data-id="${id}" class="shared shared-${type} hidden absolute bottom-2 right-2 bg-black rounded-xl p-2" title="Partager sur Twitter">
        <img src="icons/share-solid.svg" alt="Partager" class="w-5 h-5" />
      </div>
    </div>

    <div class="card-infos">
      <h2 title="${title}">${title}</h2>

      <div class="flex justify-between">
        <p>${date}</p>
        <p>${vote_average.toFixed(1)} / 10</p>
      </div>
    </div>
  `;

  return card;
}

/**
 * Get popular movies
 *
 * @async
 * @returns {Promise} movies - The popular movies
 */
async function getPopularMovies() {
  if (!popularMovies) return;

  const movies = await fetch(
    `${URL}movie/popular?language=fr-FR&page=1`,
    options
  )
    .then((response) => response.json())
    .catch((err) => console.error(err));

  popularMovies.innerHTML = "";
  data.movies = movies.results;

  const favoriteMovies = await getAll("movies");

  for (const m of movies.results) {
    const isFavorite = favoriteMovies.find((item) => item.id === m.id);

    const movie = buildCard(
      m.id,
      m.title,
      m.release_date,
      m.poster_path,
      m.vote_average,
      isFavorite,
      "movie"
    );
    popularMovies.appendChild(movie);
  }

  setEventListenerToFavorite("movie");
}

/**
 * Get popular series
 *
 * @async
 * @returns {Promise} series - The popular series
 */
async function getPopularSeries() {
  if (!popularSeries) return;

  const series = await fetch(`${URL}tv/popular?language=en-US&page=1`, options)
    .then((response) => response.json())
    .catch((err) => console.error(err));

  popularSeries.innerHTML = "";
  data.series = series.results;

  const favoriteSeries = await getAll("series");

  for (const s of series.results) {
    const isFavorite = favoriteSeries.find((item) => item.id === s.id);

    const serie = buildCard(
      s.id,
      s.name,
      s.first_air_date,
      s.poster_path,
      s.vote_average,
      isFavorite,
      "serie"
    );
    popularSeries.appendChild(serie);
  }

  setEventListenerToFavorite("serie");
}

/**
 * Get favorite movies
 *
 * @async
 * @returns {Promise}
 */
async function getFavoritesMovies() {
  if (!favoritesMovies) return;

  const favoriteMovies = await getAll("movies");

  favoritesMovies.innerHTML = "";
  data.movies = favoriteMovies;

  if (!favoriteMovies.length) {
    const noFavorites = document.createElement("p");
    noFavorites.textContent = "Aucun film favori";

    favoritesMovies.appendChild(noFavorites);
    return;
  }

  for (const m of favoriteMovies) {
    const movie = buildCard(
      m.id,
      m.title,
      m.release_date,
      m.poster_path,
      m.vote_average,
      true,
      "movie"
    );
    favoritesMovies.appendChild(movie);
  }

  setEventListenerToFavorite("movie");
}

/**
 * Get favorite series
 *
 * @async
 * @returns {Promise}
 */
async function getFavoritesSeries() {
  if (!favoritesSeries) return;

  const favoriteSeries = await getAll("series");

  favoritesSeries.innerHTML = "";
  data.series = favoriteSeries;

  if (!favoriteSeries.length) {
    const noFavorites = document.createElement("p");
    noFavorites.textContent = "Aucune série favorite";

    favoritesSeries.appendChild(noFavorites);
    return;
  }

  for (const s of favoriteSeries) {
    const serie = buildCard(
      s.id,
      s.name,
      s.first_air_date,
      s.poster_path,
      s.vote_average,
      true,
      "serie"
    );
    favoritesSeries.appendChild(serie);
  }

  setEventListenerToFavorite("serie");
}

/**
 * Get movies that are now playing
 *
 * @async
 * @returns {Promise} res - The movies that are now playing
 */
async function nowPlaying() {
  const movies = await fetch(
    `${URL}movie/now_playing?language=fr-FR&page=1`,
    options
  )
    .then((response) => response.json())
    .catch((err) => console.error(err));

  const res = [];

  for (const m of movies.results) {
    const release = localeDateString(new Date(m.release_date));
    const today = localeDateString(new Date());

    if (release === today) res.push(m);
  }

  return res;
}

/**
 * Get series that are airing today
 *
 * @async
 * @returns {Promise} res - The series that are airing today
 */
async function airingToday() {
  const series = await fetch(
    `${URL}tv/airing_today?language=en-US&page=1`,
    options
  )
    .then((response) => response.json())
    .catch((err) => console.error(err));

  const res = [];

  for (const s of series.results) {
    const release = localeDateString(new Date(s.first_air_date));
    const today = localeDateString(new Date());

    if (release === today) res.push(s);
  }

  return res;
}

/**
 * Set event listener to favorite
 *
 * @param {'movie' | 'serie'} type - The type of the card
 * @returns {void}
 */
function setEventListenerToFavorite(type) {
  // Add event listeners to the bookmark icons.
  const icons = document.querySelectorAll(`.favorite-${type}`);
  icons.forEach((el) => {
    el.addEventListener("click", handleFavoriteClick);
  });

  // Add event listeners to the share icons.
  const shared = document.querySelectorAll(`.shared-${type}`);
  shared.forEach((el) => {
    el.addEventListener("click", handleShareClick);
  });
}

/**
 * Handle the favorite click event.
 *
 * @async
 * @param {Event} e - The event object.
 * @returns {void}
 */
function handleFavoriteClick(e) {
  let target = e.target;
  let child;
  e.preventDefault();

  const isImg = e.target.tagName === "IMG";
  if (isImg) {
    target = e.target.parentElement;
    child = e.target;
  } else {
    child = e.target.querySelector("img");
  }

  const id = +target.dataset.id;
  const type =
    target.classList[0].split("-")[1] === "movie" ? "movies" : "series";

  if (child.src.includes("heart-regular")) {
    child.src = "icons/heart-solid.svg";

    const item = data[type].find((item) => item.id === id);

    if (type === "movies") {
      addMovie(
        id,
        item.title,
        item.release_date,
        item.poster_path,
        item.vote_average
      );
    } else {
      addSerie(
        id,
        item.name,
        item.first_air_date,
        item.poster_path,
        item.vote_average
      );
    }
  } else {
    child.src = "icons/heart-regular.svg";
    remove(type, id);
  }
}

/**
 * Handle the share click event.
 *
 * @param {Event} e - The event object.
 * @returns {void}
 */
function handleShareClick(e) {
  let target = e.target;
  let child;
  e.preventDefault();

  const isImg = e.target.tagName === "IMG";
  if (isImg) {
    target = e.target.parentElement;
    child = e.target;
  } else {
    child = e.target.querySelector("img");
  }

  const id = +target.dataset.id;
  const type =
    target.classList[1].split("-")[1] === "movie" ? "movies" : "series";

  const item = data[type].find((item) => item.id === id);

  const url = `https://www.themoviedb.org/${type}/${id}`;
  const text = `Découvrez ${item.title || item.name} sur The Movie Database`;

  partagerSurTwitter(url, text);
}

/**
 * Partager sur Twitter
 *
 * @param {string} url - L'URL à partager
 * @param {string} texte - Le texte à partager
 */
function partagerSurTwitter(url, texte) {
  // Créer l'URL de partage pour Twitter
  var twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    url
  )}&text=${encodeURIComponent(texte)}`;
  // Ouvrir une nouvelle fenêtre pour partager l'URL sur Twitter
  window.open(twitterShareUrl, "_blank", "width=1000,height=700");
}
