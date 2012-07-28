function flatten(ar) {
	return $.map(ar, function (i) { return i; });
}

function count(map) {
	var out = {}
	$.each(map, function (v, k) {
		if (!(k in out)) {
			out[k] = 0;
		}
		out[k] += 1;
	});
	return out;
}

function any(collection, f) {
	var ok = false;
	var res = $.map(collection, function (v, k) {
		if (f(v, k)) { ok=true; return v; } 
	});
	if (ok) { return res; } else { return null; }
}

function all(collection, f) {
	return !any(collection, function (v, k) { return !f(v, k)})
}

function sortUL(list) {	
	var mylist = $(list);
	var listitems = mylist.children('li').get();
	listitems.sort(function(a, b) {
	   return $(a).text().toUpperCase().localeCompare($(b).text().toUpperCase());
	})
	$.each(listitems, function(idx, itm) { mylist.append(itm); });
}

function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
