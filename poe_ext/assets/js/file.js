

function saveItems(fn, items) {
    var oBlob = new Blob([JSON.stringify(items)]);
    location.href = window.webkitURL.createObjectURL(oBlob);
}

$('body').on('drop',function(evt){

    evt.stopPropagation();
    evt.preventDefault();

    // they can drop as many as they like but we're only reading the first file :p
    var file = evt.originalEvent.dataTransfer.files[0]; 

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

    }

    reader.readAsText(file);

})




$('#saveAllItems').click(function(){
    saveItems('inventory.poe',aInventory);
});

$('#saveCraftItems').live('click',function(){
    saveItems('inventory.poe',craftItems);
});


function fileError(e) {
    console.log('filesystem error');
    errorDump(e);
}


                     