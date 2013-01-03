"use strict";
(function() {
var obevts = {
	'theme': onThemeChanged,
	'theme-loaded': onThemeLoaded,
	'theme-removed': onThemeRemoved,
	'use-customize': onUseCustomize,
	'user-style-changed': onUserStyleChanged
};
evtMgr.register([obevts], [], []);
evtMgr.ready(function() {
	refresh();
});

function refresh() {
	try {
		var currTheme = cfg.getConfig('theme');
		var theme = JSON.parse(tm.getTheme(currTheme));

		// theme & customize
		['theme', 'customize'].forEach(function(id, i, a) {
			var style = $$(id);
			if (style) {
				style.parentNode.removeChild(style);
			}
		});
		if (theme.css != '') {
			$.insertStyle(theme.css, 'theme');
		}
		if (cfg.getConfig('use-customize')) {
			$.insertStyle(tm.getUsUrl(), 'customize');
		}
	} catch (e) {
		log(e);
	}
}


function onThemeChanged(evt, newTheme) {
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
		$.insertStyle(tm.getUsUrl(), 'customize');
	}
}

function onUserStyleChanged(evt, url) {
	document.location.reload();
}

})();
