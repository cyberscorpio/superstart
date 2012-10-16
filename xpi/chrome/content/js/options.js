
var superStartOptions = {};

(function(opt) {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const nsIFilePicker = Ci.nsIFilePicker;
	var logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
	var cfg = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIConfig);
	var tm = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIThemes);
	var sbprefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

	var boolMaps = {
		'superstart-sites-showblank' : 'show-blank',
		'superstart-load-in-blanktab' : 'load-in-blanktab',
		'superstart-show-bookmarks' : 'toolbar-bookmark',
		'superstart-show-recentlyclosed' : 'toolbar-recentlyclosed',
		'superstart-show-themes' : 'toolbar-themes',
		'superstart-use-customize' : 'use-customize',
	};

	var customizeMaps = {
	};

	var isHomepaged = sbprefs.getCharPref('browser.startup.homepage') == cfg.getConfig('index-url');
	var mainWindow = null;


	opt.initialize = function initialize() {
		let d = document;
	// get main window
		let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);  
		mainWindow = wm.getMostRecentWindow("navigator:browser");  

	// restore the selected tab
		let idx = window.opener['superstart-option-tab-index'];
		if (idx != undefined) {
			g('superstart-option-tabbox').selectedIndex = idx;
		}
	// homepage
		var cb = g('superstart-set-as-homepage');
		if (isHomepaged) {
			cb.setAttribute('checked', true);
		}

	// bool 
		for (let id in boolMaps) {
			let key = boolMaps[id];
			let cb = g(id);
			if (cb) {
				if (cfg.getConfig(key)) {
					cb.setAttribute('checked', true);
				}
			}
		}

	// per line
		let spl = cfg.getConfig('site-perline');
		let splPop = g('superstart-sites-per-line-popup');
		let from = 3, to = 17;
		for (let i = 0; i + from <= to; ++ i) {
			let item = document.createElement('menuitem');
			let idx = i + from;
			item.setAttribute('label', idx);
			splPop.appendChild(item);
			if (idx == spl) {
				g('superstart-sites-per-line').selectedIndex = i;
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
		let v = document.getElementById('superstart-version');
		v.setAttribute('label', v.getAttribute('label') + ' (v' + cfg.getConfig('version') + ')');
	}

	opt.cleanup = function() {
		cleanupThemes();
	}

	opt.onSitesPerLineSelected = function() {
		let label = g('superstart-sites-per-line').getAttribute('label');
		cfg.setConfig('site-perline', label);
	}

	opt.onAccept = function() {
		// 1. bool options
		for (let id in boolMaps) {
			let key = boolMaps[id];
			let cb = g(id);
			if (cb) {
				cfg.setConfig(key, cb.hasAttribute('checked'));
			}
		}

		// 2. special case
		let cb = g('superstart-set-as-homepage');
		if (cb.hasAttribute('checked') != isHomepaged) {
			if (isHomepaged) {
				sbprefs.setCharPref('browser.startup.homepage', 'about:home');
			} else {
				sbprefs.setCharPref('browser.startup.homepage', cfg.getConfig('index-url'));
			}
		}

		// 3. customize
		saveCustomize();

		// 4. save tab index
		window.opener['superstart-option-tab-index'] = g('superstart-option-tabbox').selectedIndex;
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
	var positionMap = [undefined, 'center top', 'right top', 'left center', 'center center', 'right center', 'left bottom', 'center bottom', 'right bottom'];
	var repeatMap = [undefined, 'no-repeat', 'repeat-x', 'repeat-y'];
	var usCss = '';

	function getCstmElem(id) {
		return g('superstart-customize-' + id);
	}

	function initCustomize() {
		let cb = g('superstart-use-customize');
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

		if (body['background-image'] && body['background-image'] != 'none') {
			getCstmElem('bg-image').setAttribute('src', body['background-image']);
		}

		initBackgroundPosition(body['background-position']);
		initBackgroundRepeat(body['background-repeat']);
		initBackgroundColor(body['background-color']);

		let transparent = cstm['+transparent'] || false;
		if (transparent) {
			getCstmElem('transparent').checked = true;
		}

		let textBg = cstm['+text-background'] || false;
		if (textBg) {
			getCstmElem('text-background').checked = true;
		}

		let adv = getCstmElem('advance');
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
			cstm['body']['text-shadow'] = 'none';
		}
		let position = getBackgroundPosition();
		if (position != undefined) {
			cstm['body']['background-position'] = position;
		}
		let repeat = repeatMap[getCstmElem('bg-repeat').selectedIndex];
		if (repeat != undefined) {
			cstm['body']['background-repeat'] = repeat;
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

		if (getCstmElem('text-background').checked == true) {
			cstm['+text-background'] = true;
		}

		if (usCss != '') {
			cstm['css'] = usCss;
		}

		tm.setUsData(JSON.stringify(cstm));
	}

	function initBackgroundPosition(currPos) {
		let bgp = g('bg-position');
		for (let y = 0; y < 3; ++ y) {
			let hb = document.createElement('hbox');
			for (x = 0; x < 3; ++ x) {
				let p = document.createElement('vbox');
				p.addEventListener('click', onPositionClick, false);
				p.className = 'bg-position customize-ctrl';
				let cp = p['ss-value'] = positionMap[y * 3 + x];
				if (cp == currPos) {
					$.addClass(p, 'selected');
				}
				hb.appendChild(p);
			}
			bgp.appendChild(hb);
		}
	}
	function onPositionClick(evt) {
		let d = evt.target.getAttribute('disabled');
		if ($.hasClass(evt.target, 'selected') || evt.target.getAttribute('disabled') == "true") {
			return;
		}

		let ss = g('bg-position').getElementsByClassName('selected');
		for (let i = 0, l = ss.length; i < l; ++ i) {
			$.removeClass(ss[i], 'selected');
		}
		$.addClass(evt.target, 'selected');
	}
	function getBackgroundPosition() {
		let ss = g('bg-position').getElementsByClassName('selected');
		if (ss.length > 0) {
			return ss[0]['ss-value'];
		}
		return undefined;
	}
	function initBackgroundRepeat(repeat) {
		if (repeat) {
			let idx = 0;
			for (let i = 0, l = repeatMap.length; i < l; ++ i) {
				if (repeat == repeatMap[i]) {
					idx = i;
					break;
				}
			}
			getCstmElem('bg-repeat').selectedIndex = idx;
		}
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

	opt.selectImage = function() {
		let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, "Select an image", nsIFilePicker.modeOpen);
		fp.appendFilters(nsIFilePicker.filterImages);
		let res = fp.show();
		if (res == nsIFilePicker.returnOK) {
			getCstmElem('bg-image').setAttribute('src', getUrlFromFile(fp.file));
		}
	}
	opt.clearImage = function() {
		getCstmElem('bg-image').removeAttribute('src');
	}


	// themes
	function initThemes() {
		// buildThemeList();
	}

	function cleanupThemes() {
	}

	function buildThemeList() {
		let list = g('superstart-theme-list');
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

	function g(id) {
		return document.getElementById(id);
	}
})(superStartOptions);

