function setupInternalSearch(points, onPointClick) {
  const input = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");

  if (!input || !resultsBox) return;

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      resultsBox.style.display = "none";
      resultsBox.innerHTML = "";
      return;
    }

    const results = points.filter(point => {
      const searchable = [
        point.name,
        point.type,
        point.desc,
        point.significance,
        point.routeRole
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    }).slice(0, 8);

    if (results.length === 0) {
      resultsBox.style.display = "block";
      resultsBox.innerHTML = `
        <div class="search-result">
          No internal place found
        </div>
      `;
      return;
    }

    resultsBox.style.display = "block";
    resultsBox.innerHTML = results.map(point => `
      <div class="search-result" data-point-id="${point.id}">
        <strong>${point.name}</strong><br>
        <small>${formatType(point.type)}</small>
      </div>
    `).join("");

    resultsBox.querySelectorAll(".search-result").forEach(item => {
      item.addEventListener("click", () => {
        const pointId = Number(item.dataset.pointId);
        input.value = "";
        resultsBox.style.display = "none";
        resultsBox.innerHTML = "";
        onPointClick(pointId);
      });
    });
  });
}