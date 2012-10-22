(function() {
const Cc = Components.classes;
const Ci = Components.interfaces;
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

	ob.subscribe('theme', onThemeChanged);
	ob.subscribe('toolbar-themes', onToolbarThemes);
	ob.subscribe('theme-loaded', onThemeLoaded);
	ob.subscribe('theme-removed', onThemeRemoved);
	ob.subscribe('use-customize', onUseCustomize);
	ob.subscribe('user-style-changed', onUserStyleChanged);
	window.addEventListener('unload', function() {
		window.removeEventListener('unload', arguments.callee, false);
	
		ob.unsubscribe('theme', onThemeChanged);
		ob.unsubscribe('toolbar-themes', onToolbarThemes);
		ob.unsubscribe('theme-loaded', onThemeLoaded);
		ob.unsubscribe('theme-removed', onThemeRemoved);
		ob.unsubscribe('use-customize', onUseCustomize);
		ob.unsubscribe('user-style-changed', onUserStyleChanged);

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

		// 1. theme & customize
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

		/*
		// 2. buttons
		var themeSelector = $$('theme-selector');
		while (themeSelector.firstChild) {
			themeSelector.removeChild(themeSelector.firstChild);
		}

		if (cfg.getConfig('toolbar-themes')) {
			for (var i = 0, l = themes.length; i < l; ++ i) {
				var t = themes[i];
				var thumbnail = t['thumbnail-background'];
				if (thumbnail != undefined) {
					var li = document.createElement('li');
					li.theme = t;
					li.onclick = onClick;
					li.setAttribute('title', t.name);
					li.style.background = thumbnail;
					if (t.name == currTheme) {
						$.addClass(li, 'current');
					}
					themeSelector.appendChild(li);
				}
			}
		}
		*/
	} catch (e) {
		logger.logStringMessage(e);
	}
}


function onThemeChanged(evt, newTheme) {
	refresh();
}

function onToolbarThemes(evt, showThemes) {
	refresh();
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
	if (!$.hasClass(li, 'current')) {
		var t = li.theme;
		if (t != undefined) {
			cfg.setConfig('theme', t.name);
		}
	}
}

})();
