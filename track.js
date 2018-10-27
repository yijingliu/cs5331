"use strict";

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender);
    console.log(request.track);
    sendResponse({farewell: "bye"});
  }
);
