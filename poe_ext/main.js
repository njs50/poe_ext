var aInventory = []

$('#resetCols').click(function(){
	$('#inventoryCols input[type=checkbox]:checked').prop('checked',false); 
	return false;
})


function setupInventoryRendering(items) {

	var deferred = new $.Deferred();

	// setup available properties
	var oPropUL = $('ul#viewProps').empty();
	for (var key in oProps) {
		var id = key.replace(/[^a-zA-Z]/g,'_');
		oPropUL.append('<li><label class="checkbox inline" for="prop_' + id + '"><input class="checkbox inline" type="checkbox" id="prop_' + id + '" name="viewProps" value="' + key + '" />' + key + '</label></li>');
	}
	sortUL(oPropUL);


	// setup available mods
	var oModUL = $('ul#viewMods').empty();
	for (var key in oMods) {
		var id = key.replace(/[^a-zA-Z]/g,'_');
		oModUL.append('<li><label class="checkbox inline" for="mod_' + id + '"><input class="checkbox inline" type="checkbox" id="mod_' + id + '" name="viewMods" value="' + key + '" />' + key + '</label></li>');
	}
	sortUL(oModUL);



	// setup available calculated cols
	var oCalcUL = $('ul#viewCalculated').empty();
	for (var key in oCalc) {
		var id = key.replace(/[^a-zA-Z]/g,'_');
		oCalcUL.append('<li><label class="checkbox inline" for="calc_' + id + '"><input class="checkbox inline" type="checkbox" id="calc_' + id + '" name="viewCalc" value="' + key + '" />' + key + '</label></li>');
	}
	sortUL(oCalcUL);


	// setup available requirements
	var oReqUL = $('ul#viewReqs').empty();
	for (var key in oRequired) {
		var id = key.replace(/[^a-zA-Z]/g,'_');
		oReqUL.append('<li><label class="checkbox inline" for="req_' + id + '"><input class="checkbox inline" type="checkbox" id="req_' + id + '" name="viewReq" value="' + key + '" />' + key + '</label></li>');
	}
	sortUL(oReqUL);

	// setup available types
	var oTypeUL = $('ul#viewTypes').empty();
	for (var key in oTypes) {
		var id = key.replace(/[^a-zA-Z]/g,'_');
		oTypeUL.append('<li><label class="checkbox inline" for="type_' + id + '"><input class="checkbox inline" checked type="checkbox" id="type_' + id + '" name="viewType" value="' + key + '" />' + key + '</label></li>');
	}
	sortUL(oTypeUL);
	$('<li><label class="checkbox inline"><input class="checkbox inline toggleCheckboxes" checked type="checkbox" data-toggling="viewType" id="toggleTypes">Select All / None</label></li>').prependTo(oTypeUL);

	// setup available rarity
	var oRarityUL = $('ul#viewRarity').empty();
	for (var key in oRarity) {
		var id = key.replace(/[^a-zA-Z]/g,'_');
		oRarityUL.append('<li><label class="checkbox inline" for="rarity_' + id + '"><input class="checkbox inline" checked type="checkbox" id="rarity_' + id + '" name="viewRarity" value="' + key + '" />' + capitaliseFirstLetter(key) + '</label></li>');
	}
	sortUL(oRarityUL);
	$('<li><label class="checkbox inline"><input class="checkbox inline toggleCheckboxes" checked type="checkbox" data-toggling="viewRarity" id="toggleTypes">Select All / None</label></li>').prependTo(oRarityUL);

	// add select all/none checkboxes to types and rarity
	$('input.toggleCheckboxes').click(function(){
		$('input[name=' + $(this).data('toggling') + ']').prop('checked',$(this).prop('checked'));
	});

	// load previous settings
	var oPromise = getCache('inventoryCols')
	
		.done(function(aCols){
			$(aCols.toString()).prop('checked',true);			
			deferred.resolve();
		})
	
		.fail(function(aCols){							
			deferred.resolve();
		})
	;

	return deferred.promise();

}

$('#applyColSelection').click(function(){


	var aSelected = [];
	
	$('input[name=viewProps]:checked').each(function(idx,item){
		aSelected.push('#' + $(item).attr('id'));
	});	
	$('input[name=viewMods]:checked').each(function(idx,item){
		aSelected.push('#' + $(item).attr('id'));
	});	
	$('input[name=viewCalc]:checked').each(function(idx,item){
		aSelected.push('#' + $(item).attr('id'));
	});	
	$('input[name=viewReq]:checked').each(function(idx,item){
		aSelected.push('#' + $(item).attr('id'));
	});

	setCache('inventoryCols',aSelected);

	$('#rareList').empty().append( formatRareList(getSortedItems(aInventory),false) ).find('table').stupidtable();

	$('#openRareList').trigger('click');

})

$('#applyItemSelection').click(function(){

	$('#rareList').empty().append( formatRareList(getSortedItems(aInventory),false) ).find('table').stupidtable();
	$('#openRareList').trigger('click');

})

$('#applyIgnoreLocations').click(function(){

	renderCrafting(aInventory)
	// currentLeague

});

function getCraftingIgnores(){
	var aIgnoreTabs =[];
	var aIgnoreChars =[];

	$('input[name=ignoreTabs]:checked').each(function(idx,item){
		aIgnoreTabs.push(parseInt($(item).val()));
	});

	$('input[name=ignoreChars]:checked').each(function(idx,item){
		aIgnoreChars.push($(item).val());
	});

	return {chars: aIgnoreChars, tabs:aIgnoreTabs };	
}


function getCraftingItems(items){
	var craftItems = [];

	var oIgnore = getCraftingIgnores();

	$.map(items,function(item){
		if(item.location.section === 'stash' && oIgnore.tabs.indexOf(item.location.page) === -1) {
			craftItems.push(item);
		} else if (item.location.page === 'Inventory' && oIgnore.chars.indexOf(item.location.section) === -1) {
			craftItems.push(item);
		}
	});

	return craftItems;
}

function renderCrafting(items) {

	try {
	


		var matches = allMatches(getCraftingItems(items));

		var idx = 0;
		var item = {};
		var match = {};

		$('ul#craftingTabs,div#crafting-content').empty();

		for (var item in matches) {
			idx++;

			// add navigation entry
			$('ul#craftingTabs').append('<li class="crafting-page"><a data-index="' + idx + '">' + item + '</a></li>');

			// add content div
			var oDiv = $('<div class="hide crafting-block" data-index="' + idx + '">');

			// add title
			oDiv.append('<h2>' + item + '</h2>');

			var oTable = $('<table class="table table-striped table-condensed"><thead><tr><th class="type-int">%<th>Matched</th><th>Missing</th><thead></table>');

			var oTBody = $('<tbody>').appendTo(oTable);

			var match_group = matches[item];

			for (var i = 0; i < match_group.length; i++) {
				match = match_group[i];				
				// calculate the distance between each item (in tabs, 0 for inventory)
				var distance = 0;
				var last_node = 0;
				for (var j = 0; j < match.items.length; j++) {
					if (last_node === 0) last_node = match.items[j].location.tabIndex;
					if(match.items[j].location.tabIndex !== 0) {
						distance += Math.abs(match.items[j].location.tabIndex - last_node);
						last_node = match.items[j].location.tabIndex
					}
				}
				match.distance = distance;
			}

			// sort on distance			
			match_group.sort(function(a,b) {
				return a.distance - b.distance;
			});			


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

			// sort crafting tabs
			$('div#crafting-content').append(oDiv);

		}

		sortUL('#craftingTabs');

		$('ul#craftingTabs').append('<li class="divider"></li><li><a id="openCraftingFilters" data-toggle="modal" href="#craftingFilters">Configure Crafting</a></li>')

		$('ul#craftingTabs li.crafting-page a').click(function(){
			$('#rareList').hide();
			$('div#crafting-content div.crafting-block').hide();
			$('ul.nav li,ul#craftingTabs li').removeClass('active');
			$(this).parent().addClass('active');		
			$(this).closest('.dropdown').addClass('active');		
			$('div#crafting-content div[data-index=' + $(this).data('index') + ']').show();
		});

	} catch (e) {

		console.log('error occured while processing/rendering crafting matches');
		errorDump(e);

		$('#err').html('An error occured while processing matches in the stash. Please ' +
					   'select refresh then full to try again. If the error persists, contact the author.');

		console.log('last match item processed');
		console.log(match);

		console.log('last match group processed:');
		console.log(item);
		
	}



}

function processItems(items){

	var deferred = new $.Deferred();

	// used to rerender the page
	aInventory = items;

	// seems to be used by the clipboard
	currentItems = items;

	renderCrafting(items);

	setupInventoryRendering(items)
		.done(function(){

			try {

				// render rare list
				$('#rareList').append( formatRareList(getSortedItems(items)) ).find('table').stupidtable();				

				$('#openRareList')		
					.click(function(){				
						$(this).closest('.dropdown').addClass('active');
						$('div#crafting-content div.crafting-block').hide();
						$('#rareList').show();						
						$('ul.nav li,ul#craftingTabs li').removeClass('active');
						$(this).parent().addClass('active');
					});					
				;

				deferred.resolve();
	
			} catch (e) {

				console.log('error occured while rendering stash');
				errorDump(e);

				$('#err').html('An error occured while rendering the stash. Please ' +
							   'select refresh then full to try again. If the error persists, contact the author.');
				
			}

		})
	;

	return deferred.promise();

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
			.append(' (' + item.location.section + ':' + item.location.page  + ')' )
			.appendTo(oUL)
		;

	}

	return oUL;

}

function getItemLink(item) {

		var oItem = $('<a>')
			.append(item.name)
			.addClass('item-' + item.rarity)
			
			.popover({
				//title: item.name, 
				content: function(){ 		

					var html = $('<div>').append('<img src="' + item.rawItem.icon + '" class="pull-left"/>');
					
					if (item.sockets.numSockets > 0) {
						html.append(displaySockets(item));
					}

					$('<pre class="pull-left">')
						.append(itemToString(item))
						.appendTo(html)
					;


					$('<div class="clearfix">').appendTo(html);	
					return html;
				},
				placement: 'bottom',
				template: '<div class="popover"><div class="arrow"></div><div class="popover-inner"><div class="popover-content"><p></p></div></div></div>',
				delay: { show: 500, hide: 100 }				
			})
			.click(function(){
				copy_cb(itemToString(item));
				console.log(item);
			})
		;

	return oItem;

}

function displaySockets(item) {
	
	// Simulate vertical alignment depending on the item type and number of sockets
	var adjustRatio = item.rawItem.h - Math.ceil(item.sockets.numSockets / item.rawItem.w);
	var globalOffsetY = '';
	if (adjustRatio > 0) {
		globalOffsetY = '; margin-top: ' + (adjustRatio * 25) + 'px';
	}
	
	var sockets = $('<div class="sockets" style="width: ' + parseInt(48 * item.rawItem.w) + 'px; height: ' + $('.itemIcon').height() + 'px' + globalOffsetY + '">');
	var icon = {};
	icon['S'] = 'http://www.pathofexile.com/gen/image/YTozOntpOjA7aTo1O2k6/MjthOjI6e3M6Mjoic3Qi/O3M6MDoiIjtzOjY6ImNv/bG91ciI7czoxOiJTIjt9/aToxO2k6NTt9/cba0412822/Socket.png';
	icon['D'] = 'http://www.pathofexile.com/gen/image/YTozOntpOjA7aTo1O2k6/MjthOjI6e3M6Mjoic3Qi/O3M6MDoiIjtzOjY6ImNv/bG91ciI7czoxOiJEIjt9/aToxO2k6NTt9/24adcb67af/Socket.png';
	icon['I'] = 'http://www.pathofexile.com/gen/image/YTozOntpOjA7aTo1O2k6/MjthOjI6e3M6Mjoic3Qi/O3M6MDoiIjtzOjY6ImNv/bG91ciI7czoxOiJJIjt9/aToxO2k6NTt9/b39c59da99/Socket.png';
	var link = {};
	link['H'] = 'http://www.pathofexile.com/gen/image/YTozOntpOjA7aTo1O2k6/MjthOjM6e3M6NDoidHlw/ZSI7czo2OiJzb2NrZXQi/O3M6Mjoic3QiO3M6NDoi/bGluayI7czo0OiJ2ZXJ0/IjtiOjA7fWk6MTtpOjU7/fQ,,/ba11e10fa2/Socket_Link_Horizontal.png';
	link['V'] = 'http://www.pathofexile.com/gen/image/YTozOntpOjA7aTo1O2k6/MjthOjM6e3M6NDoidHlw/ZSI7czo2OiJzb2NrZXQi/O3M6Mjoic3QiO3M6NDoi/bGluayI7czo0OiJ2ZXJ0/IjtiOjE7fWk6MTtpOjU7/fQ,,/3b93f7f851/Socket_Link_Vertical.png';
	var cssPosition = new Array("pull-left", "pull-right", "pull-right", "pull-left", "pull-left", "pull-right");
	
	// Adjust horizontal alignment for the unique socket on a 2-square width item case
	var globalOffsetX = '';
	if (item.rawItem.w > 1 && item.sockets.numSockets == 1) {
		globalOffsetX = ' style="margin-left: 24px"';
	}
	
	var activeGroup = 0;
	for (var i = 0; i < item.sockets.numSockets; i++) {
		// Socket
		sockets.append('<img src="' + icon[item.rawItem.sockets[i].attr] + '" alt="" class="' + cssPosition[i] + '"' + globalOffsetX + ' />');
		
		// Link
		if (item.rawItem.w == 1) {
			// Item width is 1
			if (i == 1 && item.rawItem.sockets[i].group == activeGroup) {
				// 1st vertical link
				sockets.append('<img src="' + link['V'] + '" class="link" style="top: 35px; left: 15px" />');
			}
			if (i == 2 && item.rawItem.sockets[i].group == activeGroup) {
				// 2nd vertical link
				sockets.append('<img src="' + link['V'] + '" class="link" style="top: 83px; left: 15px" />');
			}
		} else {
			// Item width is 2
			if (i == 1 && item.rawItem.sockets[i].group == activeGroup) {
				// 1st horizontal link
				sockets.append('<img src="' + link['H'] + '" class="link" style="top: 15px; left: 35px" />');
			}
			if (i == 2 && item.rawItem.sockets[i].group == activeGroup) {
				// 1st vertical link (right)
				sockets.append('<img src="' + link['V'] + '" class="link" style="top: 35px; left: 63px" />');
			}
			if (i == 3 && item.rawItem.sockets[i].group == activeGroup) {
				// 2nd horizontal link
				sockets.append('<img src="' + link['H'] + '" class="link" style="top: 63px; left: 35px" />');
			}
			if (i == 4 && item.rawItem.sockets[i].group == activeGroup) {
				// 2nd vertical link (left)
				sockets.append('<img src="' + link['V'] + '" class="link" style="top: 83px; left: 15px" />');
			}
			if (i == 5 && item.rawItem.sockets[i].group == activeGroup) {
				// 3nd horizontal link
				sockets.append('<img src="' + link['H'] + '" class="link" style="top: 111px; left: 35px" />');
			}
		}
		
		activeGroup = item.rawItem.sockets[i].group;
	}
	
	return sockets;
}

function itemToString(item) {
	
	var oRaw = item.rawItem;
	var sItem = '';
	sItem += 'Rarity: ' + capitaliseFirstLetter(item.rarity) + '\n';
	sItem += oRaw.name + '\n';
	sItem += oRaw.typeLine + '\n';
	

	if (oRaw.hasOwnProperty('properties')) {						
		sItem += '--------\n';
		for (var i = 0; i < oRaw.properties.length; i++) {
			var oThis = oRaw.properties[i];
			sItem += oThis.name + ': ' + oThis.value;
			if(oThis.augmented) sItem += ' (augmented)';
			sItem += '\n';
		}
	}

	if (oRaw.hasOwnProperty('implicitMods')) {						
		sItem += '--------\n';
		for (var i = 0; i < oRaw.implicitMods.length; i++) {
			sItem += oRaw.implicitMods[i] + '\n';
		}
	}

	if (oRaw.hasOwnProperty('requirements')) {						
		sItem += '--------\n';
		for (var i = 0; i < oRaw.requirements.length; i++) {
			var oThis = oRaw.requirements[i];
			sItem += oThis.name + ': ' + oThis.value + '\n';
		}
	}

	if (oRaw.hasOwnProperty('explicitMods')) {						
		sItem += '--------\n';
		for (var i = 0; i < oRaw.explicitMods.length; i++) {
			sItem += oRaw.explicitMods[i] + '\n';
		}
	}

	if (oRaw.hasOwnProperty('flavourText')) {						
		sItem += '--------\n';
		for (var i = 0; i < oRaw.flavourText.length; i++) {
			sItem += oRaw.flavourText[i] + '\n';
		}
	}

	return sItem;

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

	var oTable = $('<table class="table table-condensed table-striped">');		

	var oHead = $('<thead>');

	var oBody = $('<tbody>');

	var oView = {
		props: [],
		mods: [],
		calculated: [],
		reqs: []
	};

	$('input[name=viewProps]:checked').each(function(idx,item){
		oView.props.push($(item).val());
	});
	
	$('input[name=viewMods]:checked').each(function(idx,item){
		oView.mods.push($(item).val());
	});
	
	$('input[name=viewCalc]:checked').each(function(idx,item){
		oView.calculated.push($(item).val());
	});
	
	$('input[name=viewReq]:checked').each(function(idx,item){
		oView.reqs.push($(item).val());
	});


	for (var i = 0; i < sortedRares.length; ++i) {

		var item = sortedRares[i];

		var tr = $('<tr>')
			.addClass(oTypes[item.itemRealType])
			.addClass(oRarity[item.rarity])
			.append( $('<td>').text( item.location.page === null ? 0 : item.location.page ).attr('title',item.location.section) )			
			.append( $('<td>').append( getItemLink(item) ) )
		;

		for (var j = 0; j < oView.props.length; j++) {
			tr.append( $('<td>').text( item.properties.hasOwnProperty(oView.props[j]) ? item.properties[oView.props[j]] : '' ) );
		}
		for (var j = 0; j < oView.mods.length; j++) {
			tr.append( $('<td>').text( item.combinedMods.hasOwnProperty(oView.mods[j]) ? item.combinedMods[oView.mods[j]] : '' ) );
		}
		for (var j = 0; j < oView.calculated.length; j++) {
			tr.append( $('<td>').text( item.calculated.hasOwnProperty(oView.calculated[j]) ? item.calculated[oView.calculated[j]] : '' ) );
		}
		for (var j = 0; j < oView.reqs.length; j++) {
			tr.append( $('<td>').text( item.requirements.hasOwnProperty(oView.reqs[j]) ? item.requirements[oView.reqs[j]] : '' ) );
		}
		
		tr.appendTo(oBody);
	}

	var th = $('<tr>')
		.append( $('<th class="type-int">').text('Tab') )		
		.append( $('<th class="type-string">').text('Item') )
	;
	
	for (var j = 0; j < oView.props.length; j++) {
		th.append( $('<th class="type-float">').text(oView.props[j]) );
	}
	for (var j = 0; j < oView.mods.length; j++) {
		th.append( $('<th class="type-int">').text(oView.mods[j]) );
	}
	for (var j = 0; j < oView.calculated.length; j++) {
		th.append( $('<th class="type-float">').text(oView.calculated[j]) );
	}
	for (var j = 0; j < oView.reqs.length; j++) {
		th.append( $('<th class="type-int">').text(oView.reqs[j]) );
	}

	th.appendTo(oHead);

	oTable
		.append(oHead)
		.append(oBody)
	;		

	return oTable;
}

function getSortedItems(items) {
	
	var sortedRares = [];
	var oRarity = {};
	var oType = {};

	$('input[name=viewRarity]:checked').each(function(idx,item){
		oRarity[$(item).val()] = true;
	});	

	$('input[name=viewType]:checked').each(function(idx,item){
		oType[$(item).val()] = true;
	});	

	for (var i = 0; i < items.length; i++) {
		var oThis = items[i];
		if (oRarity[oThis.rarity] === true && oType[oThis.itemRealType] === true ) sortedRares.push(oThis);
	}

	// sort on rare name
	 sortedRares.sort(function(a,b) {
		if(a.rareName<b.name) {
			return -1;
		}
		else if(a.name>b.name) {
			return 1;
		}
		return 0;
	});
	
	return sortedRares;
	
}


function getSortedRares(items) {
	var available = getCraftingItems(items);
	
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