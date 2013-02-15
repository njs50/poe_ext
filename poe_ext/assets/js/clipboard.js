
function copy_cb(str) {

	var oTemp = $('<textarea>').appendTo('body').val(str).select();
	var foo = document.execCommand('copy');
	oTemp.remove();

}

function paste_cb() {
	var oTemp = $('<textarea>').val('').appendTo('body').select();
	document.execCommand('paste');
	var sRet = oTemp.val();
	oTemp.remove();
	return sRet;
}


$(function(){


	$('#copyItemCSV').click(function(){
		copy_cb($('#rareList').tableExport({output:'csv'}));
	});



	$('#copyToClipboard').click(function () {
		if(currentItems!=null) {
			copy_cb(formatRareListPlain(getSortedRares(currentItems),true));
		}
	});

	$('#copyFromClipboard').click(function () {

		if(currentItems!=null) {

			var theirData = paste_cb();
			// split by line
			var theirLines = theirData.split('\n');

			// apply a regex to find the rare names (of the form "forename surname") on each line.
			// this is quite tolerant of junk on the line. So long as the rare's name is the first word pair on the line, it'll find it.
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

			var html = '';

			if(matches.length==0) {
				html = "<h4>No matches found</h4>";
			} else {

				copy_cb(formatRareListPlain(matches),false);
				// output the matches here
				html = formatRareList(matches,false);

			}

			$('#clipboardMatch .modal-body').empty().html(html).find('table').tablesorter();

			$('#clipboardMatch').modal('show');
		}
	});


});