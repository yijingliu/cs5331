"use strict";

$(document).on("change", "#track-request", function() {
  var message = {track: this.checked}; 

  // one-time communication
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
      console.log(response.farewell);
    });
  });

  
});
