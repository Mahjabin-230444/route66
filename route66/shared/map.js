let map;
let currentBaseLayer = null;
let currentRouteLayer = null;
let markerLayer = null;
let userMarker = null;
let pointMarkers = {};
let latestUserCoords = null;
let progressIntervalTimer = null;
let selectedProgressIntervalMinutes = 1;

const basemaps = {
  carto: {
    label: "Carto Light",
    layer: () => L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "© OpenStreetMap contributors © CARTO",
        maxZoom: 20
      }
    )
  },

  osm: {
    label: "OpenStreetMap",
    layer: () => L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19
      }
    )
  },

  satellite: {
    label: "Satellite",
    layer: () => L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles © Esri",
        maxZoom: 19
      }
    )
  },

  google: {
    label: "Google Map",
    layer: () => L.tileLayer(
      "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      {
        attribution: "© Google",
        maxZoom: 20
      }
    )
  }
};

function initRouteMap() {
  if (!window.MAP_DATA) {
    console.error("MAP_DATA is missing. Check this section's data.js file.");
    return;
  }

  const data = window.MAP_DATA;

  map = L.map("map", {
    zoomControl: true
  }).setView(data.center, data.zoom || 8);

  map.createPane("routePane");
  map.getPane("routePane").style.zIndex = 400;

  map.createPane("pointPane");
  map.getPane("pointPane").style.zIndex = 650;

  currentBaseLayer = basemaps.carto.layer();
  currentBaseLayer.addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  renderRoute(data);
  renderPoints(data.points || []);
  renderPlacesList(data.points || [], zoomToPoint);
  setupInternalSearch(data.points || [], zoomToPoint);
  setupMapControls();
  updateRouteSummary(data);
  startLocationTracking();
  startProgressAutoUpdate();
}

function renderRoute(data) {
  if (!data.mainRoute || data.mainRoute.length < 2) return;

  currentRouteLayer = L.polyline(data.mainRoute, {
    color: "#2d6cdf",
    weight: 5,
    opacity: 0.85,
    pane: "routePane"
  }).addTo(map);

  const distanceMeters = calculateRouteDistance(data.mainRoute);
  const km = distanceMeters / 1000;
  const miles = distanceMeters * 0.000621371;

  const avgSpeedMph = data.averageSpeedMph || 45;
  const driveMinutes = Math.round((miles / avgSpeedMph) * 60);

  currentRouteLayer.bindPopup(`
    <div class="popup-card">
      <span class="popup-badge type-service">Route</span>
      <h3 class="popup-title">${data.title}</h3>
      <p class="popup-desc">${data.routeStart || "Start"} → ${data.routeEnd || "End"}</p>
      <div class="popup-mile">
        ${miles.toFixed(1)} mi / ${km.toFixed(1)} km · Est. ${formatDriveTime(driveMinutes)}
      </div>
    </div>
  `);
}

function renderPoints(points) {
  pointMarkers = {};
  markerLayer.clearLayers();

  points.forEach((point, index) => {
    const marker = createPointMarker(point, index);

    marker.bindPopup(createPopupContent(point), {
      className: point.type === "attraction" ? "attraction-popup" : "stop-popup"
    });

    marker.on("click", () => {
      highlightListItem(point.id);
    });

    marker.addTo(markerLayer);
    pointMarkers[point.id] = marker;
  });

  updateMarkerClustering();
  map.on("zoomend", updateMarkerClustering);
}

function createPointMarker(point, index) {
  const type = point.type || "service";
  const isAttraction = type === "attraction" || type === "scenic";

  const html = isAttraction
    ? `<div class="star-marker" style="background:${getPointColor(type)}">★</div>`
    : `<div class="number-marker" style="background:${getPointColor(type)}">${index + 1}</div>`;

  return L.marker(point.coords, {
    pane: "pointPane",
    icon: L.divIcon({
      html,
      className: "",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -16]
    })
  });
}

/*
  Simple zoom-based clustering.
  This snaps points into one cluster when zoomed out.
  Later, we can replace this with Leaflet.markercluster if needed.
*/

function updateMarkerClustering() {
  if (!map || !window.MAP_DATA) return;

  const points = window.MAP_DATA.points || [];
  const zoom = map.getZoom();

  markerLayer.clearLayers();

  if (zoom >= 10 || points.length <= 3) {
    points.forEach((point, index) => {
      const marker = createPointMarker(point, index);
      marker.bindPopup(createPopupContent(point), {
        className: point.type === "attraction" ? "attraction-popup" : "stop-popup"
      });
      marker.on("click", () => highlightListItem(point.id));
      marker.addTo(markerLayer);
      pointMarkers[point.id] = marker;
    });

    return;
  }

  const clusters = groupPointsByGrid(points);

  clusters.forEach(cluster => {
    if (cluster.points.length === 1) {
      const point = cluster.points[0];
      const index = points.findIndex(p => p.id === point.id);
      const marker = createPointMarker(point, index);

      marker.bindPopup(createPopupContent(point), {
        className: point.type === "attraction" ? "attraction-popup" : "stop-popup"
      });

      marker.addTo(markerLayer);
      pointMarkers[point.id] = marker;
      return;
    }

    const marker = L.marker(cluster.center, {
      pane: "pointPane",
      icon: L.divIcon({
        html: `<div class="cluster-marker">${cluster.points.length}</div>`,
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      })
    });

    marker.on("click", () => {
      const bounds = L.latLngBounds(cluster.points.map(p => p.coords));
      map.fitBounds(bounds.pad(0.25));
    });

    marker.addTo(markerLayer);
  });
}

function groupPointsByGrid(points) {
  const zoom = map.getZoom();
  const gridSize = zoom <= 6 ? 100 : 70;
  const grouped = {};

  points.forEach(point => {
    const projected = map.project(point.coords, zoom);
    const keyX = Math.floor(projected.x / gridSize);
    const keyY = Math.floor(projected.y / gridSize);
    const key = `${keyX}_${keyY}`;

    if (!grouped[key]) grouped[key] = [];

    grouped[key].push(point);
  });

  return Object.values(grouped).map(groupPoints => {
    const lat = groupPoints.reduce((sum, p) => sum + p.coords[0], 0) / groupPoints.length;
    const lng = groupPoints.reduce((sum, p) => sum + p.coords[1], 0) / groupPoints.length;

    return {
      center: [lat, lng],
      points: groupPoints
    };
  });
}

function zoomToPoint(pointId) {
  const point = (window.MAP_DATA.points || []).find(p => p.id === pointId);
  if (!point) return;

  map.flyTo(point.coords, 14, {
    duration: 1.1
  });

  setTimeout(() => {
    const marker = pointMarkers[pointId];

    if (marker) {
      marker.openPopup();
    }
  }, 650);

  highlightListItem(pointId);
}

function setupMapControls() {
  const basemapSelect = document.getElementById("basemapSelect");
  const intervalSelect = document.getElementById("intervalSelect");
  const locationButton = document.getElementById("locationButton");

  if (basemapSelect) {
    basemapSelect.addEventListener("change", () => {
      changeBasemap(basemapSelect.value);
    });
  }

  if (intervalSelect) {
    intervalSelect.addEventListener("change", () => {
      selectedProgressIntervalMinutes = Number(intervalSelect.value);
      startProgressAutoUpdate();
    });
  }

  if (locationButton) {
    locationButton.addEventListener("click", zoomToCurrentLocation);
  }
}

function changeBasemap(type) {
  if (currentBaseLayer) {
    map.removeLayer(currentBaseLayer);
  }

  currentBaseLayer = basemaps[type].layer();
  currentBaseLayer.addTo(map);

  if (currentRouteLayer) currentRouteLayer.bringToFront();
  if (markerLayer) markerLayer.eachLayer(layer => layer.bringToFront());
  if (userMarker) userMarker.bringToFront();
}

function startLocationTracking() {
  if (!navigator.geolocation) return;

  navigator.geolocation.watchPosition(
    position => {
      latestUserCoords = [
        position.coords.latitude,
        position.coords.longitude
      ];

      updateUserMarker(latestUserCoords);
      updateProgressFromUserLocation();
    },
    error => {
      updateProgressStatus("Location unavailable: " + error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000
    }
  );
}

function zoomToCurrentLocation() {
  if (latestUserCoords) {
    map.flyTo(latestUserCoords, 15, { duration: 1.1 });

    if (userMarker) {
      setTimeout(() => userMarker.openPopup(), 650);
    }

    return;
  }

  if (!navigator.geolocation) {
    alert("Geolocation is not supported by this browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      latestUserCoords = [
        position.coords.latitude,
        position.coords.longitude
      ];

      updateUserMarker(latestUserCoords);
      map.flyTo(latestUserCoords, 15, { duration: 1.1 });
      updateProgressFromUserLocation();
    },
    error => {
      alert("Unable to get your current location: " + error.message);
    }
  );
}

function updateUserMarker(coords) {
  if (!userMarker) {
    userMarker = L.circleMarker(coords, {
      radius: 10,
      fillColor: "#0057ff",
      color: "#ffffff",
      weight: 3,
      fillOpacity: 1,
      pane: "pointPane"
    }).addTo(map);

    userMarker.bindPopup("Your current location");
  } else {
    userMarker.setLatLng(coords);
  }

  userMarker.bringToFront();
}

function startProgressAutoUpdate() {
  if (progressIntervalTimer) {
    clearInterval(progressIntervalTimer);
  }

  progressIntervalTimer = setInterval(() => {
    updateProgressFromUserLocation();
  }, selectedProgressIntervalMinutes * 60 * 1000);
}

function updateProgressFromUserLocation() {
  if (!latestUserCoords) {
    updateProgressStatus("Waiting for location...");
    return;
  }

  const data = window.MAP_DATA;

  if (!data || !data.mainRoute || data.mainRoute.length < 2) {
    updateProgressStatus("Route data not available.");
    return;
  }

  const progress = calculateProgressAlongRoute(latestUserCoords, data.mainRoute);

  updateProgressBar(progress.percent);

  updateProgressStatus(
    `Progress: ${progress.percent.toFixed(1)}% · Nearest route distance: ${progress.nearestDistanceKm.toFixed(2)} km`
  );
}

function calculateProgressAlongRoute(userCoords, routeCoords) {
  const userLatLng = L.latLng(userCoords[0], userCoords[1]);

  let totalDistance = 0;
  let cumulativeDistances = [0];

  for (let i = 1; i < routeCoords.length; i++) {
    const previous = L.latLng(routeCoords[i - 1][0], routeCoords[i - 1][1]);
    const current = L.latLng(routeCoords[i][0], routeCoords[i][1]);

    totalDistance += previous.distanceTo(current);
    cumulativeDistances.push(totalDistance);
  }

  let nearestIndex = 0;
  let nearestDistance = Infinity;

  routeCoords.forEach((coord, index) => {
    const routePoint = L.latLng(coord[0], coord[1]);
    const distanceToUser = userLatLng.distanceTo(routePoint);

    if (distanceToUser < nearestDistance) {
      nearestDistance = distanceToUser;
      nearestIndex = index;
    }
  });

  const distanceTravelled = cumulativeDistances[nearestIndex];

  const percent = totalDistance > 0
    ? (distanceTravelled / totalDistance) * 100
    : 0;

  return {
    percent: Math.max(0, Math.min(100, percent)),
    nearestDistanceKm: nearestDistance / 1000
  };
}

function updateProgressBar(percent) {
  const safePercent = Math.max(0, Math.min(100, percent));

  document.getElementById("userMarker").style.left = `${safePercent}%`;
  document.getElementById("userProgress").style.width = `${safePercent}%`;
}

function updateProgressStatus(message) {
  const status = document.getElementById("progressStatus");
  if (status) status.innerText = message;
}

function calculateRouteDistance(routeCoords) {
  let distance = 0;

  for (let i = 1; i < routeCoords.length; i++) {
    const pointA = L.latLng(routeCoords[i - 1][0], routeCoords[i - 1][1]);
    const pointB = L.latLng(routeCoords[i][0], routeCoords[i][1]);

    distance += pointA.distanceTo(pointB);
  }

  return distance;
}

function formatDriveTime(minutes) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`;
}

function updateRouteSummary(data) {
  const title = document.getElementById("mapTitle");
  const subtitle = document.getElementById("mapSubtitle");

  if (title) title.innerText = data.title || "Route 66 Map";

  if (subtitle) {
    const distanceMeters = calculateRouteDistance(data.mainRoute || []);
    const km = distanceMeters / 1000;
    const miles = distanceMeters * 0.000621371;
    const avgSpeedMph = data.averageSpeedMph || 45;
    const driveMinutes = Math.round((miles / avgSpeedMph) * 60);

    subtitle.innerText = `${data.routeStart || "Start"} → ${data.routeEnd || "End"} · ${miles.toFixed(1)} mi / ${km.toFixed(1)} km · Est. ${formatDriveTime(driveMinutes)}`;
  }
}

document.addEventListener("DOMContentLoaded", initRouteMap);