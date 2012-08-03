var cache_enabled = true;

window.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;

var db;

const db_name = "poe_plus";
const store_name = "cache";


function initCache(){
	
	var deferred = new $.Deferred();

	var request = window.indexedDB.open(db_name); 

	request.onsuccess = function(e) {	 	
		//console.log('indexed db opened');
		db = request.result;
		deferred.resolve();
	};

	request.onerror = function(e){
		console.log("Failed to open indexed DB, disabling caching... : " + e);
		cache_enabled = false;
		deferred.resolve();
	};	 

	return deferred.promise();
}


function resetCache(callback) {

	var request = db.transaction([store_name], "readwrite").objectStore(store_name).clear();

	request.onsuccess = function(e) {
		//console.log('db reset');
		if(jQuery.isFunction(callback)) callback();
	};

	request.onerror = function(e){
		console.log('Error clearing cache DB');
		cache_enabled = false;
		console.log(e);
		// continue on with cache disabled....
		if(jQuery.isFunction(callback)) callback();
	};

	
}



function getCache(cacheName) {

	var deferred = new $.Deferred();

	if (cache_enabled){

		var request = db.transaction([store_name], "readonly").objectStore(store_name).get(cacheName);		

		request.onsuccess = function(e) {			
		    if (typeof request.result == 'undefined'){
		    	deferred.reject();
		    } else {
		    	deferred.resolve(request.result);
		    }			
		};

		request.onerror = function(e){
			console.log('Error getting object from cache');
			cache_enabled = false;
			console.log(e);
			deferred.reject();
		};

	} else deferred.reject();

	return deferred.promise();

}

function removeFromCache(cacheName) {

	var deferred = new $.Deferred();

	if (cache_enabled){

		var request = db.transaction([store_name], "readwrite").objectStore(store_name).delete(cacheName);		

		request.onsuccess = function(e) {				
		    deferred.resolve();	
		};

		request.onerror = function(e){
			console.log('Error removing object from cache');
			cache_enabled = false;
			console.log(e);
			deferred.resolve();
		};

	} else deferred.resolve();

	return deferred.promise();

}

function setCache(cacheName,value) {

	var deferred = new $.Deferred();

	if (cache_enabled){

		var request = db.transaction([store_name], "readwrite").objectStore(store_name).put(value,cacheName);		

		request.onsuccess = function(e) {				
		    deferred.resolve();	
		};

		request.onerror = function(e){
			console.log('Error adding object to cache');
			cache_enabled = false;
			console.log(e);
			deferred.resolve();
		};

	} else deferred.resolve();

	return deferred.promise();

}
