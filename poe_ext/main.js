var timer = null;
var currentItems = null;

$(document).ready(function () {
	$('#spinner').ajaxStart(function() {
		$(this).show();
	}).ajaxStop(function (){
		$(this).hide();
	})

	$.post(getEndpoint('get-characters'))
	.done(function (charResp) {
		if (charResp == null) {
			showCharError();
			return;
		}
		setDropdown(charResp);	
	}).fail(function () {
		showCharError();
	});

	$('#refresh').click(function () {
		var charName = $('#charDropDown').val();
		if (charName != '') {
			poll(charName, false);
		}
	});
	
	$('#copyToClipboard').click(function () {
		if(currentItems!=null) {
			chrome.extension.getBackgroundPage().copy(formatRareListPlain(getSortedRares(currentItems),true));
		}
	});

	$('#copyFromClipboard').click(function () {
		if(currentItems!=null) {
			var theirData = chrome.extension.getBackgroundPage().paste();
			// split by line
			var theirLines = theirData.split('\n');
	
			// apply a regex to find the rare names (of the form "forename surname") on each line.
			// this is quite tollerant of junk on the line. So long as the rare's name is the first word pair on the line, it'll find it.
			var regexedLines = theirLines.map(function(i) {
				var match = i.match(/\w+\s\w+/);
				return match==null?null:match[0];
			});
			// remove any lines that were not matched by the regex above.
			var theirRares = regexedLines.filter(function(i) {
				return i!=null;
			});
			
			// sort them into descending alphabetical order to make the comparison more efficient 
			theirRares.sort(function(a,b) {
				if(a<b) {
					return -1;
				}
				else if(a>b) {
					return 1;
				}
				return 0;
			});
	
			// get the names of our rares.
			var ourRareItems = getSortedRares(currentItems);
	
			var matches = [];
			
			var theirIndex = 0;
			for (var i = 0; i < ourRareItems.length; i++) {
				var ourRare = ourRareItems[i].rareName;
				while(theirIndex<theirRares.length && theirRares[theirIndex]<ourRare) {
					//iterate through until we reach one of their rares that matches, or is alphabetically beyond our rare.
					theirIndex++;
				}
				
				if(theirIndex==theirRares.length) {
					// reached the end of their Rares, 
					// there cannot be any further matches, as there's nothing more to check.
					break;
				}
	
				var theirCount = 0;
				var theirIndex2 = theirIndex;
				while(theirIndex2<theirRares.length && theirRares[theirIndex2++]==ourRare) {
					// for added usefulness we count the number of their instances that match ours.	
					theirCount++;
				}
	
				if(theirCount>0) {
					// take a (shallow) copy of the rare items that match
					var ourRareItemCopy = $.extend({}, ourRareItems[i]);
					// so that a new attribute can be added.
					ourRareItemCopy.theirCount = theirCount;
					matches.push(ourRareItemCopy);
				}
			}
			
			if(matches.length==0) {
				$.colorbox({html:"<h4>No matches found</h2>"});
			}
			else {
				
				chrome.extension.getBackgroundPage().copy(formatRareListPlain(matches),false);
				// output the matches here
				$.colorbox({html:'<body>'+formatRareList("Your rares that matched",matches) +'<h4>Match list has been copied to the clipboard</h2></body>',
							transition:"none",
							});
			}
		}
	});
});

function setDropdown(charResp) {
	$('#pleaseSelect').show();
	var charOptions = $.map(charResp.characters, 
							function (v) { return '<option>' + v.name + '</option>'; }).join('');
	$('#charDropDown').html('<option></option>' + charOptions);
	$('#charDropDown').val(0);
	$('#charDropDown').change(function () {
		$('#output').html('');
		clearTimeout(timer);
		var charName = $('#charDropDown').val();
		if (charName != '') {
			poll(charName, false);
			$('#pleaseSelect').hide();
		} else {
			$('#pleaseSelect').show();
		}
	})
}

function showCharError() {
	$('#err').html('You appear not to be signed in to <a href="http://pathofexile.com">' +
				   'Path of Exile</a>.<p>Please sign in and refresh this page.');
}

function poll(charName, reschedule) {
	var controls = $.merge($.merge($.merge($('#charDropDown'), $('#refresh')),$('#copyToClipboard')),$('#copyFromClipboard'));
	controls.attr('disabled', 'true');
	currentItems = null;
	
	allItems(charName).done(function (items) {
		currentItems = items;
		var matches = allMatches(items);
		$('#output').html('<table><tbody><tr><th></th><th>Matched</th><th>Missing</th>' + 
			              $.map(matches, function (matches, rule) {
			var numRows = matches.length;
			var out = '';
			for (var i = 0; i < numRows; ++i) {
				out += sprintf('<tr class="%s">', i == numRows - 1 ? 'lastrow' : '');
				var match = matches[i];
				if (i == 0) {
					
					var moreThanComplete = "";
					if((match.complete|0) >1) {
						moreThanComplete = sprintf("(x%d)", match.complete);
					}
					
					out += sprintf('<th class="recipe" rowspan="%d">%s%s</th>', numRows, rule, moreThanComplete);
				}
				out += sprintf('<td class="items">%s</td>', $.map(match.items, itemSpan).join('<br>'))
				out += sprintf('<td class="missing">%s</td>',
							   (match.complete < 1 && match.missing != null) ? match.missing.join('<br>') : '');
				out += '</tr>';
			}
			return out;
		}).join('') + '</tbody></table>');
		
		$('#rareList').html(formatRareList("Your Rare Items", getSortedRares(items)));
		
		
	}).fail(function () {
		$('#err').html('Error requesting item data from path of exile. Please refresh ' +
					   'the page and try again. If the error persists, contact the author.');
	}).then(function () {
		controls.removeAttr('disabled');
		if (reschedule) {
			timer = setTimeout(function() { poll(charName, true); }, 10 * 60 * 1000);
		}
	});
};

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


function formatRareList(title, sortedRares) {
	var count = sortedRares.length;
	var out = sprintf('<table><tbody><tr><th>%s</th></tr><tr><td>',title);
	var prevForename = null;
	for (var i = 0; i < count; ++i) {
		var rareName = sortedRares[i].rareName;
		var forename = rareName.substring(0, rareName.indexOf(' '));
		if(prevForename!=null && prevForename!=forename) {
			// new row
			out+='</td></tr><tr><td>';

		}
		prevForename = forename;
		out += itemSpan(sortedRares[i]);
		if(sortedRares[i].theirCount>1) {
			out+=sprintf(' (clipboard has %s)', sortedRares[i].theirCount);
		}
		out+='<br>';
	}
	out+='</td></tr></tbody></table>';
	return out;
}

function getSortedRares(items) {
	var available = items.slice(0);
	
	var rares = available.filter(function(i) {
		return i.rarity == 'rare' && i.identified;
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