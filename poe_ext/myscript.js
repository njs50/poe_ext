function dictMap(d, f) {
	var o = new Object();
	for (var i in d) {
		if (d.hasOwnProperty(i)) {
			o[i] = f(i, d[i]);
		}
	}
	return o;
}

function ttj(t) {
	return eval('(' + t + ')');
}

function getEndpoint(method) {
	return "http://www.pathofexile.com/character-window/" + method;
}

function allItems(charName) {
	var deferred = $.Deferred();

	postThrottle.check().done(function() {
		$.post(getEndpoint('get-items'), {character: charName})
		.done(function(itemsResp) {
			if(itemsResp.error != undefined) {
				// early exit if web server returns the "you've requested too frequently" error
				deferred.reject();
				return;
			}

			var items = responseToItems(itemsResp, {section: 'character', page: null});
			getStash(itemsResp)
			.done(function (stash) {
				deferred.resolve($.merge(items, stash));
			})
			.fail(function(){
				deferred.reject();
			})
		}).fail(function () {
			deferred.reject();
		});
	});

	return deferred.promise();
}

function getStash(itemsResp) {
	// Get stash is a two-step process. First, get page 0. Then get the rest of
	// the pages (because page 0 tells us how many there are).
	var deferred = $.Deferred();
	var stashEndpoint = getEndpoint('get-stash-items');
	postThrottle.check().done(function() {
		$.post(stashEndpoint, {league: itemsResp.character.league, page: 0})
		.done(function (stashResp) {
			if(stashResp.error != undefined) {
				// early exit if web server returns the "you've requested too frequently" error
				deferred.reject();
				return;
			}		
			
			var stashItems = responseToItems(stashResp, {section:'stash', page: 0});
			var stashPromises = [];
			for (var i = 1; i < stashResp.numTabs; ++i) {
				var location = {section:'stash', page: i};
				var pageDeferred = $.Deferred();
				postThrottle.check().done(function(pageDeferred, location, i) {
					return function() {
						$.post(stashEndpoint, {league: itemsResp.character.league, tabIndex: i})
						.done(function (pageDeferred, location) {
							return function (stashResp) {
								// early exit if web server returns the "you've requested too frequently" error
								if(stashResp.error != undefined) {
									pageDeferred.reject();
									return;
								}
								
								pageDeferred.resolve(responseToItems(stashResp, location));
							};
						}(pageDeferred, location));
					};
				}(pageDeferred, location, i));
				
				stashPromises.push(pageDeferred.promise());
			}
			
			$.when.apply(null, stashPromises)
			.done(function () {
				for (var i = 0; i < arguments.length; ++i) {
					stashItems = $.merge(stashItems, arguments[i]);
				}
				deferred.resolve(stashItems);
			})
			.fail(function() {
				deferred.reject();
			});
		})
		.fail(function() {
			deferred.reject();
		});
	});

	return deferred.promise();	
}

function responseToItems(response, location) {
	items = []
	$.map(response.items, function (v) {
		// We filter out any items that are in a character response but aren't in the
		// main inventory. I.e. we don't include what you're wearing.
		if (location.section != 'character' || v.inventory_id == 'MainInventory') {
			items.push(parseItem($(v.html), location))
		}
	})
	return items;
}

function parseItem(itemDiv, loc) {
	var itemNameDiv = $('.itemName', itemDiv)[0]
	var item = {
		name: itemName(itemNameDiv),
		location: loc,
		sockets: itemSockets($('.sockets', itemDiv)[0]),
		explicitModCount: $('div .explicitMod', itemDiv).length,
		raw: $(itemDiv)
	};
	item.identified = $(':contains(Unidentified)', itemDiv).length == 0;
	item.rarity = itemRarity(itemNameDiv);
	item.baseType = itemBaseType(item);
	item.category = itemCategory(item);
	item.rareName = itemRareName(item);
	item.quality = itemQuality(itemDiv);
	item.quantity = itemQuantity(item);
	return item;
}

function itemName(itemNameDiv) {
	return itemNameDiv.innerText.replace('\n', ' ');
}

function itemBaseType(item) {
	if (!item.identified || item.rarity == 'normal') { 
		return item.name; 
	}
	if (item.rarity == 'rare') {
		return item.name.split(' ').slice(2).join(' ');
	}
	if (item.rarity == 'magic') {
		// Split off the first word and everything after "of", these are suffix mods.
		var baseType = item.name.split(' ');
		var ofLocation = baseType.indexOf('of');
		if (ofLocation >= 0) {
			baseType = baseType.slice(ofLocation - 1);
		}
		if (baseType.join(' ') in ITEM_TYPE_DATA) {
			return baseType.join(' ');
		}
		// If we didn't match, the item might have a prefix mod, split that off.
		baseType = baseType.slice(1);
		if (baseType.join(' ') in ITEM_TYPE_DATA) {
			return baseType.join(' ');
		}
		console.log(item);
		// If that didn't work, we're at a loss.
	}
	if(item.rarity == 'currency') {
		var name = item.name;
		var hasQuantity = item.name.match(/\b\d{1,2}x /);
		if(hasQuantity!=null) {
			// we have a quantity prepended to the name so chip it off.
			
			name = item.name.substring(hasQuantity[0].length);
			
		}
		return name;
	}
	// TODO(jaguilar): handle uniques.
	return item.name;
}

function itemQuantity(item) {
	var quantity = 1;
	if(item.rarity=='currency') {
		var hasQuantity = item.name.match(/\b\d{1,2}x /);
		if(hasQuantity!=null) {
			quantity = hasQuantity[0].substring(0,hasQuantity[0].length-2);
		}
	}
	return quantity;
}

function itemRarity(item) {
	if (item.className.search('Normal') != -1) { return 'normal'; }
	if (item.className.search('Rare') != -1) { return 'rare'; }
	if (item.className.search('Magic') != -1) { return 'magic'; }
	if (item.className.search('Unique') != -1) { return 'unique'; }
	if (item.className.search('Currency') != -1) { return 'currency'; }
	return 'other';
}

function itemCategory(item) {
	if (item.baseType.match(/\b(?:flask|vial)\b/i)) { return 'flask'; }
	if (item.baseType.match(/\b(?:belt|chain|sash)\b/i)) { return 'belt'; }
	if (item.baseType.match(/\(Level \d+\)/i)) { return 'skillGem'; }
	if (item.baseType.match(/\bring\b/i)) { return 'ring'; }
	if (item.baseType.match(/\bamulet\b/i)) { return 'amulet'; }
	if (item.baseType.match(/\bquiver\b/i)) { return 'quiver'; }
	if (item.baseType in ITEM_TYPE_DATA) { return ITEM_TYPE_DATA[item.baseType]; }
	if (item.baseType in CURRENCY_DATA) { return CURRENCY_DATA[item.baseType]; }
	return null;
}

function itemRareName(item) {
	if (item.rarity != 'rare' || !item.identified) { return null; }
	return item.name.split(' ').splice(0, 2).join(' ');
}

function itemSockets(sdiv) {
	if (sdiv == null) { return null; }
	var children = sdiv.children;
	var numSockets = 0;
	var maxConnected = 0;  // Max # in a connected seq.
	var numConnected = 0;  // Number of sockets in current connected seq.
	var colors = {red:false, green:false, blue:false};
	var connectionsLeft = 1;
	var tricolor = false;  // Any connected seqs with all three colors?
	for (var i = 0; i < children.length; ++i) {
		var child = children[i];
		if (connectionsLeft <= 0) {
			connectionsLeft = 1;
			numConnected = 0;
			colors.red = colors.green = colors.blue = false;
		}

		// If this is a connector, add a connection, otherwise remove one.
		if (child.className == '') {
			connectionsLeft += 1;
		} else if (child.className == 'clear') {
			break;
		} else {
			connectionsLeft -= 1;
			colors[socketColor($('img', child)[0])] = true;
			++numConnected;
			++numSockets;
			if (numConnected > maxConnected) { 
				maxConnected = numConnected; 
			}
			if (colors.red && colors.green && colors.blue) {
				tricolor = true;
			}
		}	
	}
	return {
		tricolor: tricolor,
		maxConnected: maxConnected,
		numSockets: numSockets
	};
}

function itemQuality(itemDiv) {
	var quality = $('.displayProperty', itemDiv).filter(':contains(Quality)');
	if (quality.length == 0) { return 0.0; }
	return Number(quality[0].innerText.split(' ')[1].trim().match(/\+(\d+)\%/i)[1]);
}

function itemByName(items, name) {
	return $(items.filter(function(i){return $(':contains(' + name + ')', $(i.html)).length > 0})[0].html)
}

function socketColor(simg) {
	var ctx = $('#tmpCanvas')[0].getContext('2d');
	ctx.clearRect(0, 0, 100, 100);
	ctx.drawImage(simg, 0, 0);
	var imageData = ctx.getImageData(0, 0, 100, 100);
	var sr = 0; var sg = 0; var sb = 0;
	for (var i = 0; i < imageData.width * imageData.height; i += 4) {
  		var r = imageData.data[i+0]; var g = imageData.data[i+1]; var b = imageData.data[i+2];
  		if (r == 0 && g == 0 && b == 0) { continue; }
  		else if (r > g && r > b) { sr += 1; }
  		else if (g > b) { sg += 1; }
  		else { sb += 1; }
	}
	if (sr > sg && sr > sb) { return 'red'; }
	else if (sg > sb) { return 'green'; }
	else { return 'blue'; }
}

