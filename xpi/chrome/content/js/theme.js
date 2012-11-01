(function() {
const {classes: Cc, interfaces: Ci} = Components;
var SuperStart = $.getMainWindow().SuperStart;
var getString = SuperStart.getString;
var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
var ob = ssObj.getService(Ci.ssIObserverable);
var cfg = ssObj.getService(Ci.ssIConfig);
var tm = ssObj.getService(Ci.ssIThemes);
ssObj = undefined;


window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);
	init();
}, false);

function init() {
	refresh();
	var sEvts = {
		'theme': onThemeChanged,
		'theme-loaded': onThemeLoaded,
		'theme-removed': onThemeRemoved,
		'use-customize': onUseCustomize,
		'user-style-changed': onUserStyleChanged
	};

	for (var k in sEvts) {
		ob.subscribe(k, sEvts[k]);
	}

	$$('nbc-themes-pointer').addEventListener('mousedown', showThemes, false);

	window.addEventListener('unload', function() {
		window.removeEventListener('unload', arguments.callee, false);
		for (var k in sEvts) {
			ob.unsubscribe(k, sEvts[k]);
		}
		$$('nbc-themes-pointer').removeEventListener('mousedown', showThemes, false);
		ob = cfg = tm = null;
	}, false);
}


function insertStyle(id, href) {
	var style = document.createElement('link');
	style.id = id;
	style.setAttribute('rel', 'stylesheet');
	style.setAttribute('type', 'text/css');
	style.setAttribute('href', href);
	document.getElementsByTagName('head')[0].appendChild(style);
}

function refresh() {
	try {
		var currTheme = cfg.getConfig('theme');
		var themes = JSON.parse(tm.getThemes());
		var theme = JSON.parse(tm.getTheme(currTheme));

		// theme & customize
		['theme', 'customize'].forEach(function(id, i, a) {
			var style = $$(id);
			if (style) {
				style.parentNode.removeChild(style);
				style = null;
			}
		});
		if (theme.css != '') {
			insertStyle('theme', theme.css);
		}
		if (cfg.getConfig('use-customize')) {
			insertStyle('customize', tm.getUsUrl());
		}
	} catch (e) {
		log(e);
	}
}


function onThemeChanged(evt, newTheme) {
	refresh();

	var t = $$('nb-themes');
	if (t) {
		var ts = $(t, 'li');
		for (var i = 0; i < ts.length; ++ i) {
			var li = ts[i];
			if (li.theme.name == newTheme) {
				$.addClass(li, 'current');
			} else {
				$.removeClass(li, 'current');
			}
		}
	}
}

function onThemeLoaded(evt, themeName) {
	refresh();
}

function onThemeRemoved(evt, themeName) {
	refresh();
}

function onUseCustomize(evt, use) {
	var style = $$('customize');
	if (style) {
		style.parentNode.removeChild(style);
		style = null;
	}
	if (cfg.getConfig('use-customize')) {
		insertStyle('customize', tm.getUsUrl());
	}
}

function onUserStyleChanged(evt, url) {
	// window.setTimeout(function() {
		document.location.reload();
	// }, 0);
}

function onClick(evt) {
	var li = evt.target;
	while (li && li.tagName != 'LI') {
		li = li.parentNode;
	}
	if (li && !$.hasClass(li, 'current')) {
		var t = li.theme;
		if (t != undefined) {
			cfg.setConfig('theme', t.name);
		}
	}
}

function showThemes() {
	window.getSelection().removeAllRanges()
	var t = $$('nb-themes');
	if (t == null) {
		tp = document.createElement('div');
		tp.id = 'nb-themes';
		var p = document.createElement('p');
		p.appendChild(document.createTextNode('Themes'));
		tp.appendChild(p);

		var ul = document.createElement('ul');
		tp.appendChild(ul);

		var ts = JSON.parse(tm.getThemes());
		var curr = cfg.getConfig('theme');
		for (var i = 0; i < ts.length; ++ i) {
			var t = ts[i];
			var thumbnail = t['thumbnail'];
			if (thumbnail !== undefined) {
				var li = document.createElement('li');
				li.theme = t;
				li.addEventListener('click', onClick, false);
				li.setAttribute('title', t.name);

				var preview = document.createElement('div');
				preview.appendChild(document.createTextNode(t.name));
				$.addClass(preview, 'preview');
				/*
				for (var k in thumbnail) {
					preview.style[k] = thumbnail[k];
				}
				*/

				li.appendChild(preview);
				if (t.name == curr) {
					$.addClass(li, 'current');
				}
				ul.appendChild(li);
			}
		}
		document.body.appendChild(tp);

		window.addEventListener('mousedown', onMouseDown, true);
	}
}

function hideThemes() {
	var tp = $$('nb-themes');
	tp.parentNode.removeChild(tp);
}

function onMouseDown(evt) {
	var t = evt.target;
	var cancel = true;
	while(t) {
		if (t.id == 'nb-themes') {
			cancel = false;
			break;
		}
		t = t.parentNode;
	}
	if (cancel) {
		window.removeEventListener('mousedown', onMouseDown, true);

		hideThemes();
		evt.stopPropagation();
		evt.preventDefault();
	}
}


})();
