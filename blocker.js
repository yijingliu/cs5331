"use strict";

$(document).ready(function() {
  chrome.runtime.sendMessage({request_type: "init"}, function (response) {
    console.log("Init from background");
    console.log(response);

  	$("#advertising").prop('checked', response["user_selections"]["advertising"]);
  	$("#site-analytics").prop('checked', response["user_selections"]["site-analytics"]);
  	$("#third-party-cookie").prop('checked', response["user_selections"]["third-party-cookie"]);
  	$("#user-agent").prop('checked', response["user_selections"]["browser-fingerprint"]["user-agent"]);
  	$("#content-language").prop('checked', response["user_selections"]["browser-fingerprint"]["content-language"]);
  	$("#timestamp").prop('checked', response["user_selections"]["browser-fingerprint"]["timestamp"]);
  	if (response["user_selections"]["browser-fingerprint"]["user-agent"] 
      && response["user_selections"]["browser-fingerprint"]["content-language"] 
      && response["user_selections"]["browser-fingerprint"]["timestamp"]) {
  	  $("#browser-fingerprint").prop('checked', true);
  	}
  });
});

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

  chrome.runtime.sendMessage({
    "request_type": "update",
    "updates": message}, function (response) {
    console.log(response);
  });
});

$(document).on("click", "#browser-fingerprint", function() {
  var checked = $(this).prop('checked');
  $('#user-agent').prop('checked', checked);
  $('#content-language').prop('checked', checked);
  $('#timestamp').prop('checked', checked);
});

