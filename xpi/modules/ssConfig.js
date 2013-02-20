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
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

	var that = this;

	var sbprefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
	var themeKey = 'extensions.superstart.theme';
	var theme = sbprefs.getComplexValue(themeKey, Ci.nsISupportsString).data;

	var intCfgs = {
		'col' : {
			'key' : 'sites.col',
			'default' : 4,
			'min' : 3
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
		'sites-compact': {'key': 'sites.compact'},
		'sites-text-only': {'key': 'sites.text.only'},
		'sites-use-bg-effect': {'key': 'sites.use.background.effect'},
		'open-in-newtab': {'key': 'site.open.in.newtab'},
		'todo-hide': {'key': 'todo.hide'},

		'navbar': {'key': 'navbar'},
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

	////////////////////////////////////////////////////////////////////////////////
	// get configure
	this.getConfig = function (name) {
		switch(name) {
			case 'version':
				return sbprefs.getCharPref('extensions.superstart.version');
			case 'extension-id':
				return 'superstart@enjoyfreeware.org';
			case 'index-url':
				return 'chrome://superstart/content/index.html';
			case 'cloud-dir':
				return sbprefs.getComplexValue('extensions.superstart.cloud.dir', Ci.nsISupportsString).data;
			case 'cloud-subdir':
				return sbprefs.getComplexValue('extensions.superstart.cloud.subdir', Ci.nsISupportsString).data;

			// mutable
			case 'theme':
				return theme;
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
						let str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
						str.data = value;
						sbprefs.setComplexValue(themeKey, Ci.nsISupportsString, str);
					}
				}
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

	////////////////////////////////////////////////////////////////////////
	// observer 
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
}

