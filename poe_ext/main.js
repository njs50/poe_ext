var timer = null;
var currentItems = null;
var postThrottle = null;

$(document).ready(function () {

	$('#spinner').hide();
	
	getVersion(function (version){
		$('#version').html("Version: " + version);
	});
	

	postThrottle = new Throttle(15, 60000);

	var dbOpenPromise = $.indexedDB("poe_plus");

	

	dbOpenPromise.done(function(db, event){
		// load list of chars from server (or cache)
		getChars();
	});


	
});


$('#refresh').click(function () {

	// clear all stored data
	resetCache(function(){

		// store charname before we reset list of chars
		var charName = $('#charDropDown').val();

		getChars(function(){

			// reset charName and make sure it still exists
			charName = $('#charDropDown').val(charName).val();

			if (charName != '') {
				poll(charName, false);
			}

		});

	});


});


function resetCache(callback) {

	var objectStore = $.indexedDB("poe_plus").objectStore("cache", true);

	var promise = objectStore.clear();

	promise.done(function(result, event){
	    if(jQuery.isFunction(callback)) callback();
	});

	promise.fail(function(error, event){
		console.log('Error clearing cache DB');
		console.log(error);
	});	
	
}



function getCache(cacheName) {

	var deferred = new $.Deferred();

	var objectStore = $.indexedDB("poe_plus").objectStore("cache", 0);
	var promise = objectStore.get(cacheName);

	promise.done(function(result, event){
	    if (typeof result == 'undefined'){
	    	deferred.reject();
	    } else {
	    	deferred.resolve(result);
	    }
	});

	promise.fail(function(error, event){
		console.log('Error getting object from cache');
		console.log(error);
		deferred.reject();
	});		

	return deferred.promise();

}

function setCache(cacheName,value) {
	var objectStore = $.indexedDB("poe_plus").objectStore("cache", true);
	var promise = objectStore.put(value,cacheName);

	promise.fail(function(error, event){
		console.log('Error putting object into cache');
		console.log(error);		
	});		
	
}


function getChars(callback) {
	
	
	getCache('chars')

		.done(function(oChars) {			
			setDropdown(oChars);
			if(jQuery.isFunction(callback)) callback();
		})

		.fail(function(){

			$.post(getEndpoint('get-characters'))

				.done(function (charResp) {
					
					if (charResp == null || charResp.error != undefined) {
						showCharError();
						return;
					}

					setCache('chars',charResp);

					setDropdown(charResp);
					if(jQuery.isFunction(callback)) callback();

				})

				.fail(function () {
					showCharError();
				})
			;
		})
	;

}


function getVersion(callback) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', 'manifest.json');
    xmlhttp.onload = function (e) {
        var manifest = JSON.parse(xmlhttp.responseText);
        callback(manifest.version);
    }
    xmlhttp.send(null);
}

//constructor for a new throttle instance
function Throttle(callsPerPeriod, periodDuration) {
	
	var self = this;
	this.maxCalls = callsPerPeriod;
	this.period = periodDuration;
	
	this.callCount = 0;
	
	this.delayQueue = [];
	
	$('#waitOnQueue').html("Que: " + self.delayQueue.length + "/" + (self.maxCalls-self.callCount));
	
	//function polled by the delay timer
	this.delayPoll = function() {
		if(self.delayQueue.length>0) {
			var deferred = self.delayQueue.shift();
			deferred.resolve();
			setTimeout(self.delayPoll, self.period);
		}
		else {
			self.callCount--;
		}
		$('#waitOnQueue').html("Que: " + self.delayQueue.length + "/" + (self.maxCalls-self.callCount));
	};
	
	// queues future calls to delay until the specified timeout (in milliseconds) has passed.
	// used to prevent flooding GGG's servers with too many stash requests in a short time.  
	this.check = function() {

		var deferred = $.Deferred();
		
		if(this.callCount< this.maxCalls) {
			// no need to queue, we have not hit the throttle yet.
			deferred.resolve();
			this.callCount++;
//			console.log("Event passed. callCount: " + this.callCount);
			setTimeout(this.delayPoll, this.period);
		}
		else {
			// too many calls in the last 60 seconds.
			// queue up the deferred so it can be processed when a slot becomes available
			// and simply return.
			this.delayQueue.push(deferred);
//			console.log("Event queued. Queue size: " + this.delayQueue.length);
		}
		$('#waitOnQueue').html("Que: " + self.delayQueue.length + "/" + (self.maxCalls-self.callCount));
		return deferred.promise();
	};
}


function setDropdown(charResp) {
	
	var charOptions = $.map(charResp.characters, 
							function (v) { return '<option>' + v.name + '</option>'; }).join('');
	$('#charDropDown').html('<option></option>' + charOptions);
	$('#charDropDown').val(0);
	$('#charDropDown').change(function () {

		$('#output').html('');
		$('#rareList').html('');
		clearTimeout(timer);

		var charName = $('#charDropDown').val();

		if (charName != '') {
			poll(charName, false);	
		}

	})
}

function showCharError() {
	$('#err').html('You appear not to be signed in to <a href="http://pathofexile.com">' +
				   'Path of Exile</a>.<p>Please sign in and refresh this page.');
}

function poll(charName, reschedule) {
	$('#spinner').show();

	$('#charDropDown,#refresh,#copyToClipboard,#copyFromClipboard').attr('disabled', true);
	
	currentItems = null;

	getCache('items-' + charName)

		.done(function(aRawItems){
			
			// reconstruct item data from raw data in cache
			var items = [];
			for (var i = 0; i < aRawItems.length; i++){
				items.push(parseItem(aRawItems[i].html, aRawItems[i].location));
			}

			processItems(items);
			
		})

		.fail(function(){
			allItems(charName)

				.done(function (items) {
					
					// add raw item data to the cache
					var aRawItems = [];
					for (var i = 0; i < items.length; i++){
						aRawItems.push({html: items[i].raw, location: items[i].location});
					}
					setCache('items-' + charName,aRawItems);

					processItems(items);

				})

				.fail(function () {
					$('#output').html('');
					$('#err').html('An error occured while requesting data from pathofexile.com. Please ' +
								   'click refresh to try again. If the error persists, contact the author.');				

				})

				.then(function () {
					$('#spinner').hide();
					if (reschedule) {
						timer = setTimeout(function() { poll(charName, true); }, 10 * 60 * 1000);
					}
				})
			;
		})
	;

	
}

function processItems(items){
	currentItems = items;
	var matches = allMatches(items);

	var idx = 0;

	$('ul#craftingTabs li.crafting-page').remove();
	$('div#crafting-content').empty();

	for (item in matches) {
		idx++;

		// add navigation entry
		$('ul#craftingTabs').append('<li class="crafting-page"><a data-index="' + idx + '">' + item + '</a></li>');

		// add content div
		var oDiv = $('<div class="hide crafting-block" data-index="' + idx + '">');

		// add title
		oDiv.append('<h2>' + item + '</h2>');

		var oTable = $('<table class="table table-striped table-condensed"><thead><tr><th>%<th>Matched</th><th>Missing</th><thead></table>');

		var oTBody = $('<tbody>').appendTo(oTable);

		var match_group = matches[item];

		for (var i = 0; i < match_group.length; i++) {

			var match = match_group[i];

			$('<tr>')
				.append('<td>' + parseInt(match.complete * 10000) / 100 + '%</td>')
				.append($('<td>').append(getItemsUL(match.items)))
				.append('<td>' + ((match.complete < 1 && match.missing != null) ? match.missing.join('<br>') : '') + '</td>')			
				.appendTo(oTBody)
			;
			

		}

		

		oDiv.append(oTable);

		$('div#crafting-content').append(oDiv);

	}

	$('ul#craftingTabs .dropdown-toggle').dropdown();

	$('div#crafting-content').show();

	$('ul#craftingTabs li.crafting-page a, #openRareList').click(function(){
		$('#rareList').hide();
		$('div#crafting-content div.crafting-block').hide();
		$('ul.nav li,ul#craftingTabs li').removeClass('active');
		$(this).parent().addClass('active');		
	})

	$('ul#craftingTabs li.crafting-page a').click(function(){
		$(this).closest('.dropdown').addClass('active');		
		$('div#crafting-content div[data-index=' + $(this).data('index') + ']').show();
	})

	$('#openRareList').click(function(){
		$('#rareList').show();
	})

	$('ul#craftingTabs li.crafting-page a:first').trigger('click');
	
	$('#rareList').html(formatRareList("Your Rare Items", getSortedRares(items)));

    $('#charDropDown,#refresh,#copyToClipboard,#copyFromClipboard').attr('disabled', false);
	$('#spinner').hide();
}



function getItemsUL(aItems) {
	
	var oUL = $('<ul class="unstyled">');

	for (var i=0; i < aItems.length; i++) {
		
		var item = aItems[i];

		var oItem = $('<a>')
			.append(item.name)
			.data('raw',item.raw)			
			.popover({
				// title: item.name, 
				content: function(){ 
										
					var html = $(this).data('raw') ;

					var oData = $( html ).addClass('itemPlaced').addClass('itemHovered');

					oData.find('.hidden').removeClass('hidden');

					oData.find('.itemPopupContainer').addClass('pull-left');
					
					oData.find('.itemIconContainer').addClass('pull-left').prependTo(oData);

					

					return $('<div>').append(oData).append('<div class="clearfix"></div>');
				},
				placement: 'bottom',
				delay: { show: 500, hide: 100 },				
				template: '<div class="popover"><div class="arrow"></div><div class="popover-inner-poe"><div class="popover-content"><p></p></div></div></div>'
			})
			.click(function(){
				$(this).popover('show');
			})
		;

		$('<li>')
			.append('<span style="width:20px;float:left;">' + (item.location.page === null ? 0 : parseInt(item.location.page) + 1)  + '</span>')
			.append(oItem)
			.appendTo(oUL)
		;
	}

	return oUL;

}

function formatRareListPlain(sortedRares, separators) {
	var count = sortedRares.length;
	var out = '';
	var prevForename = null;
	for (var i = 0; i < count; ++i) {
		var rareName = sortedRares[i].name;
		if(separators) {
			var forename = rareName.substring(0, rareName.indexOf(' '));
			if(prevForename!=null && prevForename!=forename) {
				// new row
				out+='---------------\n';
			}
			prevForename = forename;
		}
		out += rareName +'\n';
	}
	return out;	
}


function formatRareList(title, sortedRares) {
	var count = sortedRares.length;
	var out = sprintf('<table><tbody><tr><th>%s</th></tr><tr><td>',title);
	var prevForename = null;
	for (var i = 0; i < count; ++i) {
		var rareName = sortedRares[i].rareName;
		var forename = rareName.substring(0, rareName.indexOf(' '));
		if(prevForename!=null && prevForename!=forename) {
			// new row
			out+='</td></tr><tr><td>';

		}
		prevForename = forename;
		out += itemSpan(sortedRares[i]);
		if(sortedRares[i].theirCount>1) {
			out+=sprintf(' (clipboard has %s)', sortedRares[i].theirCount);
		}
		out+='<br>';
	}
	out+='</td></tr></tbody></table>';
	return out;
}

function getSortedRares(items) {
	var available = items.slice(0);
	
	var rares = available.filter(function(i) {
		return i.rarity == 'rare' && i.identified;
	});
	
	var sortedRares = rares.sort(function(a,b) {
		if(a.rareName<b.rareName) {
			return -1;
		}
		else if(a.rareName>b.rareName) {
			return 1;
		}
		return 0;
	});
	
	return sortedRares;
	
}