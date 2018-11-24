"use strict";

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

  // TODO: use value from extension GUI 
  var need_to_block = false;
  var need_to_filter = true;  // TODO: change to false

  if (!need_to_block && !need_to_filter) {
    return {requestHeaders: details.requestHeaders};
  }

  // block javascript tracking
  if (need_to_block) {
    return {cancel: true};
  }

  // TODO: remove?
  // var target = extractHostname(details.url);
  // if (target.includes("google-analytics")) {
  //   console.log("block js tracking : " + target);
  //   return {cancel: true};
  // }

  // remove third party cookie
  var is_third_party = false;
  if (details.tabId == -1) {
    is_third_party = true;
  } else {
    chrome.tabs.get(details.tabId, function (tab) {
      var tab_url = "www.cs5331_g1.com";
      if (tab === null || tab === undefined) {
        console.log("tab is undefined");
      } else {
        tab_url = tab.url;
      }

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
  }

  if (is_third_party && need_to_filter) {
    console.log("### Begin to remove third party cookie");

    var idxToRemove = [];
    for (var i = 0; i < details.requestHeaders.length;) {
      if (details.requestHeaders[i].name === "Cookie") {
        console.log("removing header cookie")
        details.requestHeaders.splice(i, 1);
        continue;
      }
      if (details.requestHeaders[i].name === "User-Agent") {
        console.log("removing header user agent");
        details.requestHeaders.splice(i, 1);
        continue;
      }
      if (details.requestHeaders[i].name === "Accept-Language") {
        console.log("removing header accept language");
        details.requestHeaders.splice(i, 1);
        continue;
      }
      i++;
    }

    details.timeStamp = Math.round((new Date("1998-11-11T00:00:00")).getTime() / 1000);
    console.log("### Finish removing.");
  }

  return {requestHeaders: details.requestHeaders};
}, {urls: ["<all_urls>"]}, ["blocking", "requestHeaders"]);


function extractHostname(url) {
  url = new URL(url);
  return url.hostname;
}