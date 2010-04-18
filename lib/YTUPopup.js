function YTUPopup() {
    var that = this;
    
    var maxItems = 9;
    var items;
    var titlesToIgnore = [];
    
	var showError = function(status) {
		var msg = null;

		switch(status) {
		  case 0:
		      msg = 'You are currently not <a target="_blank" href="http://www.youtube.com/signin">logged in</a>.';
		      break;
		  default:
			  throw new Error('Unknown status: ', status);
		}

		$('#infobar-text').html(msg);
		console.log(msg);
	};

	var getItemNode = function(item) {
	    var templ = '<div class="video-thumb"><a target="_blank" href="%{href}"><img src="%{thumbnail}" /></a></div>'
	      + '<div class="video-link"><a target="_blank" href="%{href}" onclick="ytuPopup.ignoreTitle(\'%{title}\');">%{shortTitle}</a></div>'
	      + '<div class="video-info"><div class="video-added">%{added}</span>'
	      + '<div class="video-views">%{views}</span>'
	      + '<div class="close-button" onclick="ytuPopup.ignoreTitle(\'%{title}\');"><img src="media/close.png" /></div>'
	      + '</div>';
		
		var node = document.createElement('div');
		node.setAttribute('class', 'video-item');
	    node.innerHTML = template(templ, item);

	    return node;
	};

	var template = function(templ, data) {
		for (var key in data) {
	      var toReplace = '%{' + key + '}';

	      var re = new RegExp(toReplace, 'g');
	      templ = templ.replace(re, data[key]);
		}

		return templ;
	};

	var clearPage = function() {
		$('#infobar-text').html('<b>You have <span id="new-video-count"></span> new videos.</b>');
		$('#content').html('');
	};

	var updatePage = function() {
		chrome.extension.sendRequest({command: 'get-items'}, function(response) {
		  that.onReceiveItems(response);
	    });
	};


	var requestUpdate = function() {
	  // when successful the background page will send a refresh message
	  chrome.extension.sendRequest({command: 'update'});	
	};
	
	var isItemIgnored = function(item) {
		// check if item is on the ignore list
		for (var key in titlesToIgnore) {
			// if so, skip this item
		  if (titlesToIgnore[key] === item.title) { return true; }	
		}
		
		return false;
	};
	
	var renderItems = function(items) {
		  var wrapper = document.getElementById('content');
		  
		  var counter = 0;
		  itemloop:
			for (var key in items) {
				if (counter >= maxItems) { break; }
				
				var item = items[key];
				
				if (isItemIgnored(item)) { continue; }
				
				var node = getItemNode(item);
			    wrapper.appendChild(node);
			    ++counter;
			}
		  
		  // enable "more" link if appropriate
		  if (items.length > maxItems) { $('#pager-next-link').css('visibility', 'visible'); }
	};
	
	var initSearch = function() {
	  
	  $(document).ready(function() {
	    $('#input-search').focus(function() {
	      this.value = '';
	      
	      $('body').css('min-height', '400px');
	      
	      $('#autosuggest-wrap').show();
	    }).blur(function(e) {
	      setTimeout(function() {
	        $('#autosuggest-wrap').hide();
	        $('body').css('min-height', '0');
	      }, 250);
	    });
	  });
	};

	this.onReceiveItems = function(response) {
		console.log('response: ', response);
		if (response.status !== 5) {
		    showError(response.status);
		    return;
		}
		
		  items = response.items;
		  renderItems(items);
		  
		  // set itemCount
		// set new videos display
		  $('#new-video-count').text(response.itemCount);
	};
	
	var refresh = function() {
		document.getElementById('content').innerHTML = '';
		renderItems(items);
	};
	
	this.onReceiveChromeMessage = function(request, sender, sendResponse) {
		switch(request.command) {
	    case 'refresh':
	      clearPage();
	      updatePage();
	      break;
	    }
	};
	
	this.autoSuggestUpdate = function(fragment) {
		if (!fragment.hasChildNodes()) {
		  $('#autosuggest-items').html('No suggestions found.');	
		} else {
     	  $('#autosuggest-items').html('').append(fragment);
		}
	};
	
	this.ignoreTitle = function(title) {
		// check if title is already ignored
    	for (var key in titlesToIgnore) {
    		if (titlesToIgnore[key] === title) { return false; }
    	}
    	
    	titlesToIgnore.push(title);
    	localStorage.setItem('titlesToIgnore', JSON.stringify(titlesToIgnore));
    	
    	refresh();
	};

	var constructor = function() {
		// set up chrome message listener
		chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
		  that.onReceiveChromeMessage(request, sender, sendResponse);  
		});
		
		titlesToIgnore = localStorage.getItem('titlesToIgnore');
		
		try {
		  titlesToIgnore = JSON.parse(titlesToIgnore);	
		} catch (e) {
			
			titlesToIgnore = [];
			localStorage.setItem('titlesToIgnore', JSON.stringify(titlesToIgnore));
		}
	
		initSearch();
	}();
	
      this.update =  function() { requestUpdate(); };
      this.getDataAndDisplay = function() { updatePage(); };
      this.onAutoSuggestUpdate = function(fragment) { that.autoSuggestUpdate(fragment); };
}