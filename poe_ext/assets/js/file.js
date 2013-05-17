

function saveItems(fn, items) {

    var aItems = [];

    $.each(items,function(idx,item){
        aItems.push({rawItem: item.rawItem, location:item.location});
    });

    window.webkitRequestFileSystem(window.TEMPORARY, 1024*1024, function(fs) {
        fs.root.getFile(fn, {create: true}, function(fileEntry) {
            fileEntry.createWriter(function(fileWriter) {


                var blob = new Blob([JSON.stringify(aItems)]);

                fileWriter.addEventListener("writeend", function() {
                    // navigate to file, will download
                    location.href = fileEntry.toURL();
                }, false);

                fileWriter.write(blob);
            }, function() {});
        }, function() {});
    }, function() {});

}


  function handleFileSelect(evt) {

    evt.stopPropagation();
    evt.preventDefault();

    // they can drop as many as they like but we're only reading the first file :p
    var file = evt.dataTransfer.files[0];

    var reader = new FileReader();

    reader.onload = function(e) {

        var items = JSON.parse(e.target.result);

        if (items && items.length) {

            currentLeague = 'Imported';

            $('#menuLeague')
                .find('.active').removeClass('active').end()
                .find('a.dropdown-toggle').html(currentLeague + '<b class="caret"></b>').end()
            ;

            resetView();

            var aItems = [];

            $.each(items,function(idx,item){
                aItems.push(parseItem(item.rawItem, item.location));
            });


            processItems(aItems)
                .done(function(){
                    $(lastView).trigger('click');
                })
            ;
        }

    };

    reader.readAsText(file);
  }

  function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

// Setup the dnd listeners.
var dropZone = document.getElementById('bodycontainer');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);





$('#saveAllItems').click(function(){
    saveItems('inventory.bin',aInventory);
});

$('#saveCraftItems').live('click',function(){
    saveItems('inventory.bin',craftItems);
});


function fileError(e) {
    console.log('filesystem error');
    errorDump(e);
}


