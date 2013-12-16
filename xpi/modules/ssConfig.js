/**
 * the implements of ssIConfig
 *
 * *** NOTE ***
 *  !!! the config NAME is the SAME as the EVENT !!!
 *
 * related events:
 *  'theme'                   - (evt, new theme name)
 *  others see keys of 'intCfgs' and 'boolCfgs'
 */
"use strict";
var EXPORTED_SYMBOLS = [ "ssConfig" ];

function ssConfig() {
const {classes: Cc, interfaces: Ci, results: Cr, utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

	var that = this;

	var sbprefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
	var engines = Cc['@mozilla.org/browser/search-service;1'].getService(Ci.nsIBrowserSearchService);
	var themeKey = 'extensions.superstart.theme';
	var theme = sbprefs.getComplexValue(themeKey, Ci.nsISupportsString).data;
	var engineKey = 'extensions.superstart.searchengine.name';
	var engineName = sbprefs.getComplexValue(engineKey, Ci.nsISupportsString).data;
	var searchEngine = null;

	var intCfgs = {
		'col' : {
			'key': 'sites.col',
			'default': 4,
			'min': 3
		},

		'snapshot-width': {
			'key': 'site.snapshot.width',
			'default': 256,
			'min': 128,
			'max': 800
		},

		'snapshot-ratio-type': {
			'key': 'site.snapshot.ratio.type',
			'default': 1,
			'min': 1,
			'max': 2
		},

		'cloud-backup-count': {
			'key': 'cloud.backup.count',
			'default': 5,
			'min': 3
		}
	};

	for (let k in intCfgs) {
		let cfg = intCfgs[k];
		let v = sbprefs.getIntPref('extensions.superstart.' + cfg.key);
		if (cfg.min && v < cfg.min) {
			v = cfg['default'] || cfg.min;
		}
		if (cfg.max && v > cfg.max) {
			v = cfg['default'] || cfg.max;
		}
		cfg.value = v;
	}

	var boolCfgs = {
		'load-in-blanktab': {'key': 'load.in.blanktab'},
		'disable-context-menuitem': {'key': 'disable.context.menuitem'},
		'sites-compact': {'key': 'sites.compact'},
		'sites-text-only': {'key': 'sites.text.only'},
		'sites-use-bg-effect': {'key': 'sites.use.background.effect'},
		'open-in-newtab': {'key': 'site.open.in.newtab'},
		'open-in-newtab-near-me': {'key': 'site.open.in.newtab.near.me'},
		'todo-hide': {'key': 'todo.hide'},
		'enable-searchengine-select': {'key': 'enable.searchengine.select'},

		'navbar': {'key': 'navbar'},
		'navbar-search': {'key': 'navbar.search'},
		'navbar-recently-closed': {'key': 'navbar.recently.closed'},
		'navbar-add-site': {'key': 'navbar.add.site'},
		'navbar-themes': {'key': 'navbar.themes'},
		'navbar-todo': {'key': 'navbar.todo'},

		'site-buttons': {'key': 'site.buttons'},
		'site-buttons-newtab': {'key': 'site.buttons.newtab'},
		'site-buttons-refresh': {'key': 'site.buttons.refresh'},
		'site-buttons-config': {'key': 'site.buttons.config'},
		'site-buttons-remove': {'key': 'site.buttons.remove'},
		'site-buttons-next-snapshot': {'key': 'site.buttons.next.snapshot'},
		'site-folder-show-size': {'key': 'site.folder.show.size'},

		'use-customize': {'key': 'use.customize'},
		'import-sites-only': {'key': 'import.sites.only'}
	};
	for (let k in boolCfgs) {
		let cfg = boolCfgs[k];
		cfg.value = sbprefs.getBoolPref('extensions.superstart.' + cfg.key);
	}

	function writeString(key, value) {
		let str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
		str.data = value;
		sbprefs.setComplexValue(key, Ci.nsISupportsString, str);
	}

	////////////////////////////////////////////////////////////////////////////////
	// get configure
	let startPage = 'about:superstart';
	this.getConfig = function (name) {
		switch(name) {
			case 'version':
				return sbprefs.getCharPref('extensions.superstart.version');
			case 'extension-id':
				return 'superstart@enjoyfreeware.org';
			case 'index-url':
				return 'chrome://superstart/content/index.html';
			case 'start-page':
				return startPage;
			case 'cloud-dir':
				return sbprefs.getComplexValue('extensions.superstart.cloud.dir', Ci.nsISupportsString).data;
			case 'cloud-subdir':
				return sbprefs.getComplexValue('extensions.superstart.cloud.subdir', Ci.nsISupportsString).data;

			case 'multiprocess':
				try {
					return Services.appinfo.browserTabsRemote;
				} catch (e) {
					Cu.reportError(e);
					return false;
				}

			case 'snapshot-ratio':
				return this.getConfig('snapshot-ratio-type') == 1 ? 0.5625 : 0.625;

			// mutable
			case 'theme':
				return theme;
			case 'searchengine':
				return engineName;
			case 'sites-use-bg-effect': // currently Firefox (18b) can't work with 'transform: translate()' and 'filiter' both enabled.
				return false;
			default:
				if (intCfgs[name] != undefined) {
					return intCfgs[name].value;
				}
				if (boolCfgs[name] != undefined) {
					return boolCfgs[name].value;
				}
				return 'unknown name';
		}
	}

	// set configure
	this.setConfig = function (name, value) {
		switch(name) {
			case 'theme':
				if (value != theme) {
					if (this.getTheme(value) != '') { // make sure the theme exists
						writeString(themeKey, value);
					}
				}
				break;
			case 'searchengine':
				if (value != engineName) {
					writeString(engineKey, value);
				}
				break;
			case 'start-page': // ignore the value, because startPage can't be other value.
				startPage = this.getConfig('index-url');
				break;
			default:
				if (intCfgs[name] != undefined) {
					let cfg = intCfgs[name];
					if (cfg.value != value) {
						sbprefs.setIntPref('extensions.superstart.' + cfg.key, value);
					}
				}

				if (boolCfgs[name] != undefined) {
					let cfg = boolCfgs[name];
					if (cfg.value != value) {
						sbprefs.setBoolPref('extensions.superstart.' + cfg.key, value);
					}
				}
				break;
		}
	}

	this.getSearchEngine = function() {
		if (searchEngine === null) {
			if (engineName == 'superstart') {
				searchEngine = engines.currentEngine.name;
			}

			try {
				searchEngine = engines.getEngineByName(engineName);
			} catch (e) { }

			if (searchEngine == null) {
				searchEngine = engines.currentEngine;
			}
		}

		return searchEngine;
	}

	////////////////////////////////////////////////////////////////////////
	// observers 
	var ssPrefObserver = {
		register: function() {
			var prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
			this.branch = prefService.getBranch("extensions.superstart.");
			this.branch.addObserver("", this, false);
		},

		unregister: function() {
			if(!this.branch) {
				return;
			}
			this.branch.removeObserver("", this);
		},

		observe: function(aSubject, aTopic, aData) {
			if(aTopic != "nsPref:changed") {
				return;
			}
	
			if (aData == 'theme') {
				theme = sbprefs.getComplexValue(themeKey, Ci.nsISupportsString).data;
				that.fireEvent('theme', theme);
			} else if (aData == 'searchengine.name') {
				engineName = sbprefs.getComplexValue(engineKey, Ci.nsISupportsString).data;
				searchEngine = null;
				that.fireEvent('searchengine', engineName);
			} else {
				let cfgs = [intCfgs, boolCfgs];
				for (let i = 0; i < cfgs.length; ++ i) {
					let cfg = cfgs[i];
					for (let k in cfg) {
						let c = cfg[k];
						if (c.key == aData) {
							let key = 'extensions.superstart.' + c.key;
							c.value = (i == 0 ? sbprefs.getIntPref(key) : sbprefs.getBoolPref(key));
							that.fireEvent(k, c.value);
							return;
						}
					}
				}
			}
		}
	}
	ssPrefObserver.register();

	/*
	var ssSearchObserver = {
		register: function() {
			var prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
			this.branch = prefService.getBranch("browser.search.");
			this.branch.addObserver("", this, false);
		},

		unregister: function() {
			if(!this.branch) {
				return;
			}
			this.branch.removeObserver("", this);
		},

		observe: function(aSubject, aTopic, aData) {
			if(aTopic != "nsPref:changed") {
				return;
			}
	
			if (aData == 'selectedEngine') {
				// if (that.getConfig('use-default-searchengine')) {
				//	that.fireEvent('use-default-searchengine', true);
				// }
			}
		}
	}
	ssSearchObserver.register();
	*/
}

