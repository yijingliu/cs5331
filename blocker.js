"use strict";

$(document).ready(function() {
  chrome.runtime.sendMessage({request_type: "init"}, function (response) {
    console.log(response);
    $("#advertising").prop("checked", response["user_selections"]["advertising"]);
    $("#site-analytics").prop("checked", response["user_selections"]["site-analytics"]);
    $("#third-party-cookie").prop("checked", response["user_selections"]["third-party-cookie"]);
    $("#user-agent").prop("checked", response["user_selections"]["browser-fingerprint"]["user-agent"]);
    $("#content-language").prop("checked", response["user_selections"]["browser-fingerprint"]["content-language"]);
    $("#timestamp").prop("checked", response["user_selections"]["browser-fingerprint"]["timestamp"]);
    if (response["user_selections"]["browser-fingerprint"]["user-agent"] 
      && response["user_selections"]["browser-fingerprint"]["content-language"] 
      && response["user_selections"]["browser-fingerprint"]["timestamp"]) {
      $("#browser-fingerprint").prop("checked", true);
    }
  });

  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
  	var tabId = tabs[0].id; 
  	if (tabId != null && tabId != undefined)
  	chrome.runtime.sendMessage({"request_type": "stats", "tab_id": tabId, }, function (response) {
  	  if (Object.keys(response).length > 0) {
  	  	if(response["result"] != undefined) {
  	      response = response["result"];
  	      console.log(response["numbers"]);
  	  	  appendDiv(response, "advertising");
  	  	  appendDiv(response, "site-analytics");
  	  	  appendDiv(response, "third-party-cookie");
  	  	}
  	  }
    });
  });

});

$(document).on("click", ".blocker-title-label", function() {
  $(this).parent(".blocker-title").next(".blocker-details").toggle();
});

$(document).on("click", "#browser-fingerprint", function() {
  var checked = $(this).prop("checked");
  $("#user-agent").prop("checked", checked);
  $("#content-language").prop("checked", checked);
  $("#timestamp").prop("checked", checked);
});

$(document).on("change", "input", function() {
  var message = {}; 
  message["advertising"] = $("#advertising").prop("checked");
  message["site-analytics"] = $("#site-analytics").prop("checked");
  message["third-party-cookie"] = $("#third-party-cookie").prop("checked");
  message["browser-fingerprint"] = {
      "user-agent": $("#user-agent").prop("checked"),
      "content-language": $("#content-language").prop("checked"), 
      "timestamp": $("#timestamp").prop("checked")
  }

  chrome.runtime.sendMessage({
    "request_type": "update",
    "updates": message}, function (response) {
    console.log(response);
  });
});

function appendDiv(response, category) {
  if (response[category] != undefined) {
    $.each(response[category], function(key, value) {
      var record = document.createElement("div"); 
      record.className = "blocker-details-record";
      var text = "<div class=\"blocker-details-tracker\">" + key + "</div>";
      text = text + "<div class=\"blocker-details-counter\">" + value.counter + "</div>" 
      text = text + "<span class=\"blocker-details-tooltip\">";
      text = text + value.urls.join("<br/>");
      text = text +  "</div>"; 
      record.innerHTML = text;
      document.getElementById(category + "-details").appendChild(record);
    });
    document.getElementById(category + "-counter").innerHTML = response["numbers"][category] == undefined ? 0 : response["numbers"][category];
  }
}
