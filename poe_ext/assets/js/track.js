var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-34073949-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);


  $(function(){

	  $('div.navbar a').live('click', function() { 
	  	var oThis = $(this);
	  	var action = $.trim(oThis.text());
	  	var category = "primaryNav";
	  	var oDD = oThis.closest('.dropdown').find('a.dropdown-toggle');
	  	if(oDD.length) {
	  		category = $.trim(oDD.text());
	  	}
	  	 _gaq.push(['_trackEvent', category, action]);	  	
	  });

	});


})();

