

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
				console.log(item);
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
			.append( $('<td>').text( item.location.page === null ? 0 : item.location.page ).attr('title',item.location.section) )			
			// .append( $('<td>').text( item.level ) )
			.append( $('<td>').append( getItemLink(item) ) )
			/*.append( $('<td>').text( item.quality ) )
			.append( $('<td>').text( item.socketCount ) )
			.append( $('<td>').text( item.linkedSockets ) )

			.append( $('<td>').text( item.speed ) )
			.append( $('<td>').text( item.armour ) )
			.append( $('<td>').text( item.evasionRating ) )
			.append( $('<td>').text( item.energyShield ) )
			.append( $('<td>').text( item.maxMana ) )
			.append( $('<td>').text( item.maxLife ) )

			.append( $('<td>').text( item.averageDamage ) )
			.append( $('<td>').text( item.averageLightningDamage ) )
			.append( $('<td>').text( item.averageFireDamage ) )
			.append( $('<td>').text( item.averageColdDamage ) )
			.append( $('<td>').text( item.averagePhysicalDamage ) )

			.append( $('<td>').text( item.strength ) )
			.append( $('<td>').text( item.dexterity ) )
			.append( $('<td>').text( item.intelligence ) )

			.append( $('<td>').text( item.itemRarity ) )
			.append( $('<td>').text( item.itemQuantity ) )
*/

			
			.appendTo(oBody)
		;
	}

	$('<tr>')
		.append( $('<th class="type-int">').text('Tab') )		
//		.append( $('<th class="type-int">').text('Level') )
		.append( $('<th class="type-string">').text('Item') )
/*		.append( $('<th class="type-int">').text('Quality') )		
		.append( $('<th class="type-int">').text('Sockets') )	
		.append( $('<th class="type-int">').text('Links') )	

		.append( $('<th class="type-float">').text('Speed') )
		.append( $('<th class="type-int">').text('Armor') )
		.append( $('<th class="type-int">').text('Evasion') )
		.append( $('<th class="type-int">').text('E.S') )
		.append( $('<th class="type-int">').text('Mana') )
		.append( $('<th class="type-int">').text('Life') )
		.append( $('<th class="type-float">').text('Av Dam') )
		.append( $('<th class="type-float">').text('+Lght.') )
		.append( $('<th class="type-float">').text('+Fire') )
		.append( $('<th class="type-float">').text('+Cold') )
		.append( $('<th class="type-float">').text('+Phys.') )

		.append( $('<th class="type-int">').text('Str') )
		.append( $('<th class="type-int">').text('Dex') )
		.append( $('<th class="type-int">').text('Int') )
		
		.append( $('<th class="type-int">').text('+Rare') )
		.append( $('<th class="type-int">').text('+Quan') )
*/

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