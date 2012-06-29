var timer = null;
var currentItems = null;
var postThrottle = null;

$(document).ready(function () {
	
	getVersion(function (version){
		$('#version').html("Version: " + version);
	});
	

	postThrottle = new Throttle(15, 60000);

	var dbOpenPromise = $.indexedDB("poe_plus");

	

	dbOpenPromise.done(function(db, event){
		// load list of chars from server (or cache)
		// callback will select last selected char if there is one in the cache
		getChars(function(){
			getCache('last-char').done(function(charName) {							
				if ($('#charDropDown').val(charName).val() != '') poll(charName, false);			
			})
		});
	});


	
});


$('#refresh').click(function () {

	// clear all stored data
	resetCache(function(){

		// store charname before we reset list of chars
		var charName = $('#charDropDown').val();

		getChars(function(){

			// reset charName and make sure it still exists			
			if ($('#charDropDown').val(charName).val() != '') {
				setCache('last-char',charName);
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

function updateQueueStatus(queued,available){
	$('#waitOnQueue').html("Queued Requests: " + queued + " | Available Requests: " + available);
}

//constructor for a new throttle instance
function Throttle(callsPerPeriod, periodDuration) {
	
	var self = this;
	this.maxCalls = callsPerPeriod;
	this.period = periodDuration;
	
	this.callCount = 0;
	
	this.delayQueue = [];
	
	updateQueueStatus(self.delayQueue.length,self.maxCalls-self.callCount);
	
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
		updateQueueStatus(self.delayQueue.length,self.maxCalls-self.callCount);
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
		updateQueueStatus(self.delayQueue.length,self.maxCalls-self.callCount);
		return deferred.promise();
	};
}


function setDropdown(charResp) {
	
	var charOptions = $.map(charResp.characters, function (v) { return '<option value="' + v.name + '">' + v.name + '</option>'; }).join('');

	$('#charDropDown').html('<option value="">Select Character</option>' + charOptions);
	$('#charDropDown').val(0);
	$('#charDropDown').change(function () {

		$('#output').html('');
		$('#rareList').html('');
		clearTimeout(timer);

		var charName = $('#charDropDown').val();

		if (charName != '') {
			setCache('last-char',charName);
			poll(charName, false);	
		}

	})
}

function showCharError() {
	$('#err').html('You appear not to be signed in to <a href="http://pathofexile.com">' +
				   'Path of Exile</a>.<p>Please sign in and refresh this page.');
}

function poll(charName) {

	// clear existing crafting info
	$('ul#craftingTabs li').remove();
	$('div#crafting-content').empty();
	
	//clear existing inventory info
	$('#rares-menu li').remove();	
	$('#rareList').empty();
	
	currentItems = null;


	$.blockUI({message: '<h3>Loading...</h3><h4 id="waitOnQueue"></h4>', baseZ: 10000});



		getCache('items-' + charName)

			.done(function(aRawItems){
				
				// reconstruct item data from raw data in cache
				
				var items = [];
				var i = 0;

				try {
					for (i = 0; i < aRawItems.length; i++){
						items.push(parseItem(aRawItems[i].html, aRawItems[i].location));
					}

				} catch (e) {

					console.log('Error while reconstructing stash from cache - try clicking "Refresh Data"');
					$('#err').html('An error occured while reconstructing stash from cache. Please ' +
								   'click refresh data to try again. If the error persists, contact the author.');							
					errorDump(e);
					console.log('Last processed Item:');
					console.log(aRawItems[i]);

				}

				processItems(items);

				$.unblockUI();
				
			})

			.fail(function(){
				allItems(charName)

					.done(function (items) {
						
						// add raw item data to the cache

						try {

							var aRawItems = [];
							var i = 0;
							for (i = 0; i < items.length; i++){
								aRawItems.push({html: items[i].raw, location: items[i].location});
							}
							setCache('items-' + charName,aRawItems);

						} catch (e){
							console.log('An error occured while writing fetched stash data to the cache');
							$('#err').html('An error occured while saving stash to cache. Please ' +
										   'click refresh data to try again. If the error persists, contact the author.');		
							errorDump(e);
							console.log('Last processed Item:');
							console.log(items[i]);							
						}

						processItems(items);

						$.unblockUI();

					})

					.fail(function () {						
						$('#err').html('An error occured while requesting data from pathofexile.com. Please ' +
									   'click refresh data to try again. If the error persists, contact the author.');
						console.log('Error while fetching from pathofexile.com - try clicking "Refresh Data"');
									   				

					})

				;
			})
		;


	
}

function processItems(items){

	try {

		currentItems = items;
		var matches = allMatches(items);
		var idx = 0;

		var item = {};

		var match = {};

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

				match = match_group[i];

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


	} catch (e) {

		console.log('error occured while processing items for stash');
		console.log(e);

		$('#err').html('An error occured while processing matches in the stash. Please ' +
					   'click refresh to try again. If the error persists, contact the author.');

		console.log('last match item processed');
		console.log(match);

		console.log('last match group processed:');
		console.log(item);
		
	}

	try {

		// load inventory list
		$('#rareList').append( formatRareList(getSortedItems(items),true) ).find('table').stupidtable();    

		// sort crafting tabs
		sortUL('#craftingTabs');

		$('div#crafting-content').show();

		$('ul#craftingTabs li.crafting-page a, #openRareList, ul#rares-menu li input[type=checkbox]').click(function(){
			$('#rareList').hide();
			$('div#crafting-content div.crafting-block').hide();
			$('ul.nav li,ul#craftingTabs li').removeClass('active');
			$(this).parent().addClass('active');		
		});

		$('ul#craftingTabs li.crafting-page a').click(function(){
			$(this).closest('.dropdown').addClass('active');		
			$('div#crafting-content div[data-index=' + $(this).data('index') + ']').show();
		});

		$('ul#rares-menu li input[type=checkbox]').click(function(e){		


			$(this).closest('.dropdown').addClass('active');

			var aSelector = [];
			$('ul#rares-menu input[name=item-filter]:checked').each(function(idx,item){			
				aSelector.push('table tbody tr.' + $(item).val());
			})
			var selector = aSelector.join(', ');


			var aSelectorRarity = [];
			$('ul#rares-menu input[name=item-filter-rarity]:checked').each(function(idx,item){			
				aSelectorRarity.push('table tbody tr.' + $(item).val());
			})
			var selectorRarity = aSelectorRarity.join(', ');

			if (selector != '' || selectorRarity != '') {
				
				// hide list while we refilter
				$('#rareList').hide().find('table tbody tr').addClass('hide');

				var oFiltered = $('#rareList').hide().find('table tbody tr').addClass('hide');

				if (selector != '') oFiltered = oFiltered.filter(selector);
				if (selectorRarity != '') oFiltered = oFiltered.filter(selectorRarity);

				oFiltered.removeClass('hide');

				$('#rareList').show();
				
				// prevent menu from closing	
				e.stopPropagation();

			} else {
				$('#openRareList').trigger('click');
			}

		});

		// prevent label click events from triggering menu close (the follow up checkbox click still can)
		$('ul#rares-menu li label').click(function(e){
			e.stopPropagation();
		})


		$('#openRareList')		
			.click(function(){
				$(this).closest('.dropdown').addClass('active');
				$('#rareList').find('table tbody tr.hide').removeClass('hide').end().show();
				$('ul#rares-menu li input[type=checkbox]:checked').removeProp('checked');
			})
		;

		$('ul#craftingTabs li.crafting-page a:first').trigger('click');

	} catch (e) {

		console.log('error occured while rendering stash');
		errorDump(e);

		$('#err').html('An error occured while rendering the stash. Please ' +
					   'click refresh to try again. If the error persists, contact the author.');
		
	}

}

function errorDump(e) {
	console.log(e);
	if (e.hasOwnProperty('message')) console.log(e.message);
	if (e.hasOwnProperty('stack')) console.log(e.stack);
}

function getItemsUL(aItems) {
	
	var oUL = $('<ul class="unstyled">');

	for (var i=0; i < aItems.length; i++) {
		
		var item = aItems[i];

		var oItem = getItemLink(item);
		;

		$('<li>')
			.append(oItem)
			.append(' (' + (item.location.page === null ? 'inventory' : 'tab:' + item.location.page )  + ')' )
			.appendTo(oUL)
		;
	}

	return oUL;

}

function getItemLink(item) {

		var oItem = $('<a>')
			.append(item.name)
			.addClass('item-' + item.rarity)
			.data('raw',item.raw)			
			.popover({
				// title: item.name, 
				content: function(){ 										
					var html = $(this).data('raw') ;
					var oData = $( html );
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

	return oItem;

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


function formatRareList(sortedRares, bSetupDropdown) {
	

	var oTypes = {};
	
	var oRarity = {}

	var ulType = $('<ul>');
	var ulRarity = $('<ul>');

	var oTable = $('<table class="table table-condensed">');		

	var oHead = $('<thead>');

	var oBody = $('<tbody>');

	for (var i = 0; i < sortedRares.length; ++i) {

		var item = sortedRares[i];

		// update options in rares dropdown		

		if (bSetupDropdown) {			
			if (item.itemRealType != '' && !oTypes.hasOwnProperty(item.itemRealType)) {
				oTypes[item.itemRealType] = item.itemRealType.replace(/\s/g,'-');
				ulType.append('<li class="filter"><label class="checkbox inline" for="cb-' + oTypes[item.itemRealType] + '"><input class="checkbox inline" type="checkbox" id="cb-' + oTypes[item.itemRealType] + '" name="item-filter" value="' + oTypes[item.itemRealType] + '" />' + item.itemRealType + '</label></li>')
			}
			if (item.rarity != '' && !oRarity.hasOwnProperty(item.rarity)) {
				oRarity[item.rarity] = item.rarity.replace(/\s/g,'-');
				ulRarity.append('<li class="filter"><label class="checkbox inline" for="cbr-' + oRarity[item.rarity] + '"><input class="checkbox inline" type="checkbox" id="cbr-' + oRarity[item.rarity] + '" name="item-filter-rarity" value="' + oRarity[item.rarity] + '" />' + capitaliseFirstLetter(item.rarity) + '</label></li>')
			}
		}

		$('<tr>')
			.addClass(oTypes[item.itemRealType])
			.addClass(oRarity[item.rarity])
			.append( $('<td>').text( item.location.page === null ? 0 : item.location.page ) )			
			.append( $('<td>').text( item.level ) )
			.append( $('<td>').text( item.quality ) )
			.append( $('<td>').append( getItemLink(item) ) )
			.appendTo(oBody)
		;
	}

	$('<tr>')
		.append( $('<th class="type-int">').text('Tab') )		
		.append( $('<th class="type-int">').text('Level') )
		.append( $('<th class="type-int">').text('Quality') )
		.append( $('<th class="type-string">').text('Item') )
		.appendTo(oHead)
	;

	if (bSetupDropdown) {
		// sort inventory optionsand add all option to inventory menu
		sortUL(ulType);
		sortUL(ulRarity);

		$('#rares-menu')
			.append('<li><a id="openRareList">All Inventory</a></li><li class="divider"></li>')
			.append(ulType.children())
			.append('<li class="divider"></li>')
			.append(ulRarity.children())
		;

	}

	oTable
		.append(oHead)
		.append(oBody)
	;		

	return oTable;
}

function getSortedItems(items) {
	
	var sortedRares = items.slice(0).sort(function(a,b) {
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


function getSortedRares(items) {
	var available = items.slice(0);
	
	var rares = available.filter(function(i) {
		return (i.rarity == 'rare') && i.identified;
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