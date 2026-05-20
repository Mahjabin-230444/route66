const ROUTE66_SECTIONS = [
  {
    id: 1,
    slug: "illinois",
    title: "Illinois",
    route: "Chicago → Springfield",
    distance: "Approx. 201 mi / 323 km",
    desc: "The birthplace of Route 66, from Chicago through classic Illinois towns to Springfield.",
    theme: "blue"
  },
  {
    id: 2,
    slug: "missouri",
    title: "Missouri",
    route: "St. Louis → Joplin",
    distance: "Approx. 317 mi / 510 km",
    desc: "Cross St. Louis, the Ozarks, Cuba, Devil’s Elbow, Springfield, Carthage, and Joplin.",
    theme: "green"
  },
  {
    id: 3,
    slug: "kansas",
    title: "Kansas",
    route: "Kansas Route 66",
    distance: "Approx. 13 mi / 21 km",
    desc: "The shortest Route 66 section, featuring Galena, Riverton, Rainbow Bridge, and Baxter Springs.",
    theme: "amber"
  },
  {
    id: 4,
    slug: "oklahoma",
    title: "Oklahoma",
    route: "Oklahoma Route 66",
    distance: "Approx. 392 mi / 631 km",
    desc: "A rich Route 66 section with Tulsa, Catoosa, Arcadia, Oklahoma City, Clinton, and Elk City.",
    theme: "red"
  },
  {
    id: 5,
    slug: "texas",
    title: "Texas",
    route: "Texas Route 66",
    distance: "Approx. 178 mi / 286 km",
    desc: "Cross the Texas Panhandle through Shamrock, Amarillo, Adrian, and Glenrio.",
    theme: "maroon"
  },
  {
    id: 6,
    slug: "newmexico",
    title: "New Mexico",
    route: "Tucumcari → Gallup",
    distance: "Approx. 373 mi / 600 km",
    desc: "Adobe towns, neon motels, Albuquerque, Santa Fe loop, Continental Divide, and Gallup.",
    theme: "gold"
  },
  {
    id: 7,
    slug: "arizona",
    title: "Arizona",
    route: "Arizona Route 66",
    distance: "Approx. 401 mi / 645 km",
    desc: "Petrified Forest, Winslow, Flagstaff, Williams, Seligman, Kingman, and Oatman.",
    theme: "orange"
  },
  {
    id: 8,
    slug: "california",
    title: "California",
    route: "Needles → Santa Monica",
    distance: "Approx. 315 mi / 507 km",
    desc: "From Needles across the Mojave Desert and urban Route 66 to Santa Monica Pier.",
    theme: "cyan"
  },
  {
    id: 9,
    slug: "grandcanyon",
    title: "Grand Canyon",
    route: "South Rim",
    distance: "23 mi / 37 km rim drive",
    desc: "Dedicated South Rim map with Tusayan, Grand Canyon Village, viewpoints, and Desert View Drive.",
    theme: "canyon"
  },
  {
    id: 10,
    slug: "monumentvalley",
    title: "Monument Valley",
    route: "Monument Valley Scenic Area",
    distance: "17 mi / 27 km loop",
    desc: "Dedicated scenic map for Kayenta, Monument Valley loop, US-163 views, and Page extension.",
    theme: "valley"
  }
];

function isHomePage() {
  return document.body.dataset.page === "home";
}

function getCurrentPageSlug() {
  return document.body.dataset.page || "home";
}

function sectionHref(section) {
  return isHomePage() ? `${section.slug}/` : `../${section.slug}/`;
}

function homeHref() {
  return isHomePage() ? "./" : "../";
}

function renderLandingCards() {
  const grid = document.getElementById("sectionGrid");
  if (!grid) return;

  grid.innerHTML = ROUTE66_SECTIONS.map(section => `
    <a class="section-card ${section.theme}" href="${sectionHref(section)}">
      <div class="card-top">
        <span class="section-label">Section ${section.id}</span>
        <span class="section-number">${section.id}</span>
      </div>

      <div class="card-body">
        <h3>${section.title}</h3>
        <p>${section.desc}</p>
      </div>

      <div class="card-footer">
        <span>${section.distance}</span>
        <strong>→</strong>
      </div>
    </a>
  `).join("");

  const cards = document.querySelectorAll(".section-card");

  cards.forEach((card, index) => {
    card.style.animationDelay = `${index * 45}ms`;
    card.classList.add("fade-in-card");
  });
}

function renderSectionRibbon() {
  const ribbon = document.getElementById("sectionRibbon");
  if (!ribbon) return;

  const activeSlug = getCurrentPageSlug();

  const homeLink = `
    <a href="${homeHref()}" class="${activeSlug === "home" ? "active" : ""}">
      Home
    </a>
  `;

  const sectionLinks = ROUTE66_SECTIONS.map(section => {
    const activeClass = activeSlug === section.slug ? "active" : "";

    return `
      <a href="${sectionHref(section)}" class="${activeClass}">
        ${section.id}. ${section.title}
      </a>
    `;
  }).join("");

  ribbon.innerHTML = homeLink + sectionLinks;
}

document.addEventListener("DOMContentLoaded", () => {
  renderLandingCards();
  renderSectionRibbon();
});