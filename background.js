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

/**
chrome.webRequest.onBeforeRequest.addListener(function(details) {
  console.log(details);
}, {urls: ["<all_urls>"]}, ["blocking"]);
**/

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
  console.log(details);

  // block javascript tracking
  var target = extractHostname(details.url);
  if (target.includes("google-analytics")) {
    console.log("block js tracking : " + target);
    return {cancel: true};
  }

  // remove third party cookie
  if (details.tabId > -1) {
    chrome.tabs.get(details.tabId, function (tab) {
      var initiator = extractHostname(tab.url);
      var target = extractHostname(details.url);
      if (!sameRootDomain(initiator, target)) {
        console.log("remove third party cookie : " + initiator + " -> " + target);
        for (var i = 0; i < details.requestHeaders.length; ++i) {
          if (details.requestHeaders[i].name === "Cookie") {
            details.requestHeaders.splice(i, 1);
            break;
          }
        }
      }
    });
  } 

  // block request without origin
  if (details.tabId < 0) {
    console.log("block non-origin request : " + target);
    return {cancel: true};
  }


  return {requestHeaders: details.requestHeaders};
}, {urls: ["<all_urls>"]}, ["blocking", "requestHeaders"]);




// TO DO - a more detailed comparison basing on root domain
function sameRootDomain(initiator, target) {
  if (target.includes(initiator)) {
    return true; 
  }

  var initiatorArray = initiator.split(".");
  var targetArray = target.split(".");
  
  var match = [];
  for (var i = 1; i < initiatorArray.length; i++) {
    var ele = initiatorArray[i];
    if (targetArray.indexOf(ele) > -1) {
      match.push(i);
    }
  }
  if (match.length == initiatorArray.length - 1) {
    return true;
  } 

  return false;
}

function extractHostname(url) {
  url = new URL(url);
  return url.hostname;
}