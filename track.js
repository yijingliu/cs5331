"use strict";

window.onbeforeunload = function() {
  console.log("Tab is refreshed! ");
  if (chrome.runtime !== undefined && chrome.runtime !== null) {
    chrome.runtime.sendMessage({request_type: "refresh"}, function (response) {
      console.log(response);
    });
  }
};