function setupPanelToggle() {
  const panel = document.getElementById("sidePanel");
  const toggle = document.getElementById("panelToggle");

  if (!panel || !toggle) return;

  toggle.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
    toggle.classList.toggle("collapsed");

    const collapsed = panel.classList.contains("collapsed");
    toggle.innerText = collapsed ? "☰" : "←";

    // Important: force Leaflet to recalculate map size after layout change
    setTimeout(() => {
      if (window.map) {
        window.map.invalidateSize();
      } else if (typeof map !== "undefined" && map) {
        map.invalidateSize();
      }
    }, 300);
  });
}

function typeClass(type) {
  return `type-${type || "service"}`;
}

function formatType(type) {
  if (!type) return "Place";

  return type
    .replace("_", " ")
    .replace(/\b\w/g, character => character.toUpperCase());
}

function getPointColor(type) {
  const colors = {
    stop: "#ef1d1d",
    attraction: "#e67e22",
    food: "#e8b923",
    fuel: "#2e8b57",
    lodging: "#5dade2",
    scenic: "#8e44ad",
    detour: "#7f8c8d",
    service: "#34495e"
  };

  return colors[type] || colors.service;
}

function createPopupContent(point) {
  const type = point.type || "service";
  const badgeClass = typeClass(type);

  const mileText = point.mile
    ? `<div class="popup-mile">Mile ${point.mile}</div>`
    : "";

  const significanceText = point.significance
    ? `<p class="popup-significance">${point.significance}</p>`
    : "";

  return `
    <div class="popup-card">
      <span class="popup-badge ${badgeClass}">
        ${formatType(type)}
      </span>

      <h3 class="popup-title">${point.name}</h3>

      <p class="popup-desc">
        ${point.desc || ""}
      </p>

      ${significanceText}
      ${mileText}
    </div>
  `;
}

function renderPlacesList(points, onPointClick) {
  const list = document.getElementById("placesList");
  if (!list) return;

  list.innerHTML = "";

  points.forEach((point, index) => {
    const type = point.type || "service";
    const color = getPointColor(type);

    const significanceText = point.significance
      ? `<div class="place-significance">${point.significance}</div>`
      : "";

    const item = document.createElement("div");
    item.className = "place-item";
    item.dataset.pointId = point.id;

    item.innerHTML = `
      <div class="place-number" style="background:${color}">
        ${point.type === "attraction" ? "★" : index + 1}
      </div>

      <div class="place-info">
        <h3>${point.name}</h3>
        <p>${point.desc || ""}</p>
        ${significanceText}
        <span class="place-type ${typeClass(type)}">
          ${formatType(type)}
        </span>
      </div>
    `;

    item.addEventListener("click", () => {
      onPointClick(point.id);
    });

    list.appendChild(item);
  });
}

function highlightListItem(pointId) {
  const items = document.querySelectorAll(".place-item");

  items.forEach(item => {
    item.style.borderColor = "#eeeeee";
    item.style.background = "#f9fafb";
  });

  const activeItem = document.querySelector(`.place-item[data-point-id="${pointId}"]`);

  if (activeItem) {
    activeItem.style.borderColor = "#2d6cdf";
    activeItem.style.background = "#eef5ff";
    activeItem.scrollIntoView({
      block: "nearest",
      behavior: "smooth"
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupPanelToggle();
});
