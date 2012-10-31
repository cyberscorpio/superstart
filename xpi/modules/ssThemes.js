/**
 * the implements of ssIThemes
 *
 * related events:
 * 	'theme-loaded' - (evt, theme-name)
 * 	'theme-removed' - (evt, theme-name)
 * 	'user-style-changed' - (evt, user-style-css-url)
 */
"use strict";
var EXPORTED_SYMBOLS = [ "ssThemes" ];

function ssThemes() {
let {classes: Cc, interfaces: Ci, results: Cr, utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

	let that = this;
	let logger = this.logger;
	let themeNames = {
		'Default' : 0 // index in themes
	};
	let themes = [
		// default
		{
			'name': 'Default',
			'css': '../skin/default/default.css',
			'thumbnail': {
				'background': '#eee',
				'color': 'black'
			}
		}
	];

	this.getThemes = function () {
		return this.stringify(themes);
	}

	this.getTheme = function (name) {
		let theme = getTheme(name);
		if (theme) {
			return this.stringify(theme);
		} else {
			return '';
		}
	}

	function getTheme(name) {
		let index = themeNames[name];
		if (index != undefined) {
			return themes[index];
		} else {
			return null;
		}
	}

	this.removeTheme = function(name) {
		let theme = getTheme(name);
		if (theme && !theme.builtin) {
			let index = themeNames[name];
			delete themes[index];
			themeNames = {};
			for (let i = 0, l = themes.length; i < l; ++ i) {
				themeNames[themes[i].name] = i;
			}

			let dir = installedDir.clone();
			dir.append(name);
			try {
				dir.remove(true);
			} catch (e) {
				return false;
			}
			if (this.getConfig('theme') == name) {
				this.setConfig('theme', 'Default');
			}
			this.fireEvent('theme-removed', name);
			return true;
		}
		return false;
	}


	this.installTheme = function(themeFile) {
		function getTargetFile(aDir, entry) {
			let target = aDir.clone();
			entry.split("/").forEach(function(aPart) {
				target.append(aPart);
			});
			return target;
		}

		let zipReader = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);
		zipReader.open(themeFile);
		let name = installSingleTheme(zipReader);
		if (name !== false) {
			let dir = installedDir.clone();
			dir.append(name);
			loadTheme(dir, false);
		}
		zipReader.close();
		return name ? name : '';
	}

	// user styles
	this.setUsData = function(json) {
		if (this.fileGetContents(usdFile) != json) {
			this.filePutContents(usdFile, json);
			usData = this.jparse(json);
			updateCSS();

			this.fireEvent('user-style-changed', this.getUsUrl());
		}
	}

	this.getUsData = function() {
		return this.stringify(usData);
	}

	this.getUsUrl = function() {
		return this.regulateUrl(uscFile.path);
	}

	// 1. themes
	// 1.1 load themes
	let extid = this.getConfig('extension-id');
	let builtinDir = FileUtils.getDir("ProfD", ['extensions', extid, 'themes']);
	let installedDir = FileUtils.getDir("ProfD", ['superstart', 'themes']);
	loadThemes(builtinDir, true);
	loadThemes(installedDir, false);

	// 1.2 finally, we check whether the "current" theme exists
	let curr = this.getConfig('theme');
	if (themeNames[curr] == undefined) {
		this.setConfig('theme', 'Default');
	}
	curr = null;

	// 2. user style
	let usdFile = FileUtils.getFile('ProfD', ['superstart', 'user.style.v1.json']);
	let uscFile = FileUtils.getFile('ProfD', ['superstart', 'user.style.v1.css']);
	let usData = {};
	if (usdFile.exists()) {
		loadUsData();
	}
	updateCSS();


	// utils
	/* load themes from a top directory */
	function loadThemes(dir, builtin) {
		try {
			let entries = dir.directoryEntries;
			while (entries.hasMoreElements()) {
				let themeDir = entries.getNext();
				themeDir.QueryInterface(Ci.nsIFile);

				loadTheme(themeDir, builtin);
			}
		} catch (e) {
			// logger.logStringMessage('*** Theme exception: ' + e + ' *** (' + dir.path + ')');
		}
	}

	function loadTheme (themeDir, builtin) {
		let subpath = themeDir.leafName;
		let info = themeDir.clone();
		info.append('info.json');
		if (info.exists()) {
			try {
				let theme = that.fileGetContents(info);
				info = null;
				theme = that.jparse(theme);
				if (theme.name != null && theme.css != null && themeNames[theme.name] === undefined) {
					if (builtin) {
						theme.css = '../skin/' + subpath + '/' + theme.css;
					} else {
						let dir = themeDir.clone();
						dir.append(theme.css);
						theme.css = 'file:///' + dir.path;
					}
					theme.builtin = builtin;
					if (theme.thumbnail) {
						let tt = theme.thumbnail;
						for (let k in tt) {
							tt[k] = processUsCss(tt[k]);
						}
					}

					// save it
					themeNames[theme.name] = themes.length;
					themes.push(theme);
					that.fireEvent('theme-loaded', theme.name);

					return theme;
				}
			} catch (e) {
				logger.logStringMessage(e);
			}
		}
		return null;
	}

	function readStringFromRawStream(rawStream) {
		let stream = Cc["@mozilla.org/scriptableinputstream;1"].
			createInstance(Ci.nsIScriptableInputStream);
		stream.init(rawStream);
		try {
			let data = new String();
			let chunk = {};
			do {
				chunk = stream.read(-1);
				data += chunk;
			} while (chunk.length > 0);
			return data;
		} catch(e) {
		}
		return null;
	}

	function installSingleTheme(zipReader) {
		try {
			let entries = zipReader.findEntries('info.json');
			if (entries.hasMore()) {
				let infoName = entries.getNext();
				let stream = zipReader.getInputStream(infoName);
				let info = readStringFromRawStream(stream);
				info = that.jparse(info);
				if (info.name) {
					let theme = getTheme(info.name);
					if (theme == null || !theme.builtin) {
						let dir = installedDir.clone();
						dir.append(info.name);
						dir.create(Ci.nsILocalFile.DIRECTORY_TYPE, FileUtils.PERMS_DIRECTORY);
						that.extractFiles(zipReader, dir);
						return info.name;
					}
				}
			}
		} catch (e) {
			logger.logStringMessage('********* isntall theme error: ' + e + ' *********');
		}
		return false;
	}

	function loadUsData() {
		usData = that.jparse(that.fileGetContents(usdFile));
	}

	function updateCSS() {
		let css = '';
		let u = usData;
		for (let k in u) {
			let v = u[k];
			if (k != 'css') {
				css += getCssRule(k, v);
			}
		}
		if (u['css'] != undefined) {
			css += processUsCss(u['css']);
		}

		if (!uscFile.exists() || that.fileGetContents(uscFile) != css) {
			that.filePutContents(uscFile, css);
		}
	}

	function getCssRule(selector, data) {
		if (selector.charAt(0) == '+') {
			if (selector == '+transparent') {
				return getTranslateCss();
			}
		} else {
			let css = selector + ' {\n';
			for (let k in data) {
				let v = data[k];
				if (k == 'background-image') {
					if (v != 'none') {
						css += '\t' + k + ': ' + 'url("' + v + '");\n';
					}
				} else {
					css += '\t' + k + ': ' + v + ';\n';
				}
			}
			css += '}\n';
			return css;
		}
	}

	function getTranslateCss() {
		let obj = {};
		let css = '';
		obj['#sites .site .snapshot, #sites .site:not(.opened):not(.closing) .title, #notes'] = {'opacity' : '0.5'};
		obj['#sites .site:hover .snapshot, #sites .site:hover:not(.opened):not(.closing) .title, #sites .site.folder.opened .snapshot, #notes:hover'] = {'opacity' : '1'};
		// obj['#sites .site:hover .button:not(:hover)'] = {'transition-property' : 'none'};
		obj['#sites .site.folder > a > .snapshot'] = {'background-color' : 'rgba(0,0,0,0.5)'};

		for (let k in obj) {
			let v = obj[k];
			css += getCssRule(k, v);
		}
		return css;
	}

	function processUsCss(css) {
		let maps = {
			'%profile%' : 'ProfD', // profile
			'%exedir%' : 'CurProcD', // bin dir
			'%home%' : 'Home', // c:\users\cyberscorpio (for win)
			'%desktop%' : 'Desk', // c:\user\cyberscorpio\Desktop (for win)
		}
		for (let k in maps) {
			let v = FileUtils.getDir(maps[k], []);
			v = that.regulateUrl(v.path);
			css = css.replace(new RegExp(k, 'g'), v);
		}

		/*
		var ids = [
			'ProfD',
			'DefProfRt',
			'UChrm',
			'DefRt',
			'PrfDef',
			'ProfDefNoLoc',
			'APlugns',
			'AChrom',
			'ComsD',
			'CurProcD',
			'Home',
			'TmpD',
			'ProfLD',
			'resource:app',
			'Desk',
			'Progs'
			];
		logger.logStringMessage('*******************************************');
		for (let i = 0, l = ids.length; i < l; ++ i) {
			try {
				let d = FileUtils.getFile(ids[i], []);
				logger.logStringMessage(ids[i] + ': ' + d.path);
			} catch (e) {
				logger.logStringMessage(e);
			}
		}
		logger.logStringMessage('*******************************************');
		*/
		return css.replace(/\\/g, '/');
	}
}

