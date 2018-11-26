"use strict";

window.onbeforeunload = function() {
  console.log("Tab is refreshed! ");
  chrome.runtime.sendMessage({request_type: "refresh"}, function (response) {
    console.log(response);
  });
};