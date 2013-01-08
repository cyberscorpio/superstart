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

let buttonMap = {
	'cstm-select-image': selectImage,
	'cstm-clear-image': clearImage
};

let isHomepaged = sbprefs.getCharPref('browser.startup.homepage') == cfg.getConfig('index-url');

function initialize() {
	let d = document;

// restore the selected tab
	let idx = window.opener['option-tab-index'];
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
			if (enabled) {
				c.setAttribute('checked', true);
			}
			c.addEventListener('command', onCheckboxChanged, false);

			if (id == 'show-navbar' && !enabled) {
				let items = $('.navbar-item');
				for (let i = 0; i < items.length; ++ i) {
					items[i].setAttribute('disabled', true);
				}
			}

			if (id == 'show-buttons' && !enabled) {
				let items = $('.buttons-item');
				for (let i = 0; i < items.length; ++ i) {
					items[i].setAttribute('disabled', true);
				}
			}
		}
	}

// buttons
	for (let id in buttonMap) {
		let key = buttonMap[id];
		let c = $$(id);
		c && c.addEventListener('command', key, false);
	}

// Col
	let col = cfg.getConfig('col');
	let colPop = $$('sites-col-popup');
	colPop.addEventListener('command', onSitesColSelected, false);
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
	let links = document.getElementsByClassName('text-link');
	for (let i = 0, l = links.length; i < l; ++ i) {
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
	if (cb) {
		cb.removeEventListener('command', onSetHomepageChanged, false);
	}

	for (let id in boolMap) {
		let key = boolMap[id];
		let c = $$(id);
		if (c) {
			c.removeEventListener('command', onCheckboxChanged, false);
		}
	}

	for (let id in buttonMap) {
		let key = buttonMap[id];
		let c = $$(id);
		if (c) {
			cb.removeEventListener('command', key, false);
		}
	}

	let colPop = $$('sites-col-popup');
	if (colPop) {
		colPop.removeEventListener('command', onSitesColSelected, false);
	}
}

function onCheckboxChanged(evt) {
	let cb = evt.target;
	let id = cb.id;
	if (id && boolMap[id]) {
		cfg.setConfig(boolMap[id], cb.checked);
	}

	if (id == 'show-navbar') {
		let enabled = cb.checked;
		let items = $('.navbar-item');
		for (let i = 0; i < items.length; ++ i) {
			items[i].setAttribute('disabled', !enabled);
		}
	}

	if (id == 'show-buttons') {
		let enabled = cb.checked;
		let items = $('.buttons-item');
		for (let i = 0; i < items.length; ++ i) {
			items[i].setAttribute('disabled', !enabled);
		}
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
	window.opener['option-tab-index'] = $$('option-tabbox').selectedIndex;

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
		let ctrls = document.getElementsByClassName('cstm-ctrl');
		for (let i = 0, l = ctrls.length; i < l; ++ i) {
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
	}, false);
	if (!cfg.getConfig('use-customize')) {
		cb.checked = false;
	}

	let cstm = JSON.parse(tm.getUsData());
	usCss = cstm['css'] || '';
	let bg = cstm['#bg'] || cstm['body'] || {};

	cb = $$('use-bg-color');
	cb.addEventListener('CheckboxStateChange', function(evt) {
		let checked = evt.target.checked;
		hideElements(!checked, 'bg-color');
	}, false);
	if (cstm['+bg-color'] == null || !cstm['+bg-color']['enabled']) {
		cb.checked = false;
	}
	initBackgroundColor(cstm);

	cb = $$('use-text-color');
	cb.addEventListener('CheckboxStateChange', function(evt) {
		let checked = evt.target.checked;
		hideElements(!checked, 'text-color');
	}, false);
	if (cstm['+text-color'] == null || !cstm['+text-color']['enabled']) {
		cb.checked = false;
	}
	initTextColor(cstm);

	let bgImg = $$('cstm-bg-image');
	if (bg['background-image'] && bg['background-image'] != 'none') {
		bgImg.setAttribute('src', bg['background-image']);
		bgImg.style.backgroundImage = 'url(' + bg['background-image'] + ')';
	}
	bgImg.addEventListener('mousemove', onMouseMove, false);
	bgImg.addEventListener('mouseout', onMouseOut, false);

	initBackgroundPopupMenu(bg['background-repeat'], 'repeat', 'cstm-bg-repeat-menu', updateBgRpt, onBgRptCmd);
	initBackgroundPopupMenu(bg['background-size'], 'auto', 'cstm-bg-size-menu', updateBgSize, onBgSzCmd);
	initBackgroundPosition(bg['background-position']);

	let transparent = cstm['+transparent'] || false;
	if (transparent) {
		$$('cstm-transparent').checked = true;
	}

	let adv = $$('cstm-advanced');
	adv.addEventListener('command', function() {
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
	let bgi = $$('cstm-bg-image').getAttribute('src');
	if (bgi != '') {
		cstm['#bg']['background-image'] = bgi;

		let repeat = $$('cstm-bg-repeat-menu').getAttribute('bgValue');
		if (repeat != '') {
			cstm['#bg']['background-repeat'] = repeat;
		}
		let size = $$('cstm-bg-size-menu').getAttribute('bgValue');
		if (size != '') {
			cstm['#bg']['background-size'] = size;
		}
	}
	
	let bgColor = {};
	bgColor['enabled'] = $$('use-bg-color').checked == true;
	let color = $$('cstm-bg-color').value;
	if (color != '') {
		bgColor['color'] = color;
	}
	cstm['+bg-color'] = bgColor;

	let textColor = {};
	textColor['enabled'] = $$('use-text-color').checked == true;
	textColor['color'] = $$('cstm-text-color').selectedIndex;
	textColor['useShadow'] = $$('cstm-text-shadow').checked == true;
	cstm['+text-color'] = textColor;

	if ($$('cstm-transparent').checked == true) {
		cstm['+transparent'] = true;
	}

	if (usCss != '') {
		cstm['css'] = usCss;
	}

	tm.setUsData(JSON.stringify(cstm));
}
function initBackgroundPopupMenu(value, vDef, popupid, fnUpdate, onCmd) {
	if (value === undefined || value == '') {
		value = vDef;
	}

	var menu = $$(popupid);
	menu.setAttribute('bgValue', value);
	var items = menu.getElementsByTagName('menuitem');
	[].forEach.call(items, function(m) {
		if (m.value == value) {
			m.setAttribute('checked', true);
		}
		m.addEventListener('command', onCmd, false);
	});
	fnUpdate(value);
}

function onBgRptCmd() {
	let value = this.getAttribute('value');
	this.parentNode.setAttribute('bgValue', value);
	updateBgRpt(value);
}
function onBgSzCmd() {
	let value = this.getAttribute('value');
	this.parentNode.setAttribute('bgValue', value);
	updateBgSize(value);
}

function onPosChanged(evt) {
	let scaleX = $$('cstm-bg-x-pos');
	let scaleY = $$('cstm-bg-y-pos');
	let labelX = $$('cstm-bg-x-pos-value');
	let labelY = $$('cstm-bg-y-pos-value');
	let x = parseInt(scaleX.value);
	labelX.value = x + '%';
	let y = parseInt(scaleY.value);
	labelY.value = y + '%';

	let bgImg = $$('cstm-bg-image');
	bgImg.style.backgroundPosition = x + '% ' + y + '%';
}

function initBackgroundPosition(pos) {
	if (pos === undefined || pos == '') {
		pos = '10% 100%';
	}
	let ps = pos.split(' ');
	if (ps.length == 1) {
		ps.push(ps[0]);
	}
	let x = parseInt(ps[0]);
	let y = parseInt(ps[1]);
	let scaleX = $$('cstm-bg-x-pos');
	let scaleY = $$('cstm-bg-y-pos');
	let labelX = $$('cstm-bg-x-pos-value');
	let labelY = $$('cstm-bg-y-pos-value');
	scaleX.value = x;
	labelX.value = x + '%';
	scaleY.value = y;
	labelY.value = y + '%';

	let bgImg = $$('cstm-bg-image');
	bgImg.style.backgroundPosition = x + '% ' + y + '%';

	scaleX.addEventListener('change', onPosChanged, false);
	scaleY.addEventListener('change', onPosChanged, false);
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

function selectImage() {
	let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, getString('ssSelectImage'), nsIFilePicker.modeOpen);
	fp.appendFilters(nsIFilePicker.filterImages);
	let res = fp.show();
	if (res == nsIFilePicker.returnOK) {
		let bgImg = $$('cstm-bg-image');
		bgImg.setAttribute('src', getUrlFromFile(fp.file));
		bgImg.style.backgroundImage = 'url(' + getUrlFromFile(fp.file) + ')';
	}
}
function clearImage() {
	let bgImg = $$('cstm-bg-image');
	bgImg.removeAttribute('src');
	bgImg.style.backgroundImage = '';
}

function updateBgRpt(rpt) {
	let bgImg = $$('cstm-bg-image');
	rpt = rpt || '';
	bgImg.style.backgroundRepeat = rpt;
}
function updateBgSize(size) {
	let bgImg = $$('cstm-bg-image');
	size = size || ''
	bgImg.style.backgroundSize = size;
}
function updateBgColor() {
	let bgImg = $$('cstm-bg-image');
	let color = $$('cstm-bg-color').value;
	color = color || '';
	bgImg.style.backgroundColor = color;
}

function onMouseOver() {
	let bgImg = $$('cstm-bg-image');
}
function onMouseMove(evt) {
	let bgImg = $$('cstm-bg-image');
	if (bgImg.getAttribute('disabled') == 'true') {
		return;
	}
	let wrapper = $$('cstm-bg-image-wrapper');
	let x = evt.clientX;
	let y = evt.clientY;
	x = x - wrapper.boxObject.x;
	y = y - wrapper.boxObject.y;
	let top = y * (1280 - 256) / 256;
	let left = x * (1280 - 256) / 256;
	bgImg.style.top = '-' + top + 'px';
	bgImg.style.left = '-' + left + 'px';
}
function onMouseOut() {
	let bgImg = $$('cstm-bg-image');
	bgImg.style.top = '';
	bgImg.style.left = '';
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
