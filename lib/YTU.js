function YTU() {
  var that = this;

  var settings = {
    checkInterval: 120000
  };
  
  var html = null;
  var items = null;
  var timer = null;
  var newItemCount = null;

  /*
   * 0 = not initialized
   * 1 = http request failed
   * 2 = not logged in
   * 5 = everythin alright, have data
  */
  var app_state = 0;
  
  var cleanUrl = function(url) {
	return url.replace(/chrome-extension:\/\/[a-z0-9]{32}/, '');
  };
  
  var findVideosInHtml = function(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    
    var videos = $('.video', div);
    return videos;
  };

  var parseVideos = function(videos) {
    var items = [];
	  
    for (var i=0, l=videos.length; i<l; i++) {
      items.push(parseVideo(videos[i]));
    }

    return items;
  };

  var parseVideo = function(v) {
    var item = {};
    
    item.thumbnail = cleanUrl( $('.video-thumb img', v)[0].getAttribute('thumb') );
    
    var link = $('a.title', v)[0];
    
    item.href = 'http://www.youtube.com' + cleanUrl(link.href);
    item.title = link.innerHTML;

    item.shortTitle = item.title.length>50 ? item.title.substr(0, 50) + '...' : item.title;

    //get added time
    item.added = $('.stat-date-added', v)[0].innerHTML.replace('Added: ', '');

    //get views
    item.views = $('.stat-views', v)[0].innerHTML.replace('Views: ', '');
    item.duration = $('.stat-duration', v)[0].innerHTML;
    
    var user = $('.stat-username a', v)[0];
    
    item.username = user.innerHTML;
    item.userLink = user.href;
    
    return item;
  };

  var getHtml = function() {
	$.get('http://www.youtube.com/my_subscriptions?pi=0&ps=10000&dm=2&sf=added', null, that.onGetHtml);
  };
  
  this.onGetHtml = function(data, status) {
    html = data;
    
    if (!validateLoggedIn(html)) {
      chrome.browserAction.setBadgeText({text: 'login'});
      app_state = 2;
      return;
    }
    
    var vids = findVideosInHtml(html);
    items = parseVideos(vids);
    
    newItemCount = calcNewItemCount(items);

    app_state = 5;
    chrome.browserAction.setBadgeText({text: newItemCount.toString()});

    chrome.extension.sendRequest({command: 'refresh'});
  };

  var validateLoggedIn = function(html) {
    if (html.search('ServiceLogin') !== -1) {
      return false;
    } else {
      return true;
    }
  };
  
  var calcNewItemCount = function(items) {
	var count = 0;
	
	var titlesToIgnore = localStorage.titlesToIgnore ? JSON.parse(localStorage.titlesToIgnore) : [];
	var titleMap = {};
	for (var key in titlesToIgnore) { titleMap[titlesToIgnore[key]] = true; }
	
	for (var key in items) {
		if (!(items[key].title in titleMap)) { ++count; }
	}
	
	return count;
  };

  this.onChromeRequest = function(request, sender, sendResponse) {
    switch(request.command) {
      case 'get-items':
        sendResponse({'status': app_state, 'items': items, 'itemCount': newItemCount});
        break;
      case 'update':
        getHtml();
    }
  };

  this.onTimerTick = function() {
    getHtml();
  };

  var constructor = function() {
	// set up chrome messaging handler
	chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	  that.onChromeRequest(request, sender, sendResponse);	
	});

	timer = setInterval(function() { that.onTimerTick(); }, settings.checkInterval)
	
	chrome.browserAction.setBadgeText({text: 'login'});
    getHtml();
  }();

  var pub = {};
  return pub;
}