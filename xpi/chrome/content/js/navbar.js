/**
 * created on 10/2/2012, on hospital, with my father
 */
"use strict";
(function() {
var engines = Cc['@mozilla.org/browser/search-service;1'].getService(Ci.nsIBrowserSearchService);
var id4ShowHide = { // use "onNavbarItemOnoff" to handle the events
	'navbar-recently-closed': 'nbb-recently-closed',
	'navbar-add-site': 'nbb-add-site',
	'navbar-themes': 'nbc-themes-pointer',
	'navbar-todo': 'nbc-notes-onoff',
	'navbar': 'navbar',
	'navbar-search': 'nb-search'
};

// get fake engine for 'superstart' and real engine for 
// real engine
var fakeEngine = {
	'iconURI': {'spec': 'images/bing.ico'},
	'getSubmission': function(data) {
		return {
			'uri': {
				'spec': 'http://www.bing.com/search?q=' + encodeURIComponent(data)
			}
		};
	}
};
function getEngine() {
	var name = cfg.getConfig('searchengine');
	var engine = null;
	try {
		engine = engines.getEngineByName(name);
	} catch (e) {
		logger.logStringMessage('engine: ' + name + ' is not found!');
	}
	return engine || fakeEngine;
}

evtMgr.ready(function() {
	initPopupButton([
		{bid: 'nbb-recently-closed', mid: 'superstart-recently-closed-list', title: getString('ssRecentlyClosed')},
		{bid: 'nbc-themes-pointer', mid: 'superstart-themes-list-menu', title: getString('ssThemes')}/*,
		{bid: 'nb-search-switcher', mid: 'superstart-search-engines-menu', title: ''},
		{bid: 'nb-search-favicon', mid: 'superstart-search-engines-menu', title: ''}
		*/
	]);
	for (var k in id4ShowHide) {
		ob.subscribe(k, onNavbarItemOnoff);
		onNavbarItemOnoff(k);
	}
	ob.subscribe('searchengine', onSearchEngineChanged);
	onSearchEngineChanged();

	var sbar = $$('nb-search');
	var input = $$('nb-search-text');
	var blurWhenMouseOut = true;
	sbar.addEventListener('mouseenter', function() {
		if (document.activeElement == input) {
			blurWhenMouseOut = false;
		} else {
			blurWhenMouseOut = true;
		}

		input.focus();
	}, false);
	sbar.addEventListener('mouseout', function() {
		if (blurWhenMouseOut) {
			input.blur();
		}
	}, false);
	input.addEventListener('focus', onFocus, false);
	input.addEventListener('blur', onBlur, false);
	input.addEventListener('keypress', onKeyPress, false);
	input.addEventListener('click', function() {
		blurWhenMouseOut = false;
	}, false);

	function onFocus() {
		this.select();
		$.addClass(sbar, 'focus');
	}

	function onBlur() {
		this.setSelectionRange(0, 0);
		$.removeClass(sbar, 'focus');
	}

	function onKeyPress(evt) {
		blurWhenMouseOut = false;
		if (evt.keyCode == 13) {
			var text = this.value;
			if (text == '') {
				return;
			}

			var engine = getEngine();
			var submission = engine.getSubmission(text);
			var url = submission.uri.spec;

			var b = $.getMainWindow().getBrowser();
			if (evt.shiftKey) {
				this.select();
				b.selectedTab = b.addTab(url);
			} else if (evt.ctrlKey || evt.metaKey) {
				this.select();
				b.addTab(url);
			} else {
				this.value = '';
				document.location.href = url;
			}
		}
	}
});
evtMgr.clear(function() {
	engines = null;
	for (var k in id4ShowHide) {
		ob.unsubscribe(k, onNavbarItemOnoff);
	}
	ob.unsubscribe('use-default-searchengine', onSearchEngineChanged);
});

function initPopupButton(pops) {
	function onMouseDown(evt) {
		if (evt.button != 0) {
			return;
		}
		evt.preventDefault();
		evt.stopPropagation();

		var doc = $.getMainWindow().document;
		var b = evt.target;
		var m = doc.getElementById(b.mid);
		if (m) {
			if (m.state == 'closed') {
				var obj = doc.getElementById('browser').boxObject;
				var rc = b.getBoundingClientRect();
				var x = rc.left + obj.screenX, y = rc.top + obj.screenY;
				y += rc.height + 2;
				m.openPopupAtScreen(x, y, false);
				$.addClass(b, 'opened');
				m.addEventListener('popuphiding', onPopupHiding, true);
				m.bid = b.id;
			} else {
				m.hidePopup();
			}
		}
	}

	function onPopupHiding(evt) {
		var m = evt.target;
		var b = $$(m.bid);
		delete m.bid;
		$.removeClass(b, 'opened');
		m.removeEventListener('popuphiding', onPopupHiding, true);
	}

	for (var i = 0; i < pops.length; ++ i) {
		var p = pops[i];
		var b = $$(p.bid);
		b.mid = p.mid;
		if (p.title != '') {
			b.setAttribute('title', p.title);
		}
		b.addEventListener('mousedown', onMouseDown, true);
	}
	evtMgr.clear(function() {
		for (var i = 0; i < pops.length; ++ i) {
			var b = $$(p.bid);
			b.removeEventListener('mousedown', onMouseDown, true);
		}
	});
}

function onNavbarItemOnoff(evt, onoff) {
	onoff = cfg.getConfig(evt);
	var id = id4ShowHide[evt];
	if (id !== undefined) {
		var b = $$(id);
		onoff ? $.removeClass(b, 'hidden') : $.addClass(b, 'hidden');
	}
}

function onSearchEngineChanged() {
	var engine = getEngine();

	$$('nb-search-favicon').setAttribute('src', engine.iconURI.spec);
}

})();

