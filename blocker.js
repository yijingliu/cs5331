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

    var my_fingerprint = "";
    Object.keys(response["fingerprint"]).forEach(function(key) {
      my_fingerprint += "<div class=\"fingerprint-details\"><div class=\"details-key\">" + key + " : </div><div class=\"details-value\">" + response["fingerprint"][key] + "</div></div>";
    });
    console.log(my_fingerprint);
    $("#my-fingerprint").html(my_fingerprint);
  });

  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
  	var tabId = tabs[0].id; 
  	if (tabId != null && tabId != undefined)
  	chrome.runtime.sendMessage({"request_type": "stats", "tab_id": tabId, }, function (response) {
  	  if (Object.keys(response).length > 0) {
  	  	if(response["result"] != undefined) {
  	      response = response["result"];
  	  	  appendDiv(response, "advertising");
  	  	  appendDiv(response, "site-analytics");
  	  	  appendDiv(response, "third-party-cookie");

  	  	  var numbers = response["numbers"];
  	  	  var dataset =[];
  	  	  
  	  	  dataset = [
		      { label: 'Advertising', count: numbers["advertising"] },
		      { label: 'Site Analytics', count: numbers["site-analytics"] },
		      { label: 'Others', count: numbers["total"] - numbers["advertising"] - numbers["site-analytics"] }
	      ];
  	  	  createChart(dataset, "#chart-one");

  	  	  dataset = [
		      { label: 'Cookie (3rd)', count: numbers["third-party-cookie"] },
		      { label: 'Others', count: numbers["total"] - numbers["third-party-cookie"] }
	      ];
  	  	  createChart(dataset, "#chart-two");
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
    document.getElementById(category + "-counter").innerHTML = response["numbers"][category];
  }
}




function createChart(numbers, selector) {
	(function(d3) {
	    'use strict';
	    var dataset = numbers

	    var width = 200;
	    var height = 200;
	    var radius = Math.min(width, height) / 2;

	    var color = d3.scaleOrdinal(d3.schemeCategory20c);
	    var donutWidth = 40;
		
	    var svg = d3.select(selector)
	      .append('svg')
	      .attr('width', width)
	      .attr('height', height)
	      .append('g')
	      .attr('transform', 'translate(' + (width / 2) +
	        ',' + (height / 2) + ')');

		var arc = d3.arc().innerRadius(radius - donutWidth).outerRadius(radius);

	    var pie = d3.pie()
	      .value(function(d) { return d.count; })
	      .sort(null);	  

	    var path = svg.selectAll('path')
	      .data(pie(dataset))
	      .enter()
	      .append('path')
	      .attr('d', arc)
	      .attr('fill', function(d) {
	        return color(d.data.label);
	      });

	    
	    var legendRectSize = 12;
		var legendSpacing = 4;	  
		var legend = svg.selectAll('.legend')
		.data(color.domain())
		.enter()
		.append('g')
		.attr('class', 'legend')
		.attr('transform', function(d,i) {
		var height = legendRectSize + legendSpacing;
		var offset = height * color.domain().length/2;
		var horz = -3 * legendRectSize;
		var vert = i * height - offset;
		return 'translate(' + horz + ',' + vert + ')';
		});
		
		legend.append('rect')
		.attr('width', legendRectSize)
		.attr('height', legendRectSize)
		.style('fill', color)
		.style('stroke', color);

		legend.append('text')
		.attr('x', legendRectSize + legendSpacing)
		.attr('y', legendRectSize - legendSpacing)
		.text(function(d) { return d; }); 
		
	  })(window.d3);
}
