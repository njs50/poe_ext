var Match = Class.extend({
	init: function() {
	},

	// Consider an item for matching. If you return true, that means that this matcher
	// now owns this item for the remainder of its lifetime.
	take: function (i) {
		return false;
	},

	// Returns a list of matches, which are objects with the following properties:
	// - complete: a number in [0, 1] that represents the completeness of this match.
	//     1 is complete.
	//     *Bodged in additional meaning to this value. More than 1 is interpreted as meaning the ingredients can generate multiples of the output.
	//     e.g. 18x chromaticOrb + 18x fusingOrb = 18x jewelersOrb. The 'complete' value should be 18.
	//     It's basically a way of preventing the recipe hits from flooding the output with trivial repeat data, while still giving the user the data they need.
	//
	// - items: owned items that we matched on
	// - missing: a list of strings to display to the user carrying items that
	//            were not found in the list.
	getMatches: function () {
		return [];
	}
});


var RarenameMatch = Match.extend({
	init: function(count,bQuality) {
		this.count = count;
		this.bQuality = bQuality;
		this.matches = {};
	},

	take: function(i) {
		if (i.rarity !== 'rare' || !i.identified) {
			return;
		}
		if (this.bQuality && i.quality !== 20){
			return;
		}
		if (!this.matches.hasOwnProperty(i.rareName)){
			this.matches[i.rareName] = [];
		}
		this.matches[i.rareName].push(i);
	},

	getMatches: function() {
		var th = this;
		return $.map(this.matches, function (v, k) {
			return {
					complete: v.length * 1.0 / th.count,
					items:v,
					missing: [sprintf('%d ' + (this.bQuality ? '20% quality' : '') + ' rare(s) with this rarename:', th.count - v.length), k]
				};
		});
	}
});


var BaseNameAndTypeMatch = Match.extend({
	init: function(type,count) {
		this.count = count;
		this.type = type;
		this.matches = {}
	},

	take: function(i) {
		if (i.category != this.type) return;
		var matchArray = this.matches[i.baseType];
		if (matchArray == null) {
			matchArray = this.matches[i.baseType] = []
		}
		matchArray.push(i);
	},

	getMatches: function() {
		var th = this;
		return $.map(this.matches, function (v, k) {
			return {complete: v.length * 1.0 / th.count,
				    items:v,
					missing: [sprintf('%d %s of type:', th.count - v.length, th.type), k]}
		});
	}
});

var CurrencyMatch = Match.extend({
	// currencyRequirements; an array of objects with name:<shortCurrencyName>, [quantity:numberNeededForMatch] (optional)
	init: function(currencyRequirements) {
		this.currencyRequirements = currencyRequirements;
		this.currencyRequirements.forEach(function(currency) {
			currency.count = 0;
			if(!currency.quantity) {
				currency.quantity = 1;
			}
		});
		this.owned = [];
	},

	take: function (i) {
		if(i.rarity!='currency') return false; // not currency
		if(!i.baseType in CURRENCY_DATA) return false; // not recognised type of currency

		var take = false;
		this.currencyRequirements.forEach(function(currency){
			if(currency.name==CURRENCY_DATA[i.baseType]) {
				currency.count+=i.quantity;
				this.owned.push(i);
				take = true;
			}
		}, this);
		return take;
	},

	getMatches: function () {
		var lowestMatchCount = null;

		this.currencyRequirements.forEach(function(currency) {
			var matchCount = currency.count/currency.quantity;
			if(lowestMatchCount==null || matchCount<lowestMatchCount) {
				lowestMatchCount = matchCount;
			}
		});

		var out;

		if(lowestMatchCount<1) {

			var missingStuff = "";

			this.currencyRequirements.forEach(function(currency) {
				if(currency.count<currency.quantity) {
					missingStuff+=sprintf("%dx %s<br>",currency.quantity-currency.count,currency.name);
				}
			});


			out = [{complete:lowestMatchCount, items:this.owned, missing:missingStuff}];
		}
		else {
			out = [{complete:lowestMatchCount, items:this.owned}];
		}

		return out;
	}
});

var QualityMatch = Match.extend({
	// acceptableType: one of armor, flask, skillGem, or weapon.
	init: function(acceptableType) {
		this.currentQuality = 0.0;
		this.acceptableType = acceptableType;
		this.currentMatch = [];
		this.matches = [];
	},

	consider: function (i) {
		if (i.category === undefined) {return false;}
		if (i.quality === 0) {return false;}
		return (this.acceptableType === 'weapon' && $.inArray(i.parentCategory, ['weapon1h', 'weapon2h']) !== -1) ||
			(this.acceptableType === 'armor' && i.parentCategory === 'armor') ||
			(this.acceptableType === i.category);  // skillGem or flask
	},

	take: function (i) {
		if (!this.consider(i)) { return; }
		// only normal quality 20% is acceptable it seems...
		if (i.quality === 20 && i.rarity === 'normal') {
			this.matches.push({complete: 1, items: [i]});
		} else {
			this.currentMatch.push(i);
			this.currentQuality += i.quality;
			if (this.currentQuality >= 40) {
				this.matches.push({complete: this.currentQuality / 40, items: this.currentMatch});
				this.currentMatch = [];
				this.currentQuality = 0;
			}
		}
	},

	getMatches: function () {
		var out = this.matches;
		out.push({
			complete: (this.currentQuality / 40.0),
			items: this.currentMatch,
			missing: [sprintf('%ss with %d%% total quality', this.acceptableType, 40 - this.currentQuality)]
		});
		return out;
	}
});

var PredicateMatcher = Match.extend({
	init: function(pred) {
		this.matches = [];
		this.pred = pred;
	},

	take: function(i) {
		if (this.pred(i)) {
			this.matches.push(i);
		}
	},

	getMatches: function() {
		return $.map(this.matches, function (v, _) {
			return {complete: 1, items:[v]}
		})
	}
});

function TricolorMatch() {
	return new PredicateMatcher(function (i) { return i.sockets && i.sockets.tricolor; });
}

function SocketMatch(reqcount, linked) {
	return new PredicateMatcher(
		function (i) {
			return i.sockets && ((linked ? i.sockets.maxConnected : i.sockets.numSockets) >= reqcount);
		});
}
function RareModMatch(modcount) {
	return new PredicateMatcher(
		function (i) { return i.rarity == 'rare' && i.rawItem.hasOwnProperty('explicitMods') && i.rawItem.explicitMods.length > modcount; });
}

var BaseTypeMatch = Match.extend({
	// The most important rarity should be first, then the second, and so on.
	// We use this to score match completion, with each index getting descending amounts
	// credit.
	init: function(rarities, maxQuality, allowedToBePartlyIdentified) {
		this.scores = {unique:4, rare:2, magic:1, normal: 1};
		this.rarities = rarities;
		this.maxQuality = maxQuality;
		this.allowedToBePartlyIdentified = allowedToBePartlyIdentified;
		this.matches = {};
		this.completeScore = this.scoreRarities(rarities);
	},

	// Score an array of rarities.
	scoreRarities: function(r) {
		var s = 0;
		for (var i = 0; i < r.length; ++i) {
			s += this.scores[r[i]];
		}
		return s;
	},

	take: function(i) {
		// Don't keep anything without a
		if (i.baseType === null || $.inArray(i.rarity, this.rarities) === -1 || (i.quality < 20 && this.maxQuality)) { return; }

		if(!this.allowedToBePartlyIdentified && i.identified) { return false;}

		if (!this.matches.hasOwnProperty(i.baseType)) {
			this.matches[i.baseType] = {};
		}

		this.matches[i.baseType][i.rarity] = i;  // It's fine to replace what's already here.

	},

	credit: function(i) {
		if (i === 0) { return 0; }
		return i + this.credit(i-1);
	},

	getMatches: function() {
		var maxCredit = this.credit(this.rarities.length);
		var th = this;

		return $.map(this.matches, function (v, k) {
			var itemcredit = 0;
			var missing = $.map(th.rarities, function(rarity, idx) {
				if (!(rarity in v)) {
					return rarity;
				}
			});

			return {
				items: objToArray(v),
				missing: $.merge([sprintf('%s%s with rarities:', k, th.maxQuality ? ' with %20 quality' : '')], [missing.join(', ')]),
				complete: 1 - (1.0 * th.scoreRarities(missing) / th.completeScore)
			};
		});
	}

});

function objToArray(v) {

	var a = [];
	for (var k in v){
		if (v.hasOwnProperty(k)) a.push(v[k]);
	}

	return a;

}


function mapMax(maps) {
	var out = {};
	$.map(maps, function (aMap, _) {
		$.map(aMap, function(v, k) {
			if (!out[k]) {
				out[k] = 0;
			}
			out[k] = Math.max(v, out[k]);
		});
	});
	return out;
}

var BaseTypeAndRarityMatch = Match.extend({
	init: function(countNeeded){
		this.countNeeded = countNeeded;
		this.itemMap = {};
	},

	take: function(i) {
		if (i.baseType === undefined) {return false;}
		if (i.rarity != 'rare' && i.rarity != 'magic' && i.rarity != 'unique') { return false; }

		var combinedName = i.rarity + ' ' + i.baseType;
		var items = this.itemMap[combinedName];
		if (items === undefined) {
			this.itemMap[combinedName] = items = [];
		}
		items.push(i);
		return true;
	},
	getMatches: function() {

		var out = [];

		for(var combinedName in this.itemMap) {
			var itemArray = this.itemMap[combinedName];
			var isComplete = itemArray.length>=this.countNeeded;
			out.push({ complete : isComplete?1:(itemArray.length/this.countNeeded),
						items:itemArray.slice(0,5),
						missing: isComplete?null:[sprintf("%dx %s", this.countNeeded-itemArray.length, combinedName)]
			});

		}

		return out;
	}
});


var FullsetMatch = Match.extend({

	init: function(rarity, mustBeTopQuality, mustBeUnidentified) {
		this.rarity = rarity;
		this.mustBeTopQuality = mustBeTopQuality;
		this.mustBeUnidentified = mustBeUnidentified;
		this.matchedParts = {
			head: [],
			chest: [],
			hands: [],
			feet: [],
			belt: [],
			ring: [],
			amulet: [],
			weapon1h: [],
			weapon2h: [],
			shield: []
		};
		this.armorPart = count(['head', 'chest', 'hands', 'feet', 'belt', 'ring', 'ring', 'amulet']);
		this.weaponPart = [count(['weapon1h', 'shield']), count(['weapon2h']), count(['weapon1h', 'weapon1h'])];
	},

	hasCount: function(c) {
		var th = this;
		var has = all(c, function (v, k) {
			var res = th.matchedParts[k].length >= v;
			return res;
		});
		return has;
	},

	// Pulls items in a "recipe" (a map of strings to counts) from this.matchedParts into a second array.
	// This will be reported to the used.
	extractItems: function(recipe) {
		var th = this;
		return $.map(recipe, function (v, k) {
			var out = [];
			for (var countNeeded = v; countNeeded > 0; --countNeeded) {
				out.push(th.matchedParts[k].pop());
			}
			return out;
		});
	},

	// If the requirements are satisfied, returns a minimal satisfying set of requirements.
	// Otherwise, returns the maximal satisfying set.
	getMatchRequirements: function() {
		var th = this;
		var weaponReqs = any(this.weaponPart, function (v, _) { return th.hasCount(v); });
		if (weaponReqs) {
			return mapMax([this.armorPart, weaponReqs[0]]);
		} else {
			return mapMax($.merge([this.armorPart], this.weaponPart));
		}
	},

	getCompleteMatches: function() {
		var matches = [];
		while (true) {
			var matchRequirements = this.getMatchRequirements();
			if (this.hasCount(matchRequirements)) {
				matches.push({complete: 1, items: this.extractItems(matchRequirements)});
			} else {
				break;
			}
		}
		return matches;
	},

	getMatches: function() {
		var th = this;
		var matches = this.getCompleteMatches();

		// The last one is a partial match. This is pretty tricky to represent. What we're going to
		// do is return the values of matchedParts as the items. We'll figure out what parts aren't
		// complete by iterating over the min key values of this.combos against the length of each
		// array in items. Completeness will be the length of 1 - (missing parts / missing+available).
		var requirements = this.getMatchRequirements();
		var missing = $.map(this.matchedParts, function (v, k) {
			var out = [];
			for (var missingCount = requirements[k] - v.length; missingCount > 0; --missingCount) {
				out.push(k);
			}
			return out;
		});
		// Get a composition of items that represents a partial suit. The slice is to prevent taking
		// more than required (we only want one chest, etc. for the partial match).
		var partialItems = $.map(this.matchedParts,
								function (v, k) {
									if (requirements[k]) {
										return v.slice(0, requirements[k]);
									}
								});
		if (missing.length) {
			var firstMissingRow = sprintf('%s %sitems in slots:', this.rarity, this.topQuality ? '20% quality ' : '');
			missing = $.merge([firstMissingRow], missing);
		}
		matches.push({
			complete: 1 - ((missing.length * 1.0) / (missing.length + partialItems.length)),
			items: partialItems,
			missing: missing
		});
		return matches;
	},

	take: function(i) {
		if(this.mustBeUnidentified && i.identified) { return false; }
		if (this.rarity != i.rarity) { return false; }
		if (this.mustBeTopQuality && i.quality != 20) { return false; }
		var cat = (i.parentCategory === 'weapon1h' || i.parentCategory === 'weapon2h') ? i.parentCategory : i.category;
		if (cat in this.matchedParts) {
			this.matchedParts[cat].push(i);
		}
	}
});

function allMatches(available) {
	var results = {};

	var matchRules = $.map([
							{result: "Armorer's Scrap", matcher: new QualityMatch('armor'), display:0.98},
							{result: "Blacksmith's Whetstone", matcher: new QualityMatch('weapon'), display:0.98},

							{result: "Chaos Orb", matcher: new FullsetMatch('rare', false, false), display:0.3},
							{result: "2 Chaos Orbs", matcher: new FullsetMatch('rare', false, true), display:0.3},

							{result: "Regal Orb", matcher: new FullsetMatch('rare', true, false), display:0.3},
							{result: "2 Regal Orbs", matcher: new FullsetMatch('rare', true, true), display:0.3},

							{result: "Chromatic Orb", matcher: TricolorMatch()},
							{result: "Divine Orb", matcher: SocketMatch(6, true)},

							{result: "Gemcutter's Prism", matcher: new QualityMatch('skillGem'), display:0.3},

							{result: "Cartographer's Chisel", matcher: new QualityMatch('map'), display:0.3},

							{result: "Glassblower's Bauble", matcher: new QualityMatch('flask')},

							{result: "Jeweler's Orb", matcher: new CurrencyMatch([{name:'chromaticOrb'},{name:'fusingOrb'}])},

							{result: "7 Jeweler's Orbs", matcher: SocketMatch(6, false)},

							{result: "Orb of Chance", matcher: new RarenameMatch(2,false), display:0.51},
							{result: "Orb of Alchemy", matcher: new RarenameMatch(3,false), display:0.94},

							{result: "Orb of Alchemy", matcher: new RarenameMatch(2,true), display:0.51},
							{result: "Regal Orb", matcher: new RarenameMatch(3,true), display:0.6},


							{result: "Orb of Augmentation", matcher: new BaseTypeMatch(['rare', 'magic', 'normal'], false, true), display:0.51},
							{result: "2 Orbs of Augmentation", matcher: new BaseTypeMatch(['rare', 'magic', 'normal'], false, false), display:0.51},

							{result: "Orb of Alchemy", matcher: new BaseTypeMatch(['rare', 'magic', 'normal'], true, true), display:0.51},
							{result: "2 Orbs of Alchemy", matcher: new BaseTypeMatch(['rare', 'magic', 'normal'], true, false), display:0.51}, //This rule is unverified.

							{result: "Map one level higher", matcher: new BaseNameAndTypeMatch('map',3), display:0.51}, //This rule is unverified.

							{result: "Orb of Augmentation", matcher: RareModMatch(6)}, //This rule is flawed. It is impossible to reliably determine if a rare has 6 mods.

							{result: "5 Orbs of Chance", matcher: new BaseTypeMatch(['unique', 'rare', 'magic', 'normal'], false, true), display: 0.5},



							{result: "1 Divine, 2 Exalted and 5 Regal Orbs",  matcher: new CurrencyMatch([{name:'mirrorOfKalandra'}]), display:0.98},

							{result: "New unidentified item of same base type & rarity",  matcher: new BaseTypeAndRarityMatch(5), display:0.7}

							//TODO The rules that rely upon allowedToBePartlyIdentified are slightly bugged at the moment.
							// When set they'll accept all unidentified, which should be taken by the more valuable rule.
							//TODO add obvious recipes?


	], function (v, _) {
		// Defaults.
		if (v.display == null) { v.display = 0; }
		return v;
	});

	// iterate over the rules
	$.each(matchRules, function (_, rule) {

		var matcher = rule.matcher;

		// let the matcher take the items it's interested in.
		$.map(available, function (i) { matcher.take(i); });
		// filter out matches that fall below the display threshold.
		var matches = (matcher.getMatches().filter(function(m) { return m.complete > rule.display; }));

		// if this rule made any matches, then the matches need adding to the results
		if (matches.length) {
			if (results[rule.result] == null) {
				results[rule.result] = [];
			}
			results[rule.result] = $.merge(results[rule.result], matches);
		}
	});
	return results;
}

function locationFormat(i) {
	if (i.location.section == 'character') { return 'char'; }
	else { return sprintf('stash %s', i.location.page); }
}

function itemSpan(i) {
	return sprintf('%s&nbsp;&nbsp;&nbsp;&nbsp<span class="location">%s</span>', i.name, locationFormat(i));
}

