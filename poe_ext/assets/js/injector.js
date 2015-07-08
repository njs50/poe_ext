
var navLink = $('<li><a href="#">Stash Management</a></li>');

var homeNav = $('li#nav-home').find('div.dropDown ul');



navLink.click(function(){

  var userName = $('span.profile-link').text();

  if (!userName) {

    alert('You don\'t appear to be logged in!');

  } else {

    var mainUrl = chrome.extension.getURL("main.html");

    $.getJSON(chrome.extension.getURL("manifest.json"), function(manifest){

      $.get(mainUrl).success(function(main){
        main = main.replace(/(href|src)="\//ig,'$1="' + chrome.extension.getURL(""));

        main = main.replace(/<\/body>/,
          '<script>' +
            'window.accountName = \'' + userName + '\';' +
            '$(\'#version\').html("Version: ' + manifest.version + '");' +
          '</script>' +
          '</body>');

        var w = window.open();


        w.document.write(main);
        w.document.close();

      });
    });
  }

});

homeNav.append(navLink);

