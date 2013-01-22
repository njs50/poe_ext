var cache_enabled = true;

window.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;

var db;

const db_name = "poe_plus";
const store_name = "cache";
const db_version = 3;

var tx_readonly = 'readonly';
var tx_readwrite = 'readwrite';

function initCache(){

	var deferred = new $.Deferred();

	if (window.indexedDB === undefined) {
		console.log("IndexedDB support not detected, disabling caching...");
		cache_enabled = false;
		deferred.resolve();
		return deferred.promise();

	}

	var request = window.indexedDB.open(db_name,db_version);

	request.onupgradeneeded = function(e) {

		db = request.result;

		var txn = e.target.result;

		if(db.objectStoreNames.contains(store_name)) {
			db.deleteObjectStore(store_name);
		}

		db.createObjectStore(store_name);

		txn.oncomplete = function () {
			// console.log('new store created');
			deferred.resolve();

        }
	};

	request.onsuccess = function(e) {

		// console.log('indexed db opened');

		db = request.result;

		if (db.version != db_version) {

			// console.log('indexed db version incorrect');

			var setVrequest = db.setVersion(db_version);

            // onsuccess is the only place we can create Object Stores
            setVrequest.onfailure = function(e){
            	console.log('error setting version');
            };

            setVrequest.onsuccess = function(e) {

				var txn = e.target.result;

				if(db.objectStoreNames.contains(store_name)) {
					db.deleteObjectStore(store_name);
				}

				db.createObjectStore(store_name);

				txn.oncomplete = function () {
					// console.log('new store created');
					deferred.resolve();

                }

            };



		} else {
			deferred.resolve();
		}

	};

	request.onerror = function(e){
		console.log("Failed to open indexed DB, disabling caching... : " + e);
		cache_enabled = false;
		deferred.resolve();
	};

	return deferred.promise();
}


function resetCache(callback) {

	if (cache_enabled){

		var request = db.transaction([store_name], tx_readwrite).objectStore(store_name).clear();

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

}



function getCache(cacheName) {

	var deferred = new $.Deferred();

	if (cache_enabled){

		var request = db.transaction([store_name], tx_readonly).objectStore(store_name).get(cacheName);

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

		var request = db.transaction([store_name], tx_readwrite).objectStore(store_name).delete(cacheName);

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

		try {

			var request = db.transaction([store_name], tx_readwrite).objectStore(store_name).put(value,cacheName);

			request.onsuccess = function(e) {
			    deferred.resolve();
			};

			request.onerror = function(e){
				console.log('Error adding object to cache');
				cache_enabled = false;
				console.log(e);
				deferred.resolve();
			};

		} catch (e) {
			console.log('Error adding object to cache');
			cache_enabled = false;
			console.log(e);
			deferred.resolve();
		}

	} else deferred.resolve();

	return deferred.promise();

}
