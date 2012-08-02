var cache_enabled = true;


function initCache(){
	
	var deferred = new $.Deferred();

	$.indexedDB("poe_plus")

		.done(function(){
			deferred.resolve();
		})

		.fail(function(){
			console.log('Failed to open indexed DB, disabling caching...');
			cache_enabled = false;
			deferred.resolve();		
		})
	;

	return deferred.promise();
}


function resetCache(callback) {

	var objectStore = $.indexedDB("poe_plus").objectStore("cache", $.indexedDB.IDBTransaction.READ_WRITE);

	var promise = objectStore.clear();

	promise.done(function(result, event){
	    if(jQuery.isFunction(callback)) callback();
	});

	promise.fail(function(error, event){
		console.log('Error clearing cache DB');
		cache_enabled = false;
		console.log(error);
		// continue on with cache disabled....
		if(jQuery.isFunction(callback)) callback();
	});	
	
}



function getCache(cacheName) {

	var deferred = new $.Deferred();


	if (cache_enabled) {

		var objectStore = $.indexedDB("poe_plus").objectStore("cache", $.indexedDB.IDBTransaction.READ_ONLY);
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
			cache_enabled = false;
			console.log(error);
			deferred.reject();
		});		

	} else {
		deferred.reject();
	}

	return deferred.promise();

}

function removeFromCache(cacheName) {

	if (cache_enabled) {

		var objectStore = $.indexedDB("poe_plus").objectStore("cache", $.indexedDB.IDBTransaction.READ_WRITE);
		var promise = objectStore.delete(cacheName);		

		return promise;
	}

}

function setCache(cacheName,value) {

	if (cache_enabled) {

		var objectStore = $.indexedDB("poe_plus").objectStore("cache", $.indexedDB.IDBTransaction.READ_WRITE);
		var promise = objectStore.put(value,cacheName);

		promise.fail(function(error, event){
			console.log('Error putting object into cache');
			cache_enabled = false;
			console.log(error);		
		});

	}
	
}
