var aInventory = []

$('#resetCols').click(function(){
	$('#inventoryCols input[type=checkbox]:checked').prop('checked',false); 
	return false;
})


function setupInventoryRendering(items) {

	var deferred = new $.Deferred();

	aInventory = items;

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
					   'select refresh then full to try again. If the error persists, contact the author.');

		console.log('last match item processed');
		console.log(match);

		console.log('last match group processed:');
		console.log(item);
		
	}


	setupInventoryRendering(items)
		.done(function(){

			try {

				// render rare list
				$('#rareList').append( formatRareList(getSortedItems(items)) ).find('table').stupidtable();

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
							   'select refresh then full to try again. If the error persists, contact the author.');
				
			}

		})
	;


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
			.append(' (' + (item.location.page === null ? item.location.section : 'tab:' + item.location.page )  + ')' )
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
				chrome.extension.getBackgroundPage().copy(itemToString(item));
				console.log(item);
			})
		;

	return oItem;

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