

function YTAutoSuggest() {
	var that = this;
	
	var requestUrl = 'http://suggestqueries.google.com/complete/search';
	
	var returnHtml = false;
	
	var inputNode = null;
	var searchTerms = [];
	
	// array with all running ajaxrequests
	var ajaxRequests = {};
	
	// this index is the key of the term in searchTerms whos ajaxrequest was last received and 
	// is therefore currently displayed
	// this value is used to check if a newly received dataset should be displayed or not
	this.currentTermKey = null;
	
	var showDataCallback = null;
	
	this.timer = null;
	
	var init = function() {
	  $(inputNode).focus(function(evt) {
		var them = that;  
	    //that.onChange(evt);
		that.timer = setInterval(function() { them.onTimerTick(); }, 100);
	  }).blur(function(evt) {
		  clearInterval(that.timer);
	  });	
	};
	
	var getRequestParams = function(query, cp) {
	  var params = {
	    hl: 'en',
	    client: 'youtube',
	    hjson: 't',
	    ds: 'yt',
	    q: query
	  };
	  
	  if (cp) { params.cp = cp; }
	  
	  return params;
	};
	
	var validateShowResponse = function(term) {
		// if we dont have a currentKey yet or we only have 1 searchTerm show it
		if (this.currentTermKey === null || searchTerms.length < 2) { return 0; }
		
		for (var i=searchTerms.length-1; i >=0; i--) {
		  if (i <= this.currentTermKey) { return false; }	
			
		  if (searchTerms[i] === term) { return i; }	
		}
	};
	
	var cancelOlderRequests = function(index) {
	  for (var key in ajaxRequests) {
		var request = ajaxRequests[key];
		//check if request has already finished, if so remove from collection
		if (request.readyState === 4) { 
		  delete ajaxRequests[key]; 
		  continue; 
		}
		
		if (key < index) {
		  request.abort();
		  delete ajaxRequests[key];
		}
	  }
	};
	
	var renderHtml = function(term, items) {
//	  	var wrap = document.createElement('div');
//	  	$(wrap).attr('id', 'autosuggest-wrap');
//	  	
//	  	var container = document.createElement('div');
//	  	$(wrap).attr('id', 'autosuggest-items');
//	  	
//	  	wrap.appendChild(container);
	  	
		var frag = document.createDocumentFragment();
		
	  	for (var i=0, l= items.length; i<l; i++) {
	  	  frag.appendChild( getItemHtmlNode(items[i]) );	
	  	}
	  	
	  	return frag;
	};
	
	var getItemHtmlNode = function(item) {
	  	var node = document.createElement('div');
	  	$(node).attr('class', 'autosuggest-item');
	  	
	  	var url = 'http://www.youtube.com/results?search_query='
	  	  + encodeURI(item[0]);
	  	
	  	node.innerHTML = '<span class="autosuggest-item-title">'
	  	  + '<a href="' + url + '" target="_blank">' + item[0] + '</a></span>'
          + '<span class="autosuggest-item-results">' + item[1] + '</span>'; 
	  		
	    return node;
	};
	
	var makeRequest = function(term) {
	  searchTerms.push(term);
		  
	  ajaxRequests[searchTerms.length-1] = $.get(requestUrl, getRequestParams(term), function(response, status) {
		that.onServerResponse(response, status);  
	  });
	};
	
	// detects changes in the input field if it is focused
	// sends a new ajaxrequest 
	this.onTimerTick = function(evt) {
	  var term = inputNode.value;
	  
	  if (term.length < 1 || term === searchTerms[searchTerms.length-1]) {
		return;  
	  } else {
		makeRequest(term);  
	  }
	};
	
	this.onServerResponse = function(response, statusText) {
		var data = JSON.parse(response);
	    
		var term = data[0];
		var items = data[1];
		
		var key = validateShowResponse(term);
		
		if(key === false) {
			  return;	
		}
		
		cancelOlderRequests(key);
		
		this.currentTermKey = key;
		if (returnHtml) {
		  showDataCallback( renderHtml(term, items) );
		} else {
		  showDataCallback(term, items);
		}
	};
	
	var constructor = function() {
		
	}();
	
	var pub = {
	  setup: function(node, callback, html) {
		inputNode = node;
		showDataCallback = callback;
		returnHtml = html;
		
		init();
	  }
	};
	return pub;
}