"use strict";

const nsIFilePicker = Ci.nsIFilePicker;
let logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
let sbprefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

evtMgr.ready(function() {
	initialize();
	$$('options').addEventListener('dialogaccept', function() {
		return onAccept();
	}, false);
});

evtMgr.clear(function() {
	cleanup();
});

let boolMap = {
	'load-in-blanktab': 'load-in-blanktab',
	'sites-open-in-newtab': 'open-in-newtab',

	'sites-use-compactmode': 'sites-compact',
	'sites-use-textonly': 'sites-text-only',
	'sites-use-bg-effect': 'sites-use-bg-effect',

	'show-navbar': 'navbar', 'show-buttons': 'site-buttons',

	'show-newtab': 'site-buttons-newtab',  'show-refresh': 'site-buttons-refresh',
	'show-config': 'site-buttons-config',  'show-remove': 'site-buttons-remove',
	'show-next-snapshot': 'site-buttons-next-snapshot',

	'use-customize': 'use-customize'
};

let isHomepaged = sbprefs.getCharPref('browser.startup.homepage') == cfg.getConfig('index-url');

function initialize() {
	let d = document;

// restore the selected tab
	let idx = window.opener['superstart-option-tab-index'];
	if (idx != undefined) {
		$$('option-tabbox').selectedIndex = idx;
	}
// homepage
	let cb = $$('set-as-homepage');
	if (isHomepaged) {
		cb.setAttribute('checked', true);
	}
	cb.addEventListener('command', onSetHomepageChanged, false);

// bool 
	for (let id in boolMap) {
		let key = boolMap[id];
		let c = $$(id);
		if (c) {
			let enabled = cfg.getConfig(key);
			enabled && c.setAttribute('checked', true);
			c.addEventListener('command', onCheckboxChanged, false);

			if (id == 'show-buttons' && !enabled) {
				[].forEach.call($('.buttons-item'), function(m) {
					m.setAttribute('disabled', true);
				});
			}
		}
	}

// Col
	let col = cfg.getConfig('col');
	let colPop = $$('sites-col-popup');
	colPop && colPop.addEventListener('command', onSitesColSelected, false);
	let from = 3, to = 8;
	if (col > 32) {
		col = 32;
	}
	if (col > to) {
		to = col;
	}
	for (let i = 0; i + from <= to; ++ i) {
		let item = document.createElement('menuitem');
		let idx = i + from;
		item.setAttribute('label', idx);
		colPop.appendChild(item);
		if (idx == col) {
			$$('sites-col').selectedIndex = i;
		}
	}

// customize
	initCustomize();

// themes
	// initThemes();

// links
	let links = $('.text-link');
	for (let i = 0; i < links.length; ++ i) {
		let l = links[i];
		l.setAttribute('tooltiptext', l.getAttribute('href'));
	}

// hints
	$$('show-add-site').setAttribute('tooltiptext', getString('ssSiteAddNewHint'));
	$$('show-buttons').setAttribute('tooltiptext', getString('ssSiteButtonsHint'));

// version
	let v = $$('version');
	v && v.setAttribute('label', v.getAttribute('label') + ' (v' + cfg.getConfig('version') + ')');
}

function cleanup() {
	cleanupThemes();

	let cb = $$('set-as-homepage');
	cb && cb.removeEventListener('command', onSetHomepageChanged, false);

	for (let id in boolMap) {
		let c = $$(id);
		c && c.removeEventListener('command', onCheckboxChanged, false);
	}

	let colPop = $$('sites-col-popup');
	colPop && colPop.removeEventListener('command', onSitesColSelected, false);
}

function onCheckboxChanged(evt) {
	let cb = evt.target;
	let id = cb.id;
	let enabled = cb.checked;
	if (id && boolMap[id]) {
		cfg.setConfig(boolMap[id], enabled);
	}

	if (id == 'show-buttons') {
		[].forEach.call($('.buttons-item'), function(i) {
			i.setAttribute('disabled', !enabled);
		});
	}
}

function onSetHomepageChanged(evt) {
	let cb = evt.target;
	if (cb.checked != isHomepaged) {
		if (isHomepaged) {
			sbprefs.setCharPref('browser.startup.homepage', 'about:home');
		} else {
			sbprefs.setCharPref('browser.startup.homepage', cfg.getConfig('index-url'));
		}
		isHomepaged = !isHomepaged;
	}
}

function onSitesColSelected() {
	let label = $$('sites-col').getAttribute('label');
	cfg.setConfig('col', label);
}

function onAccept() {
	// 1. customize
	try {
		saveCustomize();
	} catch (e) {
		logger.logStringMessage(e);
	}

	// 2. save tab index
	window.opener['superstart-option-tab-index'] = $$('option-tabbox').selectedIndex;

	return true;
}

// customize
let usCss = '';

function hideElements(hide, cls) {
	let ctrls = document.getElementsByClassName(cls);
	for (let i = 0; i < ctrls.length; ++ i) {
		let c = ctrls[i];
		if (hide) {
			c.style.visibility = 'hidden';
		} else {
			c.style.visibility = 'visible';
		}
	}
}

function initCustomize() {
	let cb = $$('use-customize');
	cb.addEventListener('CheckboxStateChange', function(evt) {
		let checked = evt.target.checked;
		let ctrls = $('.cstm-ctrl');
		for (let i = 0; i < ctrls.length; ++ i) {
			let ctrl = ctrls[i];
			if (ctrl.getAttribute('focused')) {
				ctrl.blur();
			}
			if (checked) {
				ctrl.removeAttribute('disabled');
			} else {
				ctrl.setAttribute('disabled', true);
			}
		}
		checkImageStatus();
	}, false);
	if (!cfg.getConfig('use-customize')) {
		cb.checked = false;
	}

	let cstm = JSON.parse(tm.getUsData());
	usCss = cstm['css'] || '';
	let bg = cstm['#bg'] || cstm['body'] || {};

	initBgImage(bg);

	['bg-color', 'text-color'].forEach(function(cls) {
		cb = $$('use-' + cls);
		(cls == 'bg-color') ? initBackgroundColor(cstm) : initTextColor(cstm);
		cb.addEventListener('CheckboxStateChange', function(evt) {
			let enabled = evt.target.checked;
			hideElements(!enabled, cls);

			if (cls == 'bg-color') {
				$$('cstm-bg-image').style.backgroundColor = enabled ? $$('cstm-bg-color').value : '';
			}
		}, false);

		let key = '+' + cls;
		if (cstm[key] && cstm[key]['enabled']) {
			cb.checked = true;
		} else {
			hideElements(true, cls);
		}
	});

	let transparent = cstm['+transparent'] || false;
	transparent && ($$('cstm-transparent').checked = true);

	let adv = $$('cstm-advanced');
	adv && adv.addEventListener('command', function() {
		var params = { input: usCss, output: null };
		window.openDialog('chrome://superstart/content/css.xul', 
			'',
			'chrome,dialog,modal=yes,dependent=yes,centerscreen=yes,resizable=yes',
			params).focus();
		if (params.output !== null) {
			usCss = params.output;
		}
	}, false);
}

function saveCustomize() {
	let cstm = {
		'#bg': {}
	};

	saveBgImage(cstm['#bg']);
	
	let bgColor = {};
	bgColor['enabled'] = $$('use-bg-color').checked == true;
	let color = $$('cstm-bg-color').value;
	if (color != '') {
		bgColor['color'] = color;
	}
	cstm['+bg-color'] = bgColor;

	cstm['+text-color'] = {
		'enabled': $$('use-text-color').checked == true,
		'color': $$('cstm-text-color').selectedIndex,
		'useShadow': $$('cstm-text-shadow').checked == true
	};

	if ($$('cstm-transparent').checked == true) {
		cstm['+transparent'] = true;
	}

	if (usCss != '') {
		cstm['css'] = usCss;
	}

	tm.setUsData(JSON.stringify(cstm));
}

function initBackgroundColor(cstm) {
	let input = $$('cstm-bg-color');
	let picker = $$('cstm-bg-color-picker');
	if (cstm['+bg-color'] && cstm['+bg-color']['color']) {
		let color = cstm['+bg-color']['color'];
		input.value = color;
		picker.color = color;
	}
	picker.onchange = function() {
		$$('cstm-bg-color').value = this.color;
		$$('cstm-bg-image').style.backgroundColor = this.color;
	}
	input.onblur = function() {
		$$('cstm-bg-color-picker').color = this.value;
		$$('cstm-bg-image').style.backgroundColor = this.value;
	}
	input.onkeypress = function(evt) {
		if (evt.keyCode == 13) {
			$$('cstm-bg-color-picker').color = this.value;
			$$('cstm-bg-image').style.backgroundColor = this.value;
		}
	}
}
function initTextColor(cstm) {
	if (cstm['+text-color'] && cstm['+text-color']['color'] != 0) {
		$$('cstm-text-color').selectedIndex = 1;
	} else {
		$$('cstm-text-color').selectedIndex = 0;
	}
	if (cstm['+text-color'] && cstm['+text-color']['useShadow']) {
		$$('cstm-text-shadow').checked = true;
	}
}

// themes
function initThemes() {
	// buildThemeList();
}

function cleanupThemes() {
}

function buildThemeList() {
	let list = $$('theme-list');
	let currTheme = cfg.getConfig('theme');
	let themes = JSON.parse(tm.getThemes());

	let items = list.getElementsByTagName('listitem');
	while (items.length > 0) {
		items[0].parentNode.removeChild(items[0]);
	}

	for (let i = 0, l = themes.length; i < l; ++ i) {
		let theme = themes[i];

		let row = document.createElement('listitem');
		list.appendChild(row);

		row.themeName = theme.name;
		row.className = 'listitem-iconic';

		if (currTheme == theme.name) {
			row.current = true;
			row.setAttribute('checked', 'checked');
			list.selectedIndex = i;
		}
		row.setAttribute('label', theme.name);
	}
}

function onThemeLoaded(evt, name) {
	buildThemeList();
}
function onThemeRemoved(evt, name) {
	buildThemeList();
}
function onThemeChanged(evt, name) {
	buildThemeList();
}

function getUrlFromFile(iF) {
	let ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);  
	return ios.newFileURI(iF).spec; 
}
