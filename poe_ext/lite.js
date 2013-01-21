var baseDir = 'https://raw.github.com/njs50/poe_ext/master/poe_ext';


var loadCSS = function(url) {

	$('<link>')
		.attr('href',baseDir + url)
		.attr('rel','stylesheet')
		.appendTo('head')
	;

};


$('head').empty();

$('<meta>')
	.attr('charset','utf-8')
	.appendTo('head')
;

$('<meta>')
	.attr('name','viewport')
	.attr('content','width=device-width, initial-scale=1.0')
	.appendTo('head')
;


$('<meta>').attr('charset','utf-8').appendTo('head');

loadCSS('/assets/css/poe.css');
loadCSS('/assets/bootstrap/css/bootstrap.css');
loadCSS('/assets/css/poe_ext.css');
loadCSS('/assets/bootstrap/css/bootstrap-responsive.css');


$(function(){

	$('body').empty().append(pageHTML);

});


var aPromises = [];

aPromises.push($.getScript(baseDir + "/assets/js/date.js"));
aPromises.push($.getScript(baseDir + "/assets/js/json2.js"));

$.when(aPromises).done(function(){

	aPromises = [];

	$.getScript(baseDir + "/assets/js/jquery-1.7.2.js",function(){


		aPromises.push($.getScript(baseDir + "/assets/js/jquery.stupidtable.js"));

		aPromises.push($.getScript(baseDir + "/assets/js/jquery.blockUI.js"));
		aPromises.push($.getScript(baseDir + "/assets/js/jquery.tableExport.js"));
		aPromises.push($.getScript(baseDir + "/assets/js/track.js"));

		aPromises.push($.getScript(baseDir + "/assets/bootstrap/js/bootstrap.js"));
		aPromises.push($.getScript(baseDir + "/sprintf-0.7-beta1.js"));
		aPromises.push($.getScript(baseDir + "/simpleinherit.js"));
		aPromises.push($.getScript(baseDir + "/util.js"));
		aPromises.push($.getScript(baseDir + "/itemdata.js"));
		aPromises.push($.getScript(baseDir + "/currencydata.js"));

		aPromises.push($.getScript(baseDir + "/assets/js/cache.js"));


		aPromises.push($.getScript(baseDir + "/myscript.js"));
		aPromises.push($.getScript(baseDir + "/matcher.js"));
		aPromises.push($.getScript(baseDir + "/main.js"));

		aPromises.push($.getScript(baseDir + "/assets/js/clipboard.js"));
		aPromises.push($.getScript(baseDir + "/assets/js/file.js"));


		$.when(aPromises).done(function(){
			$.getScript(baseDir + "/assets/js/loader.js");
		});

	});

});




