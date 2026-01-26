var chromeSettings = chrome.contentSettings;
var currentTab = null;
var extractHostname = new RegExp("^(?:f|ht)tp(?:s)?\://([^/]+)", "im");
var actualState = {
  allow: "enabled",
  block: "disabled",
  inactive: "na",
};

var buttonTexts = {
  enabled: "Disable JavaScript on this page",
  disabled: "Enable JavaScript on this page",
  na: "Not available on this page",
};

// state = enabled/disabled/na
async function changeIconAs(thisState) {
  chrome.action.setIcon({
    path: "/icons/icon-" + thisState + ".png",
  });

  let s = await chrome.storage.local.get("cmCreated");

  if (s.cmCreated) {
    chrome.contextMenus.update("parent", {
      enabled: thisState !== "na",
      title: buttonTexts[thisState],
    });
  }
}

function updateSiteStateInStorage(site, state) {
  chrome.storage.local.get("disabledSites", (data) => {
    let disabledSites = data.disabledSites || [];

    const exisitingSiteIndex = disabledSites.findIndex((i) => i.site === site);

    if (exisitingSiteIndex > -1) {
      if (state === "allow") {
        disabledSites.splice(exisitingSiteIndex, 1);
      } else {
        disabledSites[exisitingSiteIndex].state = state;
      }
    } else {
      if (state === "block") {
        disabledSites.push({ site: site, state: state });
      }
    }

    chrome.storage.local.set({ disabledSites: disabledSites });
  });
}

function getCurrentTab(callback) {
  chrome.tabs.query(
    {
      active: true,
      windowId: chrome.windows.WINDOW_ID_CURRENT,
    },
    function (tabs) {
      if (chrome.runtime.lastError) {
        window.setTimeout(() => getCurrentTab(callback), 100);
      } else if (tabs && tabs.length) {
        currentTab = tabs[0];
        callback();
      }
    },
  );
}

function updateCurrentState() {
  if (currentTab) {
    var url = currentTab.url;
    var incognito = currentTab.incognito;

    if (url) {
      var fileUrl = /^file:/.test(url);
      var newResourseName = url.match(extractHostname);

      if (fileUrl || (!!newResourseName && newResourseName[0]))
        chromeSettings.javascript.get(
          {
            primaryUrl: url,
            incognito: incognito,
          },
          function (data) {
            var state = data.setting;

            changeIconAs(actualState[state]);
          },
        );
      else changeIconAs(actualState["inactive"]);
    } else changeIconAs(actualState["inactive"]);
  }
}

function initialize() {
  getCurrentTab(updateCurrentState);
}

chrome.tabs.onActivated.addListener(initialize);

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status == "loading" && tab.selected) initialize();
});

chrome.windows.getCurrent(initialize);

function changeJSState() {
  if (currentTab) {
    var url = currentTab.url;
    var incognito = currentTab.incognito;

    if (url)
      chromeSettings.javascript.get(
        {
          primaryUrl: url,
          incognito: incognito,
        },
        function (data) {
          var state = data.setting;

          if (state) {
            var newState = state == "allow" ? "block" : "allow";
            var pattern = "";
            var unSupported = false;

            if (/^file:/.test(url)) {
              pattern = url;
              unSupported = true;
            } else {
              var newResourseName = url.match(extractHostname);
              pattern = !!newResourseName && newResourseName[0] + "/*";
            }

            if (pattern) {
              chromeSettings.javascript.set(
                {
                  primaryPattern: pattern,
                  setting: newState,
                  scope: incognito ? "incognito_session_only" : "regular",
                },
                function () {
                  changeIconAs(actualState[newState]);
                  chrome.tabs.reload(currentTab.id, { bypassCache: false });
                  updateSiteStateInStorage(pattern, newState);
                },
              );

              chrome.contextMenus.update("parent", {
                title: buttonTexts[actualState[newState]],
              });
            }
          }
        },
      );
  }
}

function toggleJS() {
  getCurrentTab(changeJSState);
}

chrome.action.onClicked.addListener(toggleJS);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "parent",
    title: "Toggle JavaScript",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "manage",
    title: "⚙️ Manage JS Disabled Sites",
    contexts: ["action"],
  });

  chrome.contextMenus.create({
    id: "support",
    title: "☕ Support my work! Donate",
    contexts: ["action"],
  });

  chrome.contextMenus.create({
    id: "rate",
    title: "💬 Share your feedback",
    contexts: ["action"],
  });

  chrome.storage.local.set({
    cmCreated: true,
    disabledSites: [],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "parent") {
    toggleJS();
  } else if (info.menuItemId === "support") {
    chrome.tabs.create({
      url: "https://www.buymeacoffee.com/manikandanramar",
    });
  } else if (info.menuItemId === "rate") {
    chrome.tabs.create({
      url: "https://chrome.google.com/webstore/detail/fopnmaooogcdcnofegdbcgfbgpkhgoae/reviews",
    });
  } else if (info.menuItemId === "manage") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("ui/disabled-sites.html"),
    });
  }
});
