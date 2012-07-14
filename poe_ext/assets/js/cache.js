
function initCache(){
	var dbOpenPromise = $.indexedDB("poe_plus");
	return dbOpenPromise;
}


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
