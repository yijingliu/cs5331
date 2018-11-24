"use strict";

// Object.defineProperty(navigator, 'userAgent', {
//     get: function () { return 'Mozilla/5.0 (Windows NT 6.2; WOW64; rv:28.0) Gecko/20100101 Firefox/28.0)'; }
// });


navigator.__defineGetter__('userAgent', function () {
    return "Mozilla/5.0 (Windows NT 6.2; WOW64; rv:28.0) Gecko/20100101 Firefox/28.0)";
});
navigator.__defineGetter__('appName', function () {
    return "Netscape";
});

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
  console.log("Details: ");
  console.log(details);

  // block javascript tracking
  var target = extractHostname(details.url);
  if (target.includes("google-analytics")) {
    console.log("block js tracking : " + target);
    return {cancel: true};
  }

  // remove third party cookie
  if (details.hasOwnProperty("tabId") && details.tabId > -1) {
    try {
      chrome.tabs.get(details.tabId, function (tab) {
        var tab_url = "www.cs5331_1.com";
        if (tab === null || tab === undefined) {
          console.log("tab is undefined");
        } else {
          tab_url = tab.url;
        }

        var initiator = extractHostname(tab_url);
        var target = extractHostname(details.url);

        var fromDomain = psl.parse(initiator).domain;
        if (fromDomain === null) {
          fromDomain === "";
        } else {
          fromDomain = fromDomain.split(".")[0];
        }
        var toDomain = psl.parse(target).domain.split(".")[0];
        console.log("### fromDomain: ");
        console.log(fromDomain);
        console.log("### toDomain: ");
        console.log(toDomain);

        if (!sameRootDomain(initiator, target)) {
          console.log("remove third party cookie : " + initiator + " -> " + target);

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
        }
      })
    } catch (e) {
      console.log("Tab does not exists");
      console.log(e);
    }
  } 

  // block request without origin
  // if (details.tabId < 0) {
  //   console.log("block non-origin request : " + target);
  //   return {cancel: true};
  // }

  console.log("Updated details: ");
  console.log(details);

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