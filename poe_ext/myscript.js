
function parseError(item,message) {
	console.log('<--- error begins...');
	console.log(item);
	console.log(message);
	console.log('error ends --->');
}






function parseItem(rawItem, loc) {


	try{

		var item = {
			location: loc,
			rarity: '',
			quality: 0,
			name: $.trim(rawItem.name + ' ' + rawItem.typeLine),
			identified: rawItem.identified,
			properties: {},
			explicitMods: {},
			implicitMods: {},
			combinedMods: {},
			requirements: {},
			sockets: {},
			calculated: {Quantity: 1},
			parentCategory: '',
			rawItem: rawItem

		};

		/*
		// item rarity
		if (rawItem.hasOwnProperty('normal') && rawItem.normal) item.rarity = 'normal';
		else if (rawItem.hasOwnProperty('magic') && rawItem.magic) item.rarity = 'magic';
		else if (rawItem.hasOwnProperty('rare') && rawItem.rare) item.rarity = 'rare';
		else if (rawItem.hasOwnProperty('unique') && rawItem.unique) item.rarity = 'unique';
		else if (rawItem.hasOwnProperty('gem') && rawItem.gem) item.rarity = 'skillGem';
		else if (rawItem.hasOwnProperty('currency') && rawItem.currency) {
			item.rarity = 'currency';
			var aMatch = item.name.match(/^\s*(\d+)x\s+(.*)$/);
			if (aMatch) {
				item.calculated.Quantity = aMatch[1];
				item.name = aMatch[2] + ' x' + aMatch[1];
				item.baseType = aMatch[2];
			} else {
				item.baseType = item.name;
			}
		}
		//if (item.rarity == '') parseError(item,'unknown item rarity');
		*/

		// item rarity
		switch(rawItem.frameType) {
			case 0: item.rarity = 'normal'; break;
			case 1: item.rarity = 'magic'; break;
			case 2: item.rarity = 'rare'; break;
			case 3: item.rarity = 'unique'; break;
			case 4:
				item.rarity = 'skillGem';
				break;
			case 5:
				item.rarity = 'currency';
				item.baseType = item.name;
				item.calculated.Quantity = rawItem.properties[0].values[0]; //TODO: regex the actualy quantity
				break;
			case 6: item.rarity = 'quest'; break;
			default:
				parseError(item, 'unknown item rarity');
		}

		item.baseType = itemBaseType(item);

		// get the item category if it's not a skill gem
		if (item.rarity !== 'skillGem') {
			item.category = itemCategory(item.baseType);
			if (item.category === 'weapon1h' || item.category === 'weapon2h') {
				item.parentCategory = item.category;
				item.category = item.rawItem.properties[0].name.replace(/ /g,'');
			} else if ($.inArray(item.category, ['head', 'chest', 'hands', 'feet','shield']) !== -1) {
				item.parentCategory = 'armor';
			} else if ($.inArray(item.category, ['amulet', 'belt', 'ring', 'quiver']) !== -1) {
				item.parentCategory = 'accessory';
			} else {
				item.parentCategory = 'misc'
			}
			if(item.category === null)  parseError(item,'unknown item category');
		} else {
			item.category = 'skillGem';
		}



		// get properties/mods/requirements into usable format
		if (rawItem.hasOwnProperty('requirements')) item.requirements = nameValueArrayToObj(rawItem.requirements,oRequired);

		// flasks and skillgems have some odd properties etc we don't want in the mix
		if (item.category !== 'skillGem' && item.rarity !== 'currency' && item.category != 'flask') {

			if (rawItem.hasOwnProperty('properties')) item.properties = nameValueArrayToObj(rawItem.properties,oProps);
			if (rawItem.hasOwnProperty('explicitMods')) item.explicitMods = processMods(rawItem.explicitMods,oMods);
			if (rawItem.hasOwnProperty('implicitMods')) item.implicitMods = processMods(rawItem.implicitMods,oMods);

			// combine explicit and implicit mods
			item.combinedMods = combineMods(item.explicitMods,item.implicitMods);

		}

		item.properties['Base Type'] = item.baseType;
		oProps['Base Type'] = '';

		// get quality (gems and flasks need to be checked for this as props weren't parsed...)

		item.quality = itemQuality(item);

		if (item.properties.hasOwnProperty('Quality')) {
			item.properties['Quality'] = item.quality.toString() +'%';
		}

		item.itemRealType = item.baseType;

		var tmpCat = '';

		if (item.rarity == 'currency') {
			tmpCat = "Currency";
		} else if (item.category) {
			tmpCat =  item.category.charAt(0).toUpperCase() + item.category.slice(1);
		}

		if (!oTypes.hasOwnProperty(tmpCat)) oTypes[tmpCat] = {};
		if (!oTypes[tmpCat].hasOwnProperty(item.itemRealType)) oTypes[tmpCat][item.itemRealType] = '';

		item.rareName = itemRareName(item);

		item.sockets = itemSockets(rawItem);

		// calculated properties
		item.calculated['Average Lightning Damage'] = getAverageDamageOfType(item,'Lightning Damage');
		item.calculated['Average Cold Damage'] = getAverageDamageOfType(item,'Cold Damage');
		item.calculated['Average Fire Damage'] = getAverageDamageOfType(item,'Fire Damage');
		item.calculated['Average Chaos Damage'] = getAverageDamageOfType(item,'Chaos Damage');
		item.calculated['Average Physical Damage'] = getAverageDamageOfType(item,'Physical Damage');
		item.calculated['Average Damage'] = averageDamage(item);
		item.calculated['Max Linked Sockets'] = item.sockets.maxConnected;
		item.calculated['Sockets'] = item.sockets.numSockets;

		/*
		item.linkedSockets = getSocketLinkage(itemDiv);
		item.socketCount = item.sockets == null ? 0 : item.sockets.numSockets;
		*/

		// if the cacl'd properties cols aren't yet set, add them all
		if (!oCalc.hasOwnProperty('Average Damage')) {
			for (var key in item.calculated) {
				oCalc[key] = '';
			}
		}

	} catch(e) {

		console.log('Error parsing item from stash');
		console.log('Raw Item Data:');
		console.log(rawItem);
		console.log('Processed Item');
		console.log(item);

		errorDump(e);

		$('#err').html('An error occured while parsing an item in the stash. Please ' +
						'click refresh to try again. If the error persists, contact the author.');

	}

//	item.prefixes = itemPrefixes(item);
//	item.suffixes = itemSuffixes(item);
	return item;
}

function nameValueArrayToObj(aPairs, oKeys){
	var max  = aPairs.length;
	var oRet = {};
	for (var i = 0; i < max; i++){

		var key = aPairs[i].name;

		var keylen = aPairs[i].values.length;

		// some properties dont have a value
		if (keylen === 0) {

			oRet[key] = '';

		} else {

			var val = '';

			if (key == "Elemental Damage") {

				var sItem = "";
				var oThis = aPairs[i];

				for (var j = 0; j < keylen; j++) {

					// add the value of the damage
					sItem += oThis.values[j][0];

					// add the type of the elemental damage
					switch (oThis.values[j][1]) {
						case 4: sItem += ' (fire)'; break;
						case 5: sItem += ' (cold)'; break;
						case 6: sItem += ' (lightning)'; break;
						default: sItem += ''; break;
					}

					// skip the last comma
					if (j < keylen - 1) sItem += ", ";
				}

				val = sItem;

			} else {

				val = aPairs[i].values[0][0];
				if (val[0] === '<') val = $(val).text();
			}


			oRet[key] = val;
			if (!oKeys.hasOwnProperty(key)) oKeys[key] = '';

		}

	}
	return oRet;
}


function itemCategory(baseType) {
	if (baseType in ITEM_TYPE_DATA) { return ITEM_TYPE_DATA[baseType]; }
	if (baseType in CURRENCY_DATA) { return CURRENCY_DATA[baseType]; }

	// got changed in 0.9.12
	//if (baseType.match(/\(Level \d+\)/i)) { return 'skillGem'; }

	if (baseType.match(/\b(?:flask|vial)\b/i)) { return 'flask'; }
	if (baseType.match(/\bquiver\b/i)) { return 'quiver'; }
	return null;
}


var oTop = {};
var oLeft = {};

function getSocketLinkage(itemDiv) {

	var aSockets = $(itemDiv).find('div.sockets img[src$="Socket_Link_Horizontal.png"], div.sockets img[src$="Socket_Link_Vertical.png"]');

	if (aSockets.length == 0) return 0;
	if (aSockets.length == 1) return 2;

	var nodes = {};

	var setMaxLink = function(num) {
		for (var i = 1; i <= num; i++) {
			nodes[i] = [i];
		}
	}

	var addLink = function(nodeSource,nodeTarget) {

		//console.log('joining ' + nodeSource + ' to ' + nodeTarget );

		var aMerged = union_arrays(nodes[nodeSource],nodes[nodeTarget]);

		for (var i= 0; i < aMerged.length; i++) {
			nodes[aMerged[i]] = aMerged;
		}

	}

	setMaxLink(6);

	aSockets.each(function(index, item){

		item = $(item)

		var oLink = item.parent();
		var coords = oLink.attr('style').replace(/^.*top:(\d+).*left:(\d+).*$/,'($1,$2)')

		switch(coords) {

			case('(15,34)'):
				addLink(1,2);
				break;
			case('(62,34)'):
				addLink(3,4);
				break;
			case('(110,34)'):
				addLink(5,6);
				break;
			case('(34,15)'):
				addLink(1,3);
				break;
			case('(34,62)'):
				addLink(2,4);
				break;
			case('(82,15)'):
				addLink(3,5);
				break;
			case('(82,62)'):
				addLink(4,6);
				break;

			default:
				console.log('invalid coordinates for link: ' + coords);

		}

	});

	var maxlength = 0;

	for (var idx in nodes) {
		if (nodes[idx].length > maxlength) maxlength = nodes[idx].length;
	}

	return maxlength;

}


function union_arrays (x, y) {
  var obj = {};
  for (var i = x.length-1; i >= 0; -- i) obj[x[i]] = x[i];
  for (var i = y.length-1; i >= 0; -- i) obj[y[i]] = y[i];

  var res = []
  for (var k in obj) {
    res.push(obj[k]);
  }
  return res;
}


function averageDamage(item) {

	var dps = 0;

	var aTemp, aTemp2 = [];

	// if this is a weap, work it out as dps?
	if (item.parentCategory === 'weapon1h' || item.parentCategory === 'weapon2h') {

		// physical
		aTemp = item.properties['Physical Damage'].split('-');

		dps += ( parseInt(aTemp[0],10) + parseInt(aTemp[1],10) ) / 2;
		if (item.properties.hasOwnProperty('Elemental Damage')) {

			aTemp = item.properties['Elemental Damage'].split(', ');

			aTemp2 = $.map(aTemp,function(range){
				dps += calcAvRange(range);
			});

		}

		// for weaps multiply av dam by dps
		dps = Math.round(dps * parseFloat(item.properties['Attacks per Second']) * 10) / 10;

	} else {
		// not a weap, add up any elemental bonuses
		dps += item.calculated['Average Lightning Damage'];
		dps += item.calculated['Average Cold Damage'];
		dps += item.calculated['Average Fire Damage'];
		dps += item.calculated['Average Chaos Damage'];
		dps += item.calculated['Average Physical Damage'];
	}

	return dps;

}

function getAverageDamageOfType(item,mod) {
	if (item.properties.hasOwnProperty(mod)) return calcAvRange(item.properties[mod]);
	return item.combinedMods.hasOwnProperty(mod) ? calcAvRange(item.combinedMods[mod]) : 0;
}

function calcAvRange(range) {
	if (range.indexOf('-') > 0) var aTemp2 = range.split('-');
	else var aTemp2 = range.split(' to ');
	return ( parseInt(aTemp2[0]) + parseInt(aTemp2[1]) ) / 2;
}

// possibly need to combine an implicit + explicit mod.
function getPropertyOrModsInt(item,prop) {
	if (item.properties.hasOwnProperty(prop)) return item.properties[prop];

	var amt = 0;

	if (item.implicitMods.hasOwnProperty(prop)) amt += parseInt(item.implicitMods[prop]);
	if (item.explicitMods.hasOwnProperty(prop)) amt += parseInt(item.explicitMods[prop]);

	return amt;
}

function combineMods(explicitMods,implicitMods){

	var oCombined = {};
	for (var key in explicitMods) {
		oCombined[key] = explicitMods[key];
	}
	for (var key in implicitMods) {
		if (oCombined.hasOwnProperty(key)) {

			// can be int, % or range (x-y)
			var a = oCombined[key];
			var b = implicitMods[key];

			if (a.indexOf('-') > 0){
				// range
				a = a.split('-');
				b = b.split('-');
				oCombined[key] = (parseInt(a[0]) + parseInt(b[0])) + '-' + (parseInt(a[1]) + parseInt(b[1]));
			} else if (a.indexOf('%') > 0) {
				// percents
				a = parseInt(a.replace('%',''));
				b = parseInt(b.replace('%',''));
				oCombined[key] = a + b + '%';
			} else {
				oCombined[key] = parseInt(a) + parseInt(b);
			}

		} else {
			oCombined[key] = implicitMods[key];
		}
	}

	// add "elemental resistance" onto their respective elements
	if (oCombined.hasOwnProperty('% Elemental Resistances')){
		var allEleRes = parseInt(oCombined['% Elemental Resistances'],10);
		oCombined['% Lightning Resistance'] = parseInt(oCombined['% Lightning Resistance'] || 0,10) + allEleRes + '%';
		oCombined['% Cold Resistance'] = parseInt(oCombined['% Cold Resistance'] || 0,10) + allEleRes + '%';
		oCombined['% Fire Resistance'] = parseInt(oCombined['% Fire Resistance'] || 0,10) + allEleRes + '%';
	}

	return oCombined;

}

function processMods(aExplicit,oKeys) {

	var oExplicit = {};

	var bonusRegexp =   /^\+?(\d+) [^A-Z]*(.*)$/;
	var percentRegexp = /^\+?(\d+%) [^A-Z]*(.*)$/;
	var damRegexp = /^Adds (\d+-\d+) (.* Damage)$/i;


	var aMatch = [];

	for(var i = 0; i < aExplicit.length; i++) {

		var thisMod = aExplicit[i];
		var key = '';

		aMatch = bonusRegexp.exec(thisMod);
		if (aMatch !== null) {
			key = '+ ' + aMatch[2];
		} else {
			aMatch = percentRegexp.exec(thisMod);
			if (aMatch !== null) {
				key = '% ' + aMatch[2];

			} else {
				aMatch = damRegexp.exec(thisMod);
				if (aMatch !== null) key = aMatch[2];
			}
		}

		if (aMatch !== null) {
			oExplicit[key] = aMatch[1];
			if (!oKeys.hasOwnProperty(key)) oKeys[key] = '';
		}

	}

	return oExplicit;

}

function itemLevel(item) {

	if (item.requirements.hasOwnProperty('Required Level')) return parseInt(item.requirements['Required Level'],10);
	if (item.properties.hasOwnProperty('Required Level')) return parseInt(item.properties['Required Level'],10);

	if (item.category == 'skillGem') console.log(item);

	return 1;
}

function itemRealType(item){

	if (item.properties.hasOwnProperty('Weapon Class') ) {
		return item.properties['Weapon Class'];
	}

	if (item.rarity == 'currency') return 'Currency';

	if (item.category !== null) return capitaliseFirstLetter(item.category);

	return '';

}


function itemBaseType(item) {
	if(item.rarity == 'currency') {
		return item.baseType;
	}

	if (!item.identified || item.rarity == 'normal') {
		// get rid off the "Superior"
		return item.name.replace(/^Superior /, '');
	}

	if (item.rarity == 'rare') {
		// some rares have an additional space that needs to be trimmed
		return item.name.split(' ').slice(2).join(' ').replace(/^ /, '');
	}

	if (item.rarity == 'magic') {

		// get rid of any suffix mods.
		var baseType = item.name.replace(/\s+of.*$/,'');
		var aWords = baseType.split(' ');

		// we need to check each combination of the words to see if it's in item data.
		// max length of basetype is 3 words (that i've found so far...)
		//i.e
		// Ample Sacred Hybrid Flask. check Sacred Hybrid Flask then Hybrid Flask then Flask
		for (var i = Math.max(0, aWords.length-3); i<aWords.length; i++ ) {
			var baseName = aWords.slice(i).join(' ');
			if (baseName in ITEM_TYPE_DATA) return baseName;
		}

		// at this point we SHOULD have a potion.
		// but we might also have an unrecognised prefix
		// or an unrecognised item basetype

		// we can reliably recognise a potion

		// njs: not sure why these aren't in item data?
		if(baseType.match(/\b(?:flask|vial)\b/i)) {
			// though if it's both a potion AND an unrecognised prefix we've got a problem.
			return baseType;
		}

		// we must have an unrecognised  item type
		console.log("Unrecognised item type: " + baseType);
		console.log(item);

		return baseType;

	}

	// TODO(jaguilar): handle uniques.
	if (item.rarity == 'unique') {
		if (item.rawItem.typeLine.length > 0) return item.rawItem.typeLine;
	}

	return item.name;
}



function itemRareName(item) {
	var splitName;
	var combinedName;

	if (item.rarity != 'rare' || !item.identified) { return null; }

	splitName = item.name.split(' ');
	combinedName = splitName[0] + ' ' + splitName[1];

	// some rares have an additional space and wont give an alch
	// if sold to a vendor with a matching rare
	if (splitName[2] == '') {
		combinedName += ' ';
	}

	return combinedName;
}

function itemSockets(rawItem) {

	var numSockets = 0;
	var tricolor = false;  // Any connected seqs with all three colors?
	var maxConnected = 0;  // Max # in a connected seq.


	if (rawItem.hasOwnProperty('sockets')) {

		var aSockets = rawItem.sockets;
		var oSockets = {};

		// convert array into a struct of socket groups + number of each socket type
		$.each(aSockets,function(idx,item){
			if (!oSockets.hasOwnProperty(item.group)) oSockets[item.group] = {};
			if (!oSockets[item.group].hasOwnProperty(item.attr)){
				oSockets[item.group][item.attr] = 1;
			} else {
				++oSockets[item.group][item.attr];
			}
		});

		for (var idx in oSockets){
			var oGroup = oSockets[idx];

			var connectsInGroup = 0;
			var types = 0;
			for (var type in oGroup) {
				connectsInGroup += oGroup[type];
				types++;
			}
			numSockets += connectsInGroup;
			if (connectsInGroup > maxConnected) maxConnected = connectsInGroup;
			if (types == 3) tricolor = true;

			if (oGroup.hasOwnProperty('D') && oGroup.hasOwnProperty('S') && oGroup.hasOwnProperty('I')) tricolor = true;

		}

	}

	return {
		tricolor: tricolor,
		maxConnected: maxConnected,
		numSockets: numSockets
	};
}

function itemQuality(item) {


	if (item.category === 'skillGem' || item.category === 'flask') {

		if (item.rawItem.hasOwnProperty('properties')) {
			for(var i = 0; i< item.rawItem.properties.length;i++) {
				var oProp = item.rawItem.properties[i];
				if (oProp.name === 'Quality') {
					item.properties.Quality = oProp.values[0];
					return parseInt(oProp.values[0],10);
				}
			}
		}

	} else {

		if (item.properties.hasOwnProperty('Quality')) {
			return parseInt(item.properties.Quality,10);
		}

	}

	return 0;
}

function itemByName(items, name) {
	return $(items.filter(function(i){return $(':contains(' + name + ')', $(i.html)).length > 0})[0].html)
}

