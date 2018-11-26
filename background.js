"use strict";

var ADVERTISING = "advertising",
    SITE_ANALYTICS = "site-analytics",
    THIRD_PARTY = "third-party-cookie",
    FINGERPRINT = "browser-fingerprint",
    USER_AGENT = "user-agent",
    CONTENT_LANG = "content-language",
    ORIGIN = "origin";

var USER_SELECTIONS = {
  "advertising": false,
  "site-analytics": false,
  "third-party-cookie": false,
  "browser-fingerprint": {
    "user-agent": false,
    "content-language": false,
    "origin": false
  }
};

var BLOCKING_DETAILS = {},
    STATS = {},
    MY_FINGERPRINT = {},
    BLOCKED_REQUESTS = {},
    TAB_FIRST_TIME = {};

var MAX_LENGTH = 1000;

$(document).ready(function() {
  fetch("trackers/json/advertising.json")
    .then(response => response.json())
    .then(json => initJson(json, ADVERTISING));

  fetch("trackers/json/site_analytics.json")
    .then(response => response.json())
    .then(json => initJson(json, SITE_ANALYTICS));


  // MY_FINGERPRINT["codeName"] = navigator.appCodeName;
  // MY_FINGERPRINT["browserName"] = navigator.appName;
  // MY_FINGERPRINT["browserVersion"] = navigator.appVersion;
  MY_FINGERPRINT["cookie"] = navigator.cookieEnabled ? "enabled" : "disabled";
  // MY_FINGERPRINT["doNotTrack"] = navigator.doNotTrack;
  MY_FINGERPRINT["language"] = navigator.language;
  MY_FINGERPRINT["timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;

  var resolution = "";
  resolution += window.screen.width + "x" + window.screen.height + "x" + window.screen.colorDepth;
  MY_FINGERPRINT["resolution"] = resolution;
  
  var plugins_names = "";
  for (var i=0;i<navigator.plugins.length;i++) {
    plugins_names += navigator.plugins[i].name + ";";
  }
  MY_FINGERPRINT["plugins"] = plugins_names;

  MY_FINGERPRINT["platform"] = navigator.platform;
  MY_FINGERPRINT["user-agent"] = navigator.userAgent;
});

function initJson(json, category) {
  if (!(category in BLOCKING_DETAILS)) {
    BLOCKING_DETAILS[category] = {};
  }

  for (var i=0; i<json.length;i++) {
    var tracker = json[i].tracker;
    var urls = json[i].tracker_url;

    for (var j=0; j<urls.length;j++) {
      var k = urls[j].split(".")[0];
      BLOCKING_DETAILS[category][k] = tracker;
    }
  }
}

chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {urlMatches: "(?:[^/]*\\.)*"},
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

// chrome.webRequest.onSendHeaders.addListener(function(details) {
//     console.log("### send request: ");
//     console.log(details);
// }, {urls: ["<all_urls>"]}, ["requestHeaders"]);

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
  var need_to_block = USER_SELECTIONS[ADVERTISING] || USER_SELECTIONS[SITE_ANALYTICS];
  var need_to_filter = USER_SELECTIONS[THIRD_PARTY] || USER_SELECTIONS[FINGERPRINT][USER_AGENT]
  || USER_SELECTIONS[FINGERPRINT][CONTENT_LANG] || USER_SELECTIONS[FINGERPRINT][ORIGIN];

  var ret = {requestHeaders: details.requestHeaders};
  var original_req = $.extend(true, {}, details);

  var tab_id = details.tabId;
  var target = extractHostname(details.url);
  if (psl.parse(target).domain == null) {
    console.log("### Domain is null: " + target);
  }
  var toDomain = psl.parse(target).domain.split(".")[0];

  if (!(tab_id in STATS)) {
    STATS[tab_id] = {"numbers": {"total": 0}};
    STATS[tab_id]["numbers"][ADVERTISING] = 0;
    STATS[tab_id]["numbers"][SITE_ANALYTICS] = 0;
    STATS[tab_id]["numbers"][THIRD_PARTY] = 0;
  }
  STATS[tab_id]["numbers"]["total"]++;
  Object.keys(BLOCKING_DETAILS).forEach(function(key) {
    var tracker = BLOCKING_DETAILS[key][toDomain];
    updateStats(tab_id, key, tracker, target);
  });

  // remove third party cookie
  var is_third_party = false;
  if (details.tabId == -1) {
    is_third_party = true;
  } else {
    var initiator = "";
    try {
      chrome.tabs.get(details.tabId, function (tab) {
        if (tab == null) {
          return;
        }
        var tab_url = tab.url;
        initiator = extractHostname(tab_url);
      });
    } catch (e) {
      console.log("Tab does not exist.")
    }

    var is_first_time = false;
    if (initiator === "") {
      if (details.initiator == null) {
        initiator = "www.cs5331_g1.com";
        if (!(tab_id in TAB_FIRST_TIME)) {
          is_first_time = true;
        }
      } else {
        initiator = details.initiator.split("//")[1];
      }
    }
    var fromDomain = psl.parse(initiator).domain;
    if (fromDomain == null) {
      fromDomain = "cs5331_g1";
      if (!(tab_id in TAB_FIRST_TIME)) {
        is_first_time = true;
      }
    } else {
      fromDomain = fromDomain.split(".")[0];
    }
    
    console.log("### fromDomain: " + fromDomain + " ### toDomain: " + toDomain);
    if (fromDomain !== toDomain) {
      if (is_first_time === true) {
        console.log("First time thirdparty");
        TAB_FIRST_TIME[tab_id] = true;
      } else {
        is_third_party = true;
        updateStats(tab_id, THIRD_PARTY, toDomain, target);
      }
    }
  }

  if (!need_to_block && !need_to_filter) {
    return ret;
  }

  // block javascript tracking
  if (need_to_block) {
    if (USER_SELECTIONS[ADVERTISING] && toDomain in BLOCKING_DETAILS[ADVERTISING])
    {
      if (!(tab_id in BLOCKED_REQUESTS)) {
        BLOCKED_REQUESTS[tab_id] = {};
      }
      if (!(ADVERTISING in BLOCKED_REQUESTS[tab_id])) {
        BLOCKED_REQUESTS[tab_id][ADVERTISING] = [];
      }

      if (BLOCKED_REQUESTS[tab_id][ADVERTISING].length < MAX_LENGTH) {
        BLOCKED_REQUESTS[tab_id][ADVERTISING].push(original_req);
      }

      return {cancel: true};
    } else if (USER_SELECTIONS[SITE_ANALYTICS] && toDomain in BLOCKING_DETAILS[SITE_ANALYTICS])
    {
      if (!(tab_id in BLOCKED_REQUESTS)) {
        BLOCKED_REQUESTS[tab_id] = {};
      }
      if (!(SITE_ANALYTICS in BLOCKED_REQUESTS[tab_id])) {
        BLOCKED_REQUESTS[tab_id][SITE_ANALYTICS] = [];
      }

      if (BLOCKED_REQUESTS[tab_id][SITE_ANALYTICS].length < MAX_LENGTH) {
        BLOCKED_REQUESTS[tab_id][SITE_ANALYTICS].push(original_req);
      }

      return {cancel: true};
    }
  }

  if (need_to_filter) {
    console.log("### Begin to remove third party cookie");

    var is_updated = false;
    var contains_cookie = false;
    for (var i = 0; i < details.requestHeaders.length;) {
      if (details.requestHeaders[i].name === "Cookie" && USER_SELECTIONS[THIRD_PARTY] === true && is_third_party) {
        console.log("removing header cookie")
        details.requestHeaders.splice(i, 1);
        contains_cookie = true;
        continue;
      }
      if (details.requestHeaders[i].name === "User-Agent" && USER_SELECTIONS[FINGERPRINT][USER_AGENT] === true) {
        console.log("removing header user agent");
        details.requestHeaders.splice(i, 1);
        is_updated = true;
        continue;
      }
      if (details.requestHeaders[i].name === "Accept-Language" && USER_SELECTIONS[FINGERPRINT][CONTENT_LANG] === true) {
        console.log("removing header accept language");
        details.requestHeaders.splice(i, 1);
        is_updated = true;
        continue;
      }
      if (details.requestHeaders[i].name === "Origin" && USER_SELECTIONS[FINGERPRINT][ORIGIN] === true) {
        console.log("removing header origin");
        details.requestHeaders.splice(i, 1);
        is_updated = true;
        continue;
      }
      i++;
    }

    if (contains_cookie === true) {
      if (!(tab_id in BLOCKED_REQUESTS)) {
        BLOCKED_REQUESTS[tab_id] = {};
      }
      if (!(THIRD_PARTY in BLOCKED_REQUESTS[tab_id])) {
        BLOCKED_REQUESTS[tab_id][THIRD_PARTY] = [];
      }

      if (BLOCKED_REQUESTS[tab_id][THIRD_PARTY].length < MAX_LENGTH) {
        var temp_entry = {
          "original": original_req,
          "updated": $.extend(true, {}, details)
        }
        BLOCKED_REQUESTS[tab_id][THIRD_PARTY].push(temp_entry);
      }
    }
    else if (is_updated === true) {
      if (!(tab_id in BLOCKED_REQUESTS)) {
        BLOCKED_REQUESTS[tab_id] = {};
      }
      if (!(FINGERPRINT in BLOCKED_REQUESTS[tab_id])) {
        BLOCKED_REQUESTS[tab_id][FINGERPRINT] = [];
      }

      if (BLOCKED_REQUESTS[tab_id][FINGERPRINT].length < MAX_LENGTH) {
        var temp_entry = {
          "original": original_req,
          "updated": $.extend(true, {}, details)
        }
        BLOCKED_REQUESTS[tab_id][FINGERPRINT].push(temp_entry);
      }
    }

    console.log("### Finish removing.");
  }

  return ret;
}, {urls: ["<all_urls>"]}, ["blocking", "requestHeaders"]);


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.request_type == "init") {
      console.log("Initiation request");
      var resp = {
        user_selections: userSelections(),
        fingerprint: MY_FINGERPRINT
      };

      sendResponse(resp);
    } else if (request.request_type == "update") {
      console.log("Update request");
      var user_selections = request.updates;
      sendResponse({result: userSelections(user_selections)});
    } else if (request.request_type == "stats") {
      var stats = {};
      var tab_id = request.tab_id;
      console.log("### Tab id is: " + tab_id + " and STATS are: ");
      console.log(STATS);
      if (tab_id in STATS) {
        stats = STATS[request.tab_id];
      }
      if (tab_id in BLOCKED_REQUESTS) {
        stats["blocked"] = BLOCKED_REQUESTS[tab_id];
      }
      sendResponse({result: stats});
    } else if (request.request_type == "refresh") {
      console.log("### Tab id is: " + sender.tab.id );
      refreshStats(sender.tab.id);
      sendResponse({result: "refreshed"});
    } 
});

chrome.tabs.onUpdated.addListener(function(tabId,changeInfo,tab){
  if (changeInfo.url === undefined) {
    console.log("Tab " + tabId + " refreshed!");
  }
});

function refreshStats(tabId) {
  STATS[tabId] = {"numbers": {"total": 0}};
  STATS[tabId]["numbers"][ADVERTISING] = 0;
  STATS[tabId]["numbers"][SITE_ANALYTICS] = 0;
  STATS[tabId]["numbers"][THIRD_PARTY] = 0;
  BLOCKED_REQUESTS[tabId] = {};
  delete TAB_FIRST_TIME[tabId];
}

function extractHostname(url) {
  url = new URL(url);
  return url.hostname;
}

function userSelections(selections = {}) {
  var count = Object.keys(selections).length;

  if (count === 0) {
    return USER_SELECTIONS;
  } else {
    USER_SELECTIONS = selections;
    return "Success";
  }
}

function updateStats(tab_id, key, tracker, target) {
  if (tracker === undefined || tracker === null) {
    return;
  }

  if (tab_id in STATS) {
    if (key in STATS[tab_id]) {
      if (tracker in STATS[tab_id][key]) {
        STATS[tab_id][key][tracker]["counter"]++;
        if (!STATS[tab_id][key][tracker]["urls"].includes(target)) {
          STATS[tab_id][key][tracker]["urls"].push(target);
        }
      } else {
        STATS[tab_id][key][tracker] = {
          counter: 1,
          urls: [target]
        };
      }
    } else {
      STATS[tab_id][key] = {};
      STATS[tab_id][key][tracker] = {
        counter: 1,
        urls: [target]
      };
    }
  } else {
    STATS[tab_id] = {"numbers": {"total": 0}};
    STATS[tab_id]["numbers"][ADVERTISING] = 0;
    STATS[tab_id]["numbers"][SITE_ANALYTICS] = 0;
    STATS[tab_id]["numbers"][THIRD_PARTY] = 0;
    STATS[tab_id][key] = {};
    STATS[tab_id][key][tracker] = {
      counter: 1,
      urls: [target]
    };
  }

  STATS[tab_id]["numbers"][key]++;
}