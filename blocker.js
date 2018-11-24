"use strict";

$(document).on("click", ".blocker-title", function() {
  $(this).next(".blocker-details").toggle();
});

$(document).on("change", "input", function() {
  var message = {}; 
  message["advertising"] = $("#advertising").prop('checked');
  message["site-analytics"] = $("#site-analytics").prop('checked');
  message["third-party-cookie"] = $("#third-party-cookie").prop('checked');
  message["browser-fingerprint"] = {
      "user-agent": $("#user-agent").prop('checked'),
      "content-language": $("#content-language").prop('checked'), 
      "timestamp": $("#timestamp").prop('checked')
  }

  chrome.runtime.sendMessage(message, function (response) {
  	console.log(response);
  });

  chrome.extension.sendRequest({
    "request_type": "update", 
    "updates": JSON.stringify(message)}, function(response) {
      console.log(response);
    });
});

$(document).on("click", "#browser-fingerprint", function() {
  var checked = $(this).prop('checked');
  $('#user-agent').prop('checked', checked);
  $('#content-language').prop('checked', checked);
  $('#timestamp').prop('checked', checked);
});

