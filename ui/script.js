const chromeSettings = chrome.contentSettings;
const searchInput = document.getElementById("search");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
let allSites = [];

function loadSites() {
  chrome.storage.local.get("disabledSites", (data) => {
    allSites = data.disabledSites || [];
    renderSites(allSites);
  });
}

function renderSites(sites) {
  listEl.innerHTML = "";

  if (sites.length === 0) {
    listEl.style.display = "none";
    emptyEl.hidden = false;
    return;
  }

  listEl.style.display = "block";
  emptyEl.hidden = true;

  sites.forEach((item) => {
    const li = document.createElement("li");
    li.className = "site-item";
    li.innerHTML = `
      <span class="site-name">${item.site}</span>
      <button class="enable-btn" data-site="${item.site}">Enable JS</button>
    `;
    listEl.appendChild(li);
  });

  document.querySelectorAll(".enable-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const site = e.target.dataset.site;
      allSites = allSites.filter((item) => item.site !== site);
      chrome.storage.local.set({ disabledSites: allSites });
      chromeSettings.javascript.set({
        primaryPattern: site,
        setting: "allow",
        scope: "regular",
      });
    });
  });
}

function filterSites(query) {
  if (!query) return allSites;
  return allSites.filter((item) =>
    item.site.toLowerCase().includes(query.toLowerCase()),
  );
}

searchInput.addEventListener("input", (e) => {
  renderSites(filterSites(e.target.value));
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.disabledSites) {
    loadSites();
  }
});

loadSites();
