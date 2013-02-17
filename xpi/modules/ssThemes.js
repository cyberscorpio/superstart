/**
 * the implements of ssIThemes
 *
 * related events:
 * 	'theme-removed' - (evt, theme-name)
 * 	'user-style-changed' - (evt, user-style-css-url)
 */
"use strict";
var EXPORTED_SYMBOLS = [ "ssThemes" ];

function ssThemes() {
const {classes: Cc, interfaces: Ci, results: Cr, utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

	let that = this;
	let logger = this.logger;
	let extid = this.getConfig('extension-id');

	let themeNames;
	let themes;

	let installedDir;
	let usdFile;
	let uscFile;
	let bgDir;
	let usData;

	function load() {
		try {
			themeNames = {
				'Default' : 0 // index in themes
			};
			themes = [
				{
					'name': 'Default',
					'css': '../skin/default/default.css',
					'thumbnail': {
						'background': '#eee',
						'color': 'black'
					}
				}
			];

			// 1. themes
			// 1.1 load themes
			installedDir = FileUtils.getDir("ProfD", ['superstart', 'themes']);
			loadThemes(FileUtils.getDir("ProfD", ['extensions', extid, 'themes']), true); // builtin
			loadThemes(installedDir, false);
		
			// 1.2 finally, we check whether the "current" theme exists
			if (themeNames[that.getConfig('theme')] == undefined) {
				that.setConfig('theme', 'Default');
			}
		
			// 2. user style
			usdFile = FileUtils.getFile('ProfD', ['superstart', 'user.style.v1.json']);
			uscFile = FileUtils.getFile('ProfD', ['superstart', 'user.style.v1.css']);
			bgDir = FileUtils.getDir('ProfD', ['superstart', 'background-images']);
			usData = {};
			if (usdFile.exists()) {
				loadUsData();
			}
			updateCSS();
		} catch (e) {
			logger.logStringMessage('>>>> ' + e);
		}
	}

	this.reloadTheme = function() {
		load();
	}

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
			let data = this.jparse(json);
			// do we need to remove the background image?
			try {
				if (usData && usData['#bg'] && usData['#bg']['background-image']) {
					let bgi = usData['#bg']['background-image'];
					let newbgi = (data['#bg'] && data['#bg']['background-image']) ? data['#bg']['background-image'] : '';;
					if (newbgi != bgi) {
						if (bgi.indexOf('://') === -1) {
							let file = bgDir.clone();
							file.append(bgi);
							file.remove(false);
						}
					}
				}
			} catch (e) {
				logger.logStringMessage('remove exists background image failed');// it could fail if the file is removed...
			}

			this.filePutContents(usdFile, json);
			usData = checkUsData(data);
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

	this.getBackgroundImageUrl = function(fileOrUrl) {
		if (fileOrUrl.indexOf('://') === -1) {
			let file = bgDir.clone();
			file.append(fileOrUrl);
			return that.getUrlFromFile(file).spec;
		} else {
			return fileOrUrl;
		}
	}

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

	function checkUsData(usData) {
		if (usData['version'] && usData['version'] == '1.0') {
			return usData;
		}

		let changed = false;
		/*
		if (usData['version'] === undefined) {
			usData['version'] = '1.0';
			changed = true;
		}
		*/

		try {
			if (usData['body'] !== undefined) {
				if (usData['#bg'] === undefined) {
					usData['#bg'] = usData['body'];
				}
				delete usData['body'];
				changed = true;
			}

			if (usData['#bg'] && usData['#bg']['background-image']) {
				let bgi = usData['#bg']['background-image'];
				if (bgi && bgi.indexOf('file:///') === 0) {
					if (bgi.length < 13) { // shortest: 'file:///1.jpg'
						delete usData['#bg']['background-image'];
					} else {
						if (bgi.charAt(9) === ':') {
							bgi = bgi.replace('file:///', '');
							bgi = bgi.replace(/\//g, '\\');
						} else {
							bgi = bgi.replace('file://', '');
						}
						bgi = decodeURI(bgi);
						bgi = FileUtils.File(bgi);
						if (!bgi.exists()) {
							delete usData['#bg']['background-image'];
						} else {
							bgi.copyTo(bgDir, bgi.leafName);
							usData['#bg']['background-image'] = bgi.leafName;
						}
					}
					changed = true;
				}
			}

			if (changed) {
				that.filePutContents(usdFile, that.stringify(usData));
			}
		} catch (e) {
			logger.logStringMessage(e);
		}

		return usData;
	}

	function loadUsData() {
		usData = checkUsData(that.jparse(that.fileGetContents(usdFile)));
	}

	function updateCSS() {
		let css = '';
		let u = usData;
		for (let k in u) {
			let v = u[k];
			if (k != 'css') {
				if (k === 'body') { /* we don't use 'body' any more */
					k = '#bg';
				}
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
			switch(selector) {
			case '+transparent':
				return getTransparentCss();
			case '+bg-color':
				return getBgColor(data);
			case '+text-color':
				return getTextColor(data);
			}
		} else {
			let css = selector + ' {\n';
			for (let k in data) {
				let v = data[k];
				if (k == 'background-image') {
					if (v != 'none') {
						css += '\t' + k + ': ' + 'url("' + that.getBackgroundImageUrl(v) + '");\n';
					}
				} else {
					if (k !== 'version') {
						css += '\t' + k + ': ' + v + ';\n';
					}
				}
			}
			css += '}\n';
			return css;
		}
	}

	function getTransparentCss() {
		let obj = {};
		let css = '';
		obj['.site:not(.opened):not(.closing):not(:hover), #notes:not(:hover)'] = {'opacity' : '0.333333333333333'};
		obj['.site-snapshot'] = {'background-color' : 'rgba(0,0,0,0.5)'};

		for (let k in obj) {
			css += getCssRule(k, obj[k]);
		}
		return css;
	}

	function getBgColor(data) {
		if (!data.enabled || data.color == null) {
			return '';
		} else {
			return '#bg {\nbackground-color: ' + data.color + ';\n}\n';
		}
	}

	function getTextColor(data) {
		if (!data.enabled) {
			return '';
		} else {
			let css = '';
			if (data.color == 0) { // black
				css += '.site-title, li.note { color: black;';
				if (data.useShadow) {
					css += ' text-shadow: 1px 0 white, 0 1px white, 1px 1px white, -1px 0 white, 0 -1px white, 1px -1px white, -1px 1px white;';
				} else {
					css += ' text-shadow: none;';
				}
			} else {
				css += '.site-title, li.note { color: white;';
				if (data.useShadow) {
					css += ' text-shadow: 1px 0 black, 0 1px black, 1px 1px black, -1px 0 black, 0 -1px black, 1px -1px black, -1px 1px black;';
				} else {
					css += ' text-shadow: none;';
				}
			}
			css += '}\n';
			return css;
		}
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

	load();
}

