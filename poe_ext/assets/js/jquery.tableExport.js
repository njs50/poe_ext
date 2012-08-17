jQuery.fn.tableExport = function(options) {

    var options = jQuery.extend({
        output: 'table'
    },
    options);
    
    var csvData = [];
    var headerArr = [];
    var el = this;
	var tmpRow = [];
	
	try {
	
	    $(el).filter(':visible').find('thead').find('th').each(function() {
	        // if ($(this).css('display') != 'none')
	       	var oCell = {
	        	label: formatData($(this).text(),false), 
	        	bShow: !$(this).hasClass('noExport'), 
	        	bAllowHTML: $(this).hasClass('exportHTML')
	        }
	        
	        headerArr.push(oCell);
	        
	    	if(oCell.bShow) tmpRow.push(oCell.label);
	    });
	 
	    row2CSV(tmpRow);
	
	    // actual data
	    $(el).find('tbody').find('tr').each(function() {
	        var tmpRow = [];
	        var idx = 0;
	        $(this).filter(':visible').find('td').each(function() {
	            if(headerArr[idx].bShow) tmpRow.push( formatData($(this).html(),headerArr[idx].bAllowHTML) );
	        	idx++;
	        });
	        row2CSV(tmpRow);
	    });
	      
	    var mydata = combineOutput(csvData);

	} catch(e) {
		console.log('Error converting table to export format');
	  	console.log(e);
	  	return '';
	}
    
    return mydata;

	function combineOutput(data) {
		
    	switch (options.output) {
    		
    		case 'table':
	            return '<table>\n' + data.join('\n') + '\n</table>';
	       	break;
	       	
	       	case 'csv':
	            return data.join('\n');	       	
	       	break;
	       		       	
	       	default:
	       		throw('unknown output method');
	    }
	    		
	}

    function row2CSV(tmpRow) {
    	
        var tmp = tmpRow.join('') // to remove any blank rows
        
        if (tmpRow.length > 0 && tmp != '') {
        	
        	switch (options.output) {
        		
        		case 'table':
		            csvData[csvData.length] = '<tr><td>' + tmpRow.join('</td><td>') + '</td></tr>';
		       	break;
		       	
		       	case 'csv':
		            csvData[csvData.length] = tmpRow.join(',');		       	
		       	break;
		       		       	
		       	default:
		       		throw('unknown output method');
           }
           
        }
        
    }
    
    function formatData(input,bAllowHTML) {
        // replace " with \"
        var output = input;
 
        //newlines
        output = output.replace(/\n/g,'');
        
        // whitespace
        output = output.replace(/\s{2,}/g, '');
        
        // fix brackety numbers
        output = output.replace(/\( (\d+.?\d*) \)/g, '-$1');
 
   		// decode html entities
  		output = output.replace(/&amp;/g,"&");
		output = output.replace(/&lt;/g,"<");
		output = output.replace(/&gt;/g,">");
		output = output.replace(/&#39;/g,"\'");
		output = output.replace(/&quot;/g,"\"");
        
        //html unless allowed
        if (bAllowHTML && options.output == 'table') {
        	// regexp [opening tag] [tag name] [optional group containing href with href content and quote type grouped] [close of tag]
        	output = output.replace(/<([^ ]+)(?:.*?href\s*=\s*('|")(.*?)\2)?[^>]*>/gi, 
        		function(all,tag,quote,href){
        			
        			var str = '<' + tag; 
        			
        			if(href != undefined){
        				
        				// replace relative paths with complete
        				if ( href.charAt(0) == '/' ) {
        					href = window.location.protocol + '//' + window.location.host + href;
        				}
        				
        				// if the href doesnt already contain encoded elements, encode it just in case...
        				if (href.search(/%\d\d/) == -1) href = encodeURI(href);

        				str += ' href=' + quote + href + quote;
        			}  
        			str += '>'; 
        			return str; 
        		});
        } else {
        	output = output.replace(/<[^>]+>/g, '');
        }
        
        output =  $.trim(output);
         
        if (options.output == 'csv') {
        	// escape quotes and double quote everything
        	output = output.replace(/"/g,'""');       	
        	output = '"' + output + '"';
        } 
         
        return output;
        
    }

};