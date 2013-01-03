"use strict";
var superStartOptions = {};

(function(opt) {
	const {classes: Cc, interfaces: Ci} = Components;
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
		'load-in-blanktab' : 'load-in-blanktab',
		'sites-open-in-newtab' : 'open-in-newtab',

		'sites-use-compactmode' : 'sites-compact',
		'sites-use-textonly': 'sites-text-only',
		'sites-use-bg-effect' : 'sites-use-bg-effect',

		'show-navbar' : 'navbar',
		'show-recently-closed' : 'navbar-recently-closed',
		'show-add-site' : 'navbar-add-site',
		'show-themes' : 'navbar-themes',
		'show-todo' : 'navbar-todo',

		'show-buttons' : 'site-buttons',
		'show-newtab' : 'site-buttons-newtab',
		'show-refresh' : 'site-buttons-refresh',
		'show-config' : 'site-buttons-config',
		'show-remove' : 'site-buttons-remove',
		'show-next-snapshot' : 'site-buttons-next-snapshot',

		'use-customize' : 'use-customize'
	};

	let buttonMap = {
		'cstm-select-image': selectImage,
		'cstm-clear-image': clearImage
	};

	let isHomepaged = sbprefs.getCharPref('browser.startup.homepage') == cfg.getConfig('index-url');
	let mainWindow = null;


	function initialize() {
		let d = document;
	// get main window
		let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);  
		mainWindow = wm.getMostRecentWindow("navigator:browser");  

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
		initThemes();

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

	opt.selectTheme = function() {
		let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, "Select a File", nsIFilePicker.modeOpen);
		fp.appendFilter("Theme files", "*.zip;");
		let res = fp.show();
		if (res == nsIFilePicker.returnOK) {
			let themeFile = fp.file;
			tm.installTheme(themeFile);
		}
	}

	// customize
	let repeatMap = [undefined, 'no-repeat', 'repeat-x', 'repeat-y'];
	let sizeMap = [undefined, 'cover', 'contain'];
	let usCss = '';

	function getCstmElem(id) {
		return $$('cstm-' + id);
	}

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
		let body = cstm['#bg'] || cstm['body'] || {};

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

		let bgImg = getCstmElem('bg-image');
		if (body['background-image'] && body['background-image'] != 'none') {
			bgImg.setAttribute('src', body['background-image']);
			bgImg.style.backgroundImage = 'url(' + body['background-image'] + ')';
		}
		bgImg.addEventListener('mousemove', onMouseMove, false);
		bgImg.addEventListener('mouseout', onMouseOut, false);

		initBackgroundRepeat(body['background-repeat']);
		initBackgroundSize(body['background-size']);

		let transparent = cstm['+transparent'] || false;
		if (transparent) {
			getCstmElem('transparent').checked = true;
		}

		let adv = getCstmElem('advanced');
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
		let bgi = getCstmElem('bg-image').getAttribute('src');
		if (bgi != '') {
			cstm['#bg']['background-image'] = bgi;

			let repeat = repeatMap[getCstmElem('bg-repeat').selectedIndex];
			if (repeat != undefined) {
				cstm['#bg']['background-repeat'] = repeat;
			}
			let size = sizeMap[getCstmElem('bg-size').selectedIndex];
			if (size != undefined) {
				cstm['#bg']['background-size'] = size;
			}
		}
		
		let bgColor = {};
		bgColor['enabled'] = $$('use-bg-color').checked == true;
		let color = getCstmElem('bg-color').value;
		if (color != '') {
			bgColor['color'] = color;
		}
		cstm['+bg-color'] = bgColor;

		let textColor = {};
		textColor['enabled'] = $$('use-text-color').checked == true;
		textColor['color'] = getCstmElem('text-color').selectedIndex;
		textColor['useShadow'] = getCstmElem('text-shadow').checked == true;
		cstm['+text-color'] = textColor;

		if (getCstmElem('transparent').checked == true) {
			cstm['+transparent'] = true;
		}

		if (usCss != '') {
			cstm['css'] = usCss;
		}

		tm.setUsData(JSON.stringify(cstm));
	}
	function initWithMap(value, map, id) {
		if (value) {
			let idx = 0;
			for (let i = 0, l = map.length; i < l; ++ i) {
				if (value == map[i]) {
					idx = i;
					break;
				}
			}
			getCstmElem(id).selectedIndex = idx;
		}
	}
	function initBackgroundRepeat(repeat) {
		initWithMap(repeat, repeatMap, 'bg-repeat');
		updateBgRpt();
		getCstmElem('bg-repeat').addEventListener('command', updateBgRpt, false);
	}
	function initBackgroundSize(size) {
		initWithMap(size, sizeMap, 'bg-size');
		updateBgSize();
		getCstmElem('bg-size').addEventListener('command', updateBgSize, false);
	}
	function initBackgroundColor(cstm) {
		let input = getCstmElem('bg-color');
		let picker = getCstmElem('bg-color-picker');
		if (cstm['+bg-color'] && cstm['+bg-color']['color']) {
			let color = cstm['+bg-color']['color'];
			input.value = color;
			picker.color = color;
		}
		picker.onchange = function() {
			getCstmElem('bg-color').value = this.color;
		}
	}
	function initTextColor(cstm) {
		if (cstm['+text-color'] && cstm['+text-color']['color'] != 0) {
			getCstmElem('text-color').selectedIndex = 1;
		} else {
			getCstmElem('text-color').selectedIndex = 0;
		}
		if (cstm['+text-color'] && cstm['+text-color']['useShadow']) {
			getCstmElem('text-shadow').checked = true;
		}
	}

	function selectImage() {
		let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, getString('ssSelectImage'), nsIFilePicker.modeOpen);
		fp.appendFilters(nsIFilePicker.filterImages);
		let res = fp.show();
		if (res == nsIFilePicker.returnOK) {
			let bgImg = getCstmElem('bg-image');
			bgImg.setAttribute('src', getUrlFromFile(fp.file));
			bgImg.style.backgroundImage = 'url(' + getUrlFromFile(fp.file) + ')';
		}
	}
	function clearImage() {
		let bgImg = getCstmElem('bg-image');
		bgImg.removeAttribute('src');
		bgImg.style.backgroundImage = '';
	}

	function updateBgRpt() {
		let bgImg = getCstmElem('bg-image');
		let repeat = repeatMap[getCstmElem('bg-repeat').selectedIndex];
		repeat = repeat || '';
		bgImg.style.backgroundRepeat = repeat;
	}
	function updateBgSize() {
		let bgImg = getCstmElem('bg-image');
		let size = sizeMap[getCstmElem('bg-size').selectedIndex];
		size = size || ''
		bgImg.style.backgroundSize = size;
	}
	function updateBgColor() {
		let bgImg = getCstmElem('bg-image');
		let color = getCstmElem('bg-color').value;
		color = color || '';
		bgImg.style.backgroundColor = color;
	}

	function onMouseOver() {
		let bgImg = getCstmElem('bg-image');
	}
	function onMouseMove(evt) {
		let bgImg = getCstmElem('bg-image');
		if (bgImg.getAttribute('disabled') == 'true') {
			return;
		}
		let wrapper = getCstmElem('bg-image-wrapper');
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
		let bgImg = getCstmElem('bg-image');
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
})(superStartOptions);

