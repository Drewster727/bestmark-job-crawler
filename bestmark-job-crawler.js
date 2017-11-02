var system = require('system');
var fs = require('fs');

var VERBOSE = false;
var loadInProgress = false;
var url = "https://www.bestmark.com/shoppers/"

var settings = {
	username:'',
	password:'',
	bestmarkJobsUrl: "https://www.bestmark.com/shoppers/dispatches/FindOpenShops_Ajax.aspx?Action=Search&ShopperID=MO25684&ZipCode=64108&Radius=20&WebApproved=1&ReferralName=&Venue=&DateRange=10%2F31%2F2017+-+11%2F30%2F2017&SearchCount=1",
	venues: ['Ups Rest', 'Restaurant', 'Salon', 'Upscale', 'Retail'],
	zipcode: '64108',
	radius: 20,
	days: 30
}

var page = require('webpage').create();
//page.settings.userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36';

page.onConsoleMessage = function(msg) {
    if (!VERBOSE) { return; }
    console.log(msg);
};

page.onError = function(msg, trace) {
    if (!VERBOSE) { return; }
    console.error('Error on page: ' + msg);
}

page.onCallback = function(query, msg) {
    if (query == 'username') { return settings.username; }
    if (query == 'password') { return settings.password; }
    if (query == 'fireClick') {
        return function() { return fireClick; } // @todo:david DON'T KNOW WHY THIS DOESN'T WORK! :( Just returns [Object object])
    }
    if (query == 'report-jobs') {
        if (VERBOSE) { console.log('Found the following jobs: ' + msg); }
        else { 
			//console.log(msg);
			var path = '/output.txt';
			var content = msg;
			fs.write(path, content, 'w');
		}
		phantom.exit();
    }
    if (query == 'fatal-error') {
        console.log('Fatal error: ' + msg);
        phantom.exit();
    }
    return null;
}

page.onLoadStarted = function() { loadInProgress = true; };
page.onLoadFinished = function() { loadInProgress = false; };
page.open(url);
var steps = [
    function() { // Log in
        page.evaluate(function() {
		   console.log('On BESTMARK login page...');
            document.querySelector('input[name=ShopperID]').value = window.callPhantom('username');
            document.querySelector('input[name=Password]').value = window.callPhantom('password');
            document.querySelector('form[name=frmLogin]').submit();
        });
    }//,
    // function() { // dashboard
        // page.evaluate(function() {
			// function fireClick(el) {
				// var ev = document.createEvent("MouseEvents");
				// ev.initEvent("click", true, true);
				// el.dispatchEvent(ev);
			// }
			
			// var $inMyAreaBtn = document.querySelector('a[href="/shoppers/dispatches/FindOpenShops.aspx"]');
			// if (!$inMyAreaBtn) {
				// console.log('Unable to find \'In My Area\' button');
				// return;
			// }
			// fireClick($inMyAreaBtn);
        // });
    // }
];

var i = 0;
interval = setInterval(function() {
    if (loadInProgress) { return; } // not ready yet...
    if (!steps[i] || typeof steps[i] != "function") {
        //return phantom.exit();
		final();
		clearInterval(interval);
		return;
    }

    steps[i]();
    i++;

}, 300);

var final = function() {
	console.log('Requesting available jobs...');
	
	page.onConsoleMessage = function(msg) {
	  if (msg == "EXIT") {
		  phantom.exit();
	  }
	  console.log(msg);
	};
	
	page.open(settings.bestmarkJobsUrl, function() {
	  page.includeJs("https://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
		page.evaluate(function() {
			
			var getJobs = function (data) {
				var myRows = [];
				var headersText = [];
				var $headers = $("th", data);

				// Loop through grabbing everything
				var $rows = $("tr[onclick]", data).each(function(index) {
				  $cells = $(this).find("td");
				  myRows[index] = {};
				  
				  $cells.each(function(cellIndex) {
					// Set the header text
					if(headersText[cellIndex] === undefined) {
					  headersText[cellIndex] = $($headers[cellIndex]).text();
					}
					// Update the row object with the header/cell combo
					myRows[index][headersText[cellIndex]] = $(this).text();
				  });    
				});

				// Let's put this in the object like you want and convert to JSON (Note: jQuery will also do this for you on the Ajax request)
				var jobs = {
					"jobs": myRows
				};
				var j = JSON.stringify(jobs);
				window.callPhantom('report-jobs', j);
			}
		
			$.ajax({
				method: 'GET',
				url: window.location.href,
				success: getJobs,
				error: function () {
				  console.log('EXIT');
			   }
			});
		});
	  });
	});
};
	

