
var navLink = $('<li><a href="#">Stash Management</a></li>');

var homeNav = $('li#nav-home').find('div.dropDown ul');




navLink.click(function(){

  var userName = $('span.profile-link').eq(0).text();

  if (!userName) {

    alert('You don\'t appear to be logged in!');

  } else {


    var items = {};

    var weapons = $.get('https://www.pathofexile.com/item-data/weapon').success(function(weapons){

      $(weapons).find('.layoutBoxFull')
        .each(function(idx, itemType){

          itemType = $(itemType);

          var groupName = $.trim(itemType.find('h1').html().toLowerCase());

          itemType
            .find('.itemDataTable td.name')
            .each(function(idx, item) {
              if (groupName === 'bow' || groupName === 'staff' || groupName.indexOf('two hand') > -1 ) {
                items[$.trim($(item).html())] = 'weapon2h';
              } else {
                items[$.trim($(item).html())] = 'weapon1h';
              }
            });

        });

    });

    var armour = $.get('https://www.pathofexile.com/item-data/armour').success(function(armor){

      var armorTypes = {
        'shield': 'shield',
        'body armour': 'chest',
        'gloves': 'hands',
        'helmet': 'head',
        'boots': 'feet'
      }

      $(armor).find('.layoutBoxFull')
        .each(function(idx, itemType){

          itemType = $(itemType);

          var groupName = $.trim(itemType.find('h1').html().toLowerCase());

          itemType
            .find('.itemDataTable td.name')
            .each(function(idx, item) {
              items[$.trim($(item).html())] = armorTypes[groupName];
            });


        });

    });


    var jewelry = $.get('https://www.pathofexile.com/item-data/jewelry').success(function(armor){

      $(armor).find('.layoutBoxFull')
        .each(function(idx, itemType){

          itemType = $(itemType);

          var groupName = $.trim(itemType.find('h1').html().toLowerCase());

          itemType
            .find('.itemDataTable td.name')
            .each(function(idx, item) {
              items[$.trim($(item).html())] = groupName;
            });


        });

    });









    var mainUrl = chrome.extension.getURL("main.html");
    $.getJSON(chrome.extension.getURL("manifest.json"), function(manifest){


      $.when(weapons, armour, jewelry).then(function(){



        $.get(mainUrl).success(function(main){
          main = main.replace(/(href|src)="\//ig,'$1="' + chrome.extension.getURL(""));

          main = main.replace(/<\/body>/,
            '<script>' +
              'window.accountName = \'' + userName + '\';' +
              '$(\'#version\').html("Version: ' + manifest.version + '");' +
              'ITEM_TYPE_DATA = ' + JSON.stringify(items) + ';' +
            '</script>' +
            '</body>');

          var w = window.open();


          w.document.write(main);
          w.document.close();

        });

      });

    });
  }

});

homeNav.append(navLink);

