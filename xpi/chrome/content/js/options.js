
var superStartOptions = {};

(function(opt) {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const nsIFilePicker = Ci.nsIFilePicker;
	var logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
	var cfg = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIConfig);
	var tm = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIThemes);
	var sbprefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

	window.addEventListener('DOMContentLoaded', function() {
		window.removeEventListener('DOMContentLoaded', arguments.callee, false);
		initialize();

		var dlg = $$('superstart-options');
		dlg.onAccept = onAccept;
		dlg.setAttribute('ondialogaccept', 'return document.getElementById("superstart-options").onAccept();');
	}, false);

	window.addEventListener('unload', function() {
		window.removeEventListener('unload', arguments.callee, false);
		cleanup();
	}, false);


	var boolMap = {
		'superstart-sites-use-compactmode' : 'site-compact',
		'superstart-sites-use-background-effect' : 'site-use-background-effect',
		'superstart-load-in-blanktab' : 'load-in-blanktab',
		'superstart-sites-open-in-newtab' : 'open-in-newtab',
		'superstart-show-recently-closed' : 'navbar-recently-closed',
		'superstart-show-themes' : 'navbar-themes',
		'superstart-use-customize' : 'use-customize'
	};

	var buttonMap = {
		'superstart-customize-select-image': selectImage,
		'superstart-customize-clear-image': clearImage
	};

	var customizeMaps = {
	};

	var isHomepaged = sbprefs.getCharPref('browser.startup.homepage') == cfg.getConfig('index-url');
	var mainWindow = null;


	function initialize() {
		let d = document;
	// get main window
		let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);  
		mainWindow = wm.getMostRecentWindow("navigator:browser");  

	// restore the selected tab
		let idx = window.opener['superstart-option-tab-index'];
		if (idx != undefined) {
			$$('superstart-option-tabbox').selectedIndex = idx;
		}
	// homepage
		var cb = $$('superstart-set-as-homepage');
		if (isHomepaged) {
			cb.setAttribute('checked', true);
		}
		cb.addEventListener('command', onSetHomepageChanged, false);

	// bool 
		for (let id in boolMap) {
			let key = boolMap[id];
			let c = $$(id);
			if (c) {
				if (cfg.getConfig(key)) {
					c.setAttribute('checked', true);
				}
				c.addEventListener('command', onCheckboxChanged, false);
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
		let colPop = $$('superstart-sites-col-popup');
		colPop.addEventListener('command', onSitesColSelected, false);
		let from = 4, to = 8;
		for (let i = 0; i + from <= to; ++ i) {
			let item = document.createElement('menuitem');
			let idx = i + from;
			item.setAttribute('label', idx);
			colPop.appendChild(item);
			if (idx == col) {
				$$('superstart-sites-col').selectedIndex = i;
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

	// version
		let v = $$('superstart-version');
		v && v.setAttribute('label', v.getAttribute('label') + ' (v' + cfg.getConfig('version') + ')');
	}

	function cleanup() {
		cleanupThemes();

		let cb = $$('superstart-set-as-homepage');
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
				cb.addEventListener('command', key, false);
			}
		}

		let colPop = $$('superstart-sites-col-popup');
		if (colPop) {
			colPop.removeEventListener('command', onSitesColSelected, false);
		}
	}

	function onCheckboxChanged(evt) {
		var cb = evt.target;
		let id = cb.id;
		if (id && boolMap[id]) {
			cfg.setConfig(boolMap[id], cb.hasAttribute('checked'));
		}
	}

	function onSetHomepageChanged(evt) {
		var cb = evt.target;
		if (cb.hasAttribute('checked') != isHomepaged) {
			if (isHomepaged) {
				sbprefs.setCharPref('browser.startup.homepage', 'about:home');
			} else {
				sbprefs.setCharPref('browser.startup.homepage', cfg.getConfig('index-url'));
			}
			isHomepaged = !isHomepaged;
		}
	}

	function onSitesColSelected() {
		let label = $$('superstart-sites-col').getAttribute('label');
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
		window.opener['superstart-option-tab-index'] = $$('superstart-option-tabbox').selectedIndex;

		return true;
	}

	opt.selectTheme = function() {
		var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, "Select a File", nsIFilePicker.modeOpen);
		fp.appendFilter("Theme files", "*.zip;");
		var res = fp.show();
		if (res == nsIFilePicker.returnOK) {
			var themeFile = fp.file;
			tm.installTheme(themeFile);
		}
	}

	// customize
	var repeatMap = [undefined, 'no-repeat', 'repeat-x', 'repeat-y'];
	var sizeMap = [undefined, 'cover', 'contain'];
	var usCss = '';

	function getCstmElem(id) {
		return $$('superstart-customize-' + id);
	}

	function initCustomize() {
		let cb = $$('superstart-use-customize');
		cb.addEventListener('CheckboxStateChange', function() {
			let ctrls = document.getElementsByClassName('customize-ctrl');
			for (let i = 0, l = ctrls.length; i < l; ++ i) {
				ctrls[i].setAttribute('disabled', !cb.checked);
			}
		}, false);

		if (!cfg.getConfig('use-customize')) {
			cb.checked = false;
		}

		let cstm = JSON.parse(tm.getUsData());
		usCss = cstm['css'] || '';
		let body = cstm['body'] || {};

		let bgImg = getCstmElem('bg-image');
		if (body['background-image'] && body['background-image'] != 'none') {
			bgImg.setAttribute('src', body['background-image']);
			bgImg.style.backgroundImage = 'url(' + body['background-image'] + ')';
		}
		bgImg.addEventListener('mousemove', onMouseMove, false);
		bgImg.addEventListener('mouseout', onMouseOut, false);

		initBackgroundRepeat(body['background-repeat']);
		initBackgroundSize(body['background-size']);
		initBackgroundColor(body['background-color']);

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
			'body': {}
		};
		let bgi = getCstmElem('bg-image').getAttribute('src');
		if (bgi != '') {
			cstm['body']['background-image'] = bgi;

			let repeat = repeatMap[getCstmElem('bg-repeat').selectedIndex];
			if (repeat != undefined) {
				cstm['body']['background-repeat'] = repeat;
			}
			let size = sizeMap[getCstmElem('bg-size').selectedIndex];
			if (size != undefined) {
				cstm['body']['background-size'] = size;
			}
		}
		let color = getCstmElem('bg-color').value;
		if (color != '') {
			cstm['body']['background-color'] = color;
			if (bgi == '') {
				cstm['body']['background-image'] = 'none';
			}
		}
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
	function initBackgroundColor(color) {
		if (color) {
			let input = getCstmElem('bg-color');
			input.value = color;
		}
		let picker = getCstmElem('bg-color-picker');
		picker.color = color;
		picker.onchange = function() {
			getCstmElem('bg-color').value = this.color;
		}
		let clear = getCstmElem('bg-color-clear');
		clear.addEventListener('command', function() {
			getCstmElem('bg-color').value = getCstmElem('bg-color-picker').color = '';
		}, false);
	}

	function selectImage() {
		let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, "Select an image", nsIFilePicker.modeOpen);
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
		let list = $$('superstart-theme-list');
		let currTheme = cfg.getConfig('theme');
		let themes = JSON.parse(tm.getThemes());

		let items = list.getElementsByTagName('listitem');
		while (items.length > 0) {
			items[0].parentNode.removeChild(items[0]);
		}

		for (var i = 0, l = themes.length; i < l; ++ i) {
			let theme = themes[i];

			var row = document.createElement('listitem');
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
		var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);  
		return ios.newFileURI(iF).spec; 
	}
})(superStartOptions);

