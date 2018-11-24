"use strict";

var ADVERTISING = "advertising",
    SITE_ANALYTICS = "site-analytics",
    THIRD_PARTY = "third-party-cookie",
    FINGERPRINT = "browser-fingerprint",
    USER_AGENT = "user-agent",
    CONTENT_LANG = "content-language",
    TIMEZONE = "timestamp";

var USER_SELECTIONS = {
  "advertising": false,
  "site-analytics": false,
  "third-party-cookie": false,
  "browser-fingerprint": {
    "user-agent": false,
    "content-language": false,
    "timestamp": false
  }
};

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

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
  console.log("Details: ");
  console.log(details);

  var need_to_block = USER_SELECTIONS[ADVERTISING] || USER_SELECTIONS[SITE_ANALYTICS];
  var need_to_filter = USER_SELECTIONS[THIRD_PARTY] || USER_SELECTIONS[FINGERPRINT][USER_AGENT]
  || USER_SELECTIONS[FINGERPRINT][CONTENT_LANG] || USER_SELECTIONS[FINGERPRINT][TIMEZONE];

  var ret = {requestHeaders: details.requestHeaders};

  if (!need_to_block && !need_to_filter) {
    return ret;
  }

  // block javascript tracking
  if (need_to_block) {
    return {cancel: true};
  }

  // remove third party cookie
  var is_third_party = false;
  if (details.tabId == -1) {
    is_third_party = true;
  } else {
    try {
      chrome.tabs.get(details.tabId, function (tab) {
        var tab_url = tab.url;

        var initiator = extractHostname(tab_url);
        var target = extractHostname(details.url);

        var fromDomain = psl.parse(initiator).domain;
        if (fromDomain === null || fromDomain == undefined) {
          fromDomain = "cs5331_g1";
        } else {
          fromDomain = fromDomain.split(".")[0];
        }
        var toDomain = psl.parse(target).domain.split(".")[0];
        console.log("### fromDomain: " + fromDomain + " ### toDomain: " + toDomain);
        if (fromDomain !== toDomain) {
          is_third_party = true;
        }
      })
    } catch (e) {
      console.log("Tab does not exist.")
    }
  }

  if (is_third_party && need_to_filter) {
    console.log("### Begin to remove third party cookie");

    var idxToRemove = [];
    for (var i = 0; i < details.requestHeaders.length;) {
      if (details.requestHeaders[i].name === "Cookie" && USER_SELECTIONS[THIRD_PARTY] === true) {
        console.log("removing header cookie")
        details.requestHeaders.splice(i, 1);
        continue;
      }
      if (details.requestHeaders[i].name === "User-Agent" && USER_SELECTIONS[USER_AGENT] === true) {
        console.log("removing header user agent");
        details.requestHeaders.splice(i, 1);
        continue;
      }
      if (details.requestHeaders[i].name === "Accept-Language" && USER_SELECTIONS[CONTENT_LANG] === true) {
        console.log("removing header accept language");
        details.requestHeaders.splice(i, 1);
        continue;
      }
      i++;
    }

    details.timeStamp = Math.round((new Date("1998-11-11T00:00:00")).getTime() / 1000);
    console.log("### Finish removing.");

    if (USER_SELECTIONS[TIMEZONE] === true) {
      ret["timeStamp"] = details.timeStamp;
    }
  }

  return ret;
}, {urls: ["<all_urls>"]}, ["blocking", "requestHeaders"]);


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.request_type == "init") {
      console.log("Initiation request");
      var user_selections = userSelections();
      sendResponse({user_selections: user_selections});
    } else if (request.request_type == "update") {
      console.log("Update request");
      var user_selections = request.updates;
      sendResponse({result: userSelections(user_selections)});
    }
});


chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.request_type == "init") {
      console.log("Initiation request");
      var user_selections = userSelections();
      sendResponse({user_selections: user_selections});
    } else if (request.request_type == "update") {
      console.log("Update request");
      var user_selections = request.updates;
      sendResponse({result: userSelections(user_selections)});
    }
});

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
    console.log(USER_SELECTIONS);
    return "Success";
  }
}