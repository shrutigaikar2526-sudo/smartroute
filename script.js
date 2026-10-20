
const schedules = [
  { time: "06:30", type: "Ordinary Bus", minutes: 90, status: "Scheduled" },
  { time: "06:30", type: "AC Bus", minutes: 80, status: "Scheduled" },
  { time: "08:15", type: "Ordinary Bus", minutes: 90, status: "Delayed (demo)" },
  { time: "08:15", type: "AC Bus", minutes: 80, status: "Scheduled" },
  { time: "10:30", type: "Ordinary Bus", minutes: 90, status: "Scheduled" },
  { time: "10:30", type: "AC Bus", minutes: 80, status: "Scheduled" },
  { time: "13:00", type: "Ordinary Bus", minutes: 90, status: "Scheduled" },
  { time: "13:00", type: "AC Bus", minutes: 80, status: "Scheduled" },
  { time: "15:30", type: "Ordinary Bus", minutes: 90, status: "Scheduled" },
  { time: "15:30", type: "AC Bus", minutes: 80, status: "Scheduled" },
  { time: "17:30", type: "Ordinary Bus", minutes: 90, status: "Scheduled" },
  { time: "17:30", type: "AC Bus", minutes: 80, status: "Scheduled" },
  { time: "18:30", type: "Ordinary Bus", minutes: 90, status: "Scheduled" },
  { time: "18:30", type: "AC Bus", minutes: 80, status: "Scheduled" },
  { time: "20:30", type: "Ordinary Bus", minutes: 90, status: "Scheduled" },
  { time: "20:30", type: "AC Bus", minutes: 80, status: "Scheduled" }
];

let map = null;
let userMarker = null;
let accuracyCircle = null;
let locationWatchId = null;
let routeLine = null;

const $ = id => document.getElementById(id);

function formatTime(time) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function getPeriod(time) {
  const hour = Number(time.split(":")[0]);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function departureDate(time) {
  const [h, m] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date;
}

function findBuses() {
  const period = $("period").value;
  const from = $("from").value;
  const to = $("to").value;

  $("routeLabel").textContent = `${from} to ${to}`;

  const buses = schedules.filter(bus =>
    period === "all" || getPeriod(bus.time) === period
  );

  $("total").textContent = buses.length;
  $("emptyMessage").hidden = buses.length !== 0;

  const list = $("busList");
  list.replaceChildren();

  buses.forEach(bus => {
    const card = document.createElement("article");
    card.className = "bus-card";

    const top = document.createElement("div");
    top.className = "bus-top";

    const time = document.createElement("strong");
    time.className = "bus-time";
    time.textContent = formatTime(bus.time);

    const type = document.createElement("span");
    type.className = "bus-type";
    type.textContent = bus.type;

    top.append(time, type);

    const info = document.createElement("p");
    info.className = "bus-info";
    info.textContent =
      `Estimated journey: ${bus.minutes} minutes · Sample schedule`;

    const bottom = document.createElement("div");
    bottom.className = "bus-bottom";

    const status = document.createElement("span");
    status.className = "status " +
      (bus.status.toLowerCase().includes("delay") ? "delayed" : "scheduled");
    status.textContent = bus.status;

    const button = document.createElement("button");
    button.className = "details-btn";
    button.type = "button";
    button.textContent = "View details";
    button.addEventListener("click", () => showJourney(bus));

    bottom.append(status, button);
    card.append(top, info, bottom);
    list.appendChild(card);
  });

  updateStats();
  updateMapRoute();
}

function updateStats() {
  const now = new Date();

  const upcoming = schedules
    .map(bus => ({ ...bus, date: departureDate(bus.time) }))
    .filter(bus => bus.date > now)
    .sort((a, b) => a.date - b.date);

  $("lastTime").textContent = formatTime(schedules[schedules.length - 1].time);

  if (!upcoming.length) {
    $("nextTime").textContent = "Finished";
    $("countdown").textContent = "Tomorrow";
    return;
  }

  const next = upcoming[0];
  const minutesLeft = Math.floor((next.date - now) / 60000);
  const hours = Math.floor(minutesLeft / 60);
  const minutes = minutesLeft % 60;

  $("nextTime").textContent = formatTime(next.time);
  $("countdown").textContent = hours
    ? `${hours}h ${minutes}m`
    : `${minutes} min`;
}

function showJourney(bus) {
  const container = $("journeyDetails");
  container.replaceChildren();

  const heading = document.createElement("p");
  heading.textContent = `${$("from").value} → ${$("to").value} · ${bus.type}`;
  container.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "journey-detail-grid";

  [
    ["Departure", formatTime(bus.time)],
    ["Estimated journey", `${bus.minutes} minutes`],
    ["Sample status", bus.status],
    ["Information source", "Demonstration data"]
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "detail-item";

    const labelElement = document.createElement("span");
    labelElement.textContent = label;

    const valueElement = document.createElement("strong");
    valueElement.textContent = value;

    item.append(labelElement, valueElement);
    grid.appendChild(item);
  });

  container.appendChild(grid);
}

function updateMapRoute() {
  if (!map || typeof L === "undefined") return;

  const panvel = [18.9894, 73.1175];
  const alibag = [18.6414, 72.8722];

  const start = $("from").value === "Panvel" ? panvel : alibag;
  const end = $("to").value === "Alibag" ? alibag : panvel;

  if (routeLine) map.removeLayer(routeLine);

  routeLine = L.polyline([start, end], {
    color: "#176b50",
    weight: 5,
    dashArray: "8, 8"
  }).addTo(map);

  map.fitBounds([start, end], { padding: [30, 30] });
}

function initializeMap() {
  const status = $("locationStatus");

  if (typeof L === "undefined") {
    status.textContent =
      "Map library failed to load. Check your internet connection and Leaflet URL.";
    return;
  }

  try {
    map = L.map("routeMap").setView([18.85, 72.95], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    L.marker([18.9894, 73.1175])
      .addTo(map)
      .bindPopup("Panvel — Starting point");

    L.marker([18.6414, 72.8722])
      .addTo(map)
      .bindPopup("Alibag — Destination");

    updateMapRoute();

    setTimeout(() => map.invalidateSize(), 300);
  } catch (error) {
    status.textContent = "Map error: " + error.message;
    console.error(error);
  }
}

function startLocation() {
  const status = $("locationStatus");

  if (!navigator.geolocation) {
    status.textContent = "Your browser does not support device location.";
    return;
  }

  status.textContent = "Requesting device location permission...";

  locationWatchId = navigator.geolocation.watchPosition(
    position => {
      if (!map) {
        status.textContent = "Map is unavailable. Please refresh the page.";
        return;
      }

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      if (userMarker) map.removeLayer(userMarker);
      if (accuracyCircle) map.removeLayer(accuracyCircle);

      userMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Your device location");

      accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: "#2477d4",
        fillOpacity: 0.1
      }).addTo(map);

      map.setView([lat, lng], 14);

      status.textContent =
        `Location updated. Accuracy: approximately ${Math.round(accuracy)} metres.`;

      $("locateMe").disabled = true;
      $("stopLocation").disabled = false;
    },
    error => {
      const messages = {
        1: "Location permission denied. Allow location access in browser settings.",
        2: "Device location is unavailable. Check your device settings.",
        3: "Location request timed out. Please try again."
      };

      status.textContent = messages[error.code] || "Could not access location.";
      $("locateMe").disabled = false;
      $("stopLocation").disabled = true;
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );

  $("locateMe").disabled = true;
  $("stopLocation").disabled = false;
}

function stopLocation() {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }

  if (map && userMarker) map.removeLayer(userMarker);
  if (map && accuracyCircle) map.removeLayer(accuracyCircle);

  userMarker = null;
  accuracyCircle = null;

  $("locationStatus").textContent = "Location sharing is off.";
  $("locateMe").disabled = false;
  $("stopLocation").disabled = true;
}

function initializeApp() {
  $("search").addEventListener("click", findBuses);

  $("swapRoute").addEventListener("click", () => {
    const oldFrom = $("from").value;
    $("from").value = $("to").value;
    $("to").value = oldFrom;
    findBuses();
  });

  $("period").addEventListener("change", findBuses);
  $("from").addEventListener("change", findBuses);
  $("to").addEventListener("change", findBuses);
  $("locateMe").addEventListener("click", startLocation);
  $("stopLocation").addEventListener("click", stopLocation);

  findBuses();
  initializeMap();
  setInterval(updateStats, 30000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
