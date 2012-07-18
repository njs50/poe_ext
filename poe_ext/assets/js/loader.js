var numTabs = 0;
var oTabs = {};
var oLeagueChars = {};

var currentItems = null;
var postThrottle = null;

var currentLeague = '';

$(function(){
	
	getVersion();
	
	postThrottle = new Throttle(15, 60000);

	// initialise the local browser db, once going, start loading data...
	var dbOpenPromise = initCache()
		.done(function(db, event){
			// load list of chars from server (or cache)
			// callback will select last selected char if there is one in the cache
			loadPageData();

		})
	;


	
});

function loadPageData() {
	refreshData(function(){
		getCache('last-league')
			.done(function(charName) {
				$('#leagueSelector li a[title=' + charName + ']').trigger('click');						
			})
		;
	});	
}

$('#refresh').click(function () {

	// store charname before we reset list of chars
	var charName = currentLeague;

	// clear all stored data
	resetCache(function(){

		// reload characters from server
		refreshData(function(){

			// reset charName and make sure it still exists					
			setCache('last-league',charName);
			$('#leagueSelector li a[title=' + charName + ']').trigger('click');				
		

		});

	});


});

$('#applyPartialRefresh').click(function(){

	var deleteQueue = new PromiseGroup();

	$('#refreshChars input[type=checkbox]:checked, #refreshTabs input[type=checkbox]:checked').each(function(idx,item){
		deleteQueue.addPromise( removeFromCache( $(item).val() ) );
	});

	deleteQueue.completed(function(){
		loadPageData();
	})




});

$('#partRefresh').click(function () {

	$('#refreshSelection').modal('show');

});

function refreshData(callback) {	
	
	getCache('league-data')

		.done(function(oLeague) {			

			oLeagueChars = oLeague;

			getCache('oTabs').done(function(oT){

				oTabs = oT;			

				getCache('numTabs').done(function(nt){
					numTabs = nt;
					initPage();
					if(jQuery.isFunction(callback)) callback();					
				});				
			});

		})

		.fail(function(){

			$.blockUI({message: '<h3>Loading...</h3><h4 id="waitOnQueue"></h4>', baseZ: 10000});

			$.post(getEndpoint('get-characters'))

				.done(function (charResp) {
					
					if (charResp == null || charResp.error != undefined) {
						showCharError();
						return;
					}

					// setCache('chars',charResp);

					var oLeagues = {};
					
					var loadQueue = new PromiseGroup();

					var throttleQueue = new PromiseGroup();					

					// we have to request each characters items to find out what league they are in
					$.each(charResp.characters,function(idx,item){
						
						loadQueue.addPromise(
							getCharItems(item.name)
								.done(function(oData){
									if (!oLeagues.hasOwnProperty(oData.character.league)) oLeagues[oData.character.league] = [];
									oLeagues[oData.character.league].push(item.name);
								})
						);
						
					});

					// all items have been requested (ie not sitting in queue)
					throttleQueue.completed(function(){
						// when loading all chars is complete save to cache
						loadQueue.completed(function(){
							
							// look up how many tabs we have
							for(var league in oLeagues) {
							    if(oLeagues.hasOwnProperty(league)) {

							    	// load first leagues first stash tab to get tab info
							    	getStashPage(league,0)
							    		.done(function(oStash){

											numTabs = oStash.numTabs;
											oTabs = oStash.tabs;
											oLeagueChars = oLeagues;

							    			setCache('numTabs', numTabs);
							    			setCache('oTabs',oTabs);
											setCache('league-data', oLeagueChars);

											$.unblockUI();

											initPage();

											if(jQuery.isFunction(callback)) callback();

							    		})
							    	;

							        break;
							    }
							}


						});

					})

				})
				
				// failed to load character info
				.fail(function () {
					showCharError();
				})
			;
		})
	;

}

function initPage(){

	var oDD = $('#leagueSelector')
		.empty()		
	;

	for (var league in oLeagueChars) {
		oDD.append('<li><a title="' + league + '">' + league + '</a></li>');
	}

	oDD.find('a').click(function(){

		var oThis = $(this);
		var league = oThis.text();

		currentLeague = league;

		oThis
			.closest('.dropdown')
				.addClass('active')
				.find('a.dropdown-toggle')
					.html(league + ' League <b class="caret"></b>')
		;

		oThis.parent().siblings().removeClass('active');

		oThis.parent().addClass('active');

		$('#output').html('');
		$('#rareList').html('');			

		if (league != '') {
			setCache('last-league',league);
			loadLeagueData(league, false);	
		}

	});

}


function getVersion() {

	$.getJSON('manifest.json',function(manifest){
 		$('#version').html("Version: " + manifest.version);        
	});

}



function PromiseGroup() {

	var self = this;

	var aPromise = [];

	this.completed = function(fn) {
		$.when.apply($,aPromise).done(fn);
	}

	this.failed = function(fn) {
		$.when.apply($,aPromise).fail(fn);
	}

	this.addPromise = function(promise) {
		aPromise.push(promise);
	}


}


//constructor for a new throttle instance
function Throttle(callsPerPeriod, periodDuration) {
	
	var self = this;

	this.maxCalls = callsPerPeriod;
	this.period = periodDuration;
	
	this.callCount = 0;
	
	this.delayQueue = [];
	
	this.updateStatus = function() {
		$('#waitOnQueue').html("Queued Requests: " + self.delayQueue.length + " | Available Requests: " + (self.maxCalls-self.callCount));
	};

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
		
		self.updateStatus();

	};
	
	// queues future calls to delay until the specified timeout (in milliseconds) has passed.
	// used to prevent flooding GGG's servers with too many stash requests in a short time.  
	this.queue = function() {

		var deferred = $.Deferred();
		
		if( this.callCount < this.maxCalls ) {
			// no need to queue, we have not hit the throttle yet.
			deferred.resolve();
			this.callCount++;
			setTimeout(this.delayPoll, this.period);
		} else {
			// too many calls.
			// queue up the deferred so it can be processed when a slot becomes available
			// and simply return.
			this.delayQueue.push(deferred);
		}
		
		self.updateStatus();

		return deferred.promise();

	};

	self.updateStatus();

}



function showCharError() {
	$('#err').html('You appear not to be signed in to <a href="http://pathofexile.com">' +
				   'Path of Exile</a>.<p>Please sign in and refresh this page.');
}

function loadLeagueData(league) {

	// clear existing crafting info
	$('ul#craftingTabs li').remove();
	$('div#crafting-content').empty();
	
	//clear existing inventory info
	$('#rares-menu li').remove();	
	$('#rareList').empty();

	// clear reset lists
	$('#refreshChars, #refreshTabs').empty();
	
	currentItems = null;

	var items = [];

	$.blockUI({message: '<h3>Loading...</h3><h4 id="waitOnQueue"></h4>', baseZ: 10000});

	try {

		var aChars = oLeagueChars[league];

		var loadQueue = new PromiseGroup();

		

		for (var i=0; i< aChars.length; i++) {		
			loadQueue.addPromise(
				getCharItems(aChars[i]).done(function(oChar){					
					$.merge(items, responseToItems(oChar, {section: oChar.charName, page: null}))
				})
			);
			$('#refreshChars').append('<li><label class="checkbox"><input type="checkbox" name="refreshChars" value="char-' + aChars[i] + '">' + aChars[i] + '</label></li>');
		}

		// get the first tab (and tab labels) first...		
		getStashPage(league,0).done(function(oData){

			try {
			
				oTabs = oData.tabs;
				$.merge(items, responseToItems(oData, {section: 'stash', page: parseInt(oTabs[oData.tabIndex].n) }))

			} catch (e) {

				$.unblockUI();
				$('#err').html('An error occured while requesting data from pathofexile.com. Please ' +
							   'click refresh data to try again. If the error persists, contact the author.');
				console.log('Error while fetching from pathofexile.com - try clicking "Refresh Data"');
				errorDump(e);
			}				

		}).done(function(){

			try {

				for (var i=0; i < numTabs; i++ ) {
					$('#refreshTabs').append('<li><label class="checkbox"><input type="checkbox" name="refreshTabs" value="stash-' + league + '-' + i + '">Tab:' + parseInt(oTabs[i].n) + '</label></li>');
				}

				for (var i=1; i < numTabs; i++ ) {		
					loadQueue.addPromise(
						getStashPage(league,i).done(function(oData){													
							$.merge(items, responseToItems(oData, {section: 'stash', page: parseInt(oTabs[oData.tabIndex].n) }))
						})
					);
				}

				loadQueue.completed(function(){
					processItems(items);
					$.unblockUI();
				})

				loadQueue.failed(function(){		
					$('#err').html('An error occured while requesting data from pathofexile.com. Please ' +
								   'click refresh data to try again. If the error persists, contact the author.');
					console.log('Error while fetching from pathofexile.com - try clicking "Refresh Data"');
					$.unblockUI();
				})

			} catch (e) {

				$.unblockUI();
				$('#err').html('An error occured while requesting data from pathofexile.com. Please ' +
							   'click refresh data to try again. If the error persists, contact the author.');
				console.log('Error while fetching from pathofexile.com - try clicking "Refresh Data"');
				errorDump(e);
			}

		})
	
			
	} catch (e) {

		$.unblockUI();

		$('#err').html('An error occured while requesting data from pathofexile.com. Please ' +
					   'click refresh data to try again. If the error persists, contact the author.');
		console.log('Error while fetching from pathofexile.com - try clicking "Refresh Data"');

		errorDump(e);

	}


	
}


function responseToItems(response, location) {
	items = []
	$.map(response.items, function (v) {
		// We filter out any items that are in a character response but aren't in the
		// main inventory. I.e. we don't include what you're wearing.
		if (location.section === 'stash' || v.inventory_id == 'MainInventory') {
			items.push(parseItem(v.html, location))
		}
	})
	return items;
}


function getEndpoint(method) {
	return "http://www.pathofexile.com/character-window/" + method;
}



function getCharItems(charName) {


	var deferred = $.Deferred();
	
	// first attempt to load from cache
	getCache('char-' + charName)
		//cache hit
		.done(function(oData){
			deferred.resolve(oData);
		})

		// cache miss
		.fail(function(){

			postThrottle.queue().done(function() {

				$.post(getEndpoint('get-items'), {character: charName})
					.done(function(oData){
						// add char data to cache
						oData.charName = charName;
						setCache('char-' + charName , oData);
						deferred.resolve(oData);
					})
					.fail(function(){
						deferred.reject();
						return;
					})
				;
			});			
		})
	;

	return deferred.promise();
}


// returns a promse, which will return the stash page once loaded
function getStashPage(league,index) {

	var deferred = $.Deferred();

	// first attempt to load from cache
	getCache('stash-' + league + '-' + index)
		//cache hit
		.done(function(oData){
			deferred.resolve(oData);
		})

		// cache miss
		.fail(function(){

			postThrottle.queue().done(function() {
				$.post(getEndpoint('get-stash-items'), {league: league, tabIndex: index, tabs: index === 0 ? 1 : 0})
					
					.done(function (stashResp) {
						
						if(stashResp.error != undefined) {
							// early exit if web server returns the "you've requested too frequently" error
							deferred.reject();
							return;
						}	
						stashResp.tabIndex = index;
						setCache('stash-' + league + '-' + index,stashResp);
						deferred.resolve(stashResp);
					})

					.fail(function(){
						deferred.reject();
						return;
					})
				;
			});

		})
	;

	return deferred.promise();

}

