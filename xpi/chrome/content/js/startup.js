"use strict";
if ("undefined" == typeof(SuperStart)) {
	var SuperStart = {};

	(function() {
		const {classes: Cc, interfaces: Ci, results: Cr, manager: Cm} = Components;
		Cu.import("resource://gre/modules/XPCOMUtils.jsm");
		Cu.import("resource://gre/modules/Services.jsm");
		function $$(id) {
			return document.getElementById(id);
		}

		function isProtocolSupported(url) {
			let u = url.toLowerCase();
			return ['http://', 'https://', 'file:///', 'about:'].some(function(protocol) {
				if (u.indexOf(protocol) == 0) {
					return true;
				}
			});
		}

		let sbprefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
		let logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
		let searchEngines = Cc['@mozilla.org/browser/search-service;1'].getService(Ci.nsIBrowserSearchService);
		let strings = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService).createBundle("chrome://superstart/locale/main.properties");
		let sessions = Cc['@mozilla.org/browser/sessionstore;1'].getService(Ci.nsISessionStore);
		let hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
		let bs = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
		let cfg = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIConfig);
		let sm = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssISiteManager);
		let tm = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIThemes);
		let ob = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIObserverable);

		let savedOpenTab = function() {}
		let indexUrl = cfg.getConfig('index-url');
		let startPage = cfg.getConfig('start-page');

		// register about:superstart
		function aboutModule() {}
		aboutModule.prototype = {
			uri: Services.io.newURI(indexUrl, null, null),
			classDescription: 'about:superstart',
			classID: Components.ID('7826E96C-3C96-4DF3-B9C2-51AD017029A2'),
			contractID: '@mozilla.org/network/protocol/about;1?what=superstart',
 
			QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
 
			newChannel: function(aURI) {
				let chan = Services.io.newChannelFromURI(this.uri);
				chan.originalURI = aURI;
				return chan;
			},
			getURIFlags: function(aURI) {
				return 0;
			}
		};

		(function registerComponents() {
		 	let hpk = 'browser.startup.homepage';
			try {
				let cls = aboutModule;
				const factory = {
					createInstance: function(outer, iid) {
						if (outer) {
							throw Cr.NS_ERROR_NO_AGGREGATION;
						}
						return new cls();
					}
				};
				Cm.QueryInterface(Ci.nsIComponentRegistrar);
				Cm.registerFactory(cls.prototype.classID, cls.prototype.classDescription, cls.prototype.contractID, factory);
				// don't need to unregisterFactory(cls.prototype.classID, factory);
				if (sbprefs.getCharPref(hpk) == indexUrl) {
					sbprefs.setCharPref(hpk, startPage);
				}
			} catch (e) {
				if (e.result != 3253928192) { // NS_ERROR_FACTORY_EXISTS
					// register failed...
					Cu.reportError(e);
					if (sbprefs.getCharPref(hpk) == startPage) {
						sbprefs.setCharPref(hpk, indexUrl);
					}
					startPage = indexUrl;
					cfg.setConfig('start-page', 'fall back...');
				}
			}
		})();

		if (window.gInitialPages) {
			try {
				window.gInitialPages.push(startPage);
				window.gInitialPages.push(startPage + '#');
			} catch (e) {}
		}

		function onLoad() {
			window.removeEventListener('load', onLoad, false);

			// context menu
			let menu = $$('contentAreaContextMenu');
			menu.addEventListener('popupshowing', function(evt) {

				let hide = cfg.getConfig('disable-context-menuitem');

				// let n = this.triggerNode;
				// check this link: https://developer.mozilla.org/en-US/docs/XUL/PopupGuide/Extensions
				let m = gContextMenu;
				let item = $$('context-superstart-add-link');
				item.hidden = true;
				if (!hide && m.onLink && isProtocolSupported(m.linkURL)) {
					item.hidden = false;
				}

				item = $$('context-superstart-add');
				item.hidden = true;
				let link = gBrowser.selectedBrowser.contentDocument.location.href;
				if (!hide && !m.onTextInput && !m.onImage && !m.onLink && !m.onMailtoLink && isProtocolSupported(link)) {
					item.hidden = false;
				}
			}, false);

			// tab context menu
			menu = $$('tabContextMenu');
			menu.addEventListener('popupshowing', function(evt) {
				let item = $$('tab-context-superstart-add');
				item.hidden = true;
				let link = gBrowser.getBrowserForTab(TabContextMenu.contextTab).contentDocument.location.href;
				if (isProtocolSupported(link)) {
					item.hidden = false;
				}
			}, false);


			/*
			if (SuperStart.loadInBlank()) {
				sbprefs.setCharPref('browser.newtab.url', startPage);
			} else {
				if (sbprefs.getCharPref('browser.newtab.url') == startPage) {
					sbprefs.setCharPref('browser.newtab.url', 'about:newtab');
				}
			}
			*/
			onLoadInBlankChanged(null, SuperStart.loadInBlank());
			ob.subscribe('load-in-blanktab', onLoadInBlankChanged);
			onLoadInBlankChanged('load-in-blanktab', ob.getConfig('load-in-blanktab'));

			// for preloader
			let fxVersion = Services.appinfo.version;
			try {
				// let me check it later.
				if (false) {//parseInt(fxVersion) >= 41) {
					let preloader = SuperStart.preloader = Cu.import('resource://superstart/Preloader.jsm', {}).SuperStartPreloader;
//					preloader.init(startPage);
					preloader.ensurePreloading();
					if (gBrowser.addTab) {
						/*
						let src = 'docShellsSwapped = gBrowserNewTabPreloader.newTab(t);';
						let dst = 'docShellsSwapped = gBrowserNewTabPreloader.newTab(t);} ' +
							'if (!docShellsSwapped && aURI == "' + startPage + 
							'" && !PrivateBrowsingUtils.isWindowPrivate(window) &&' +
							' !gMultiProcessBrowser) {' +
								'try {' +
									'docShellsSwapped = SuperStart.preloader.newTab(t);' +
								'} catch(e) {' +
									'Cu.reportError(e);' +
								'}';
						*/
						// TODO: must keep it the same with TabBrowser.xml::addTab()
						let src = 'usingPreloadedContent = gCustomizationTabPreloader.newTab(t)';
						let dst = 'usingPreloadedContent = gCustomizationTabPreloader.newTab(t);} ' +
							'if (aURI == "' + startPage + '") {' +
								'try {' +
									'usingPreloadedContent = SuperStart.preloader.newTab(t);' +
								'} catch(e) {' +
									'Cu.reportError(e);' + 
								'}';
						eval('gBrowser.addTab = ' + gBrowser.addTab.toString().replace(src, dst));
					} else {
						Cu.reportError('No gBrowser.addTab()');
					}
				}
			} catch (e) {
				Cu.reportError(e);
			}
			// check version first
			checkFirstRun();
		}
		window.addEventListener('load', onLoad, false);

		////////////////////////////////////////////////
		// methods
		SuperStart.onContextMenuAddLink = function() {
			let m = gContextMenu;
			if (m.onLink && isProtocolSupported(m.linkURL)) {
				sm.addSite(m.linkURL, '', 1, false, '');
			}
		}
	
		SuperStart.onContextMenuAdd = function() {
			let link = gBrowser.selectedBrowser.contentDocument.location.href;
	
			sm.addSite(link, '', 1, false, '');
		}

		SuperStart.onTabContextMenuAdd = function() {
			let link = gBrowser.getBrowserForTab(TabContextMenu.contextTab).contentDocument.location.href;
			if (isProtocolSupported(link)) {
				sm.addSite(link, '', 1, false, '');
			}
		}

		SuperStart.onMenuAdd = function() {
			let dlg = window.openDialog('chrome://superstart/content/url.xul',
					'',
					'chrome,dialog,dependent=yes,centerscreen=yes,resizable=yes', [-1, -1]);
		}

		SuperStart.onMenuAddPlaceHolder = function() {
			sm.addSite('about:placeholder', '', 0, false, '');
		}

		SuperStart.onMenuRefreshAll = function() {
			if (gBrowser.selectedBrowser.contentWindow.confirm(SuperStart.getString('ssSiteRefreshAllConfirm'))) {
				sm.refreshSite(-1, -1);
			}
		}

		SuperStart.showExImDialog = function() {
			let dlg = window.openDialog('chrome://superstart/content/export-import.xul',
					'',
					'chrome,dialog,modal=yes,dependent=yes,centerscreen=yes,resizable=yes');
		}

		SuperStart.onMenuOptions = function() {
			let dlg = window.openDialog('chrome://superstart/content/options.xul',
					'',
					'chrome,dialog,modal=yes,dependent=yes,centerscreen=yes,resizable=yes');
		}

		SuperStart.onToolbarOpen = function() {
			try {
				if (gBrowser.contentDocument.location.href != startPage) {
					/*
					let bmm = gBrowser.selectedBrowser.messageManager;
					bmm.loadFrameScript('chrome://superstart/content/js/e10s.js', true);
					bmm.sendAsyncMessage('superstart@enjoyfreeware.org:load-url', {
						url: startPage
					});
					*/
					gBrowser.contentDocument.location.href = startPage;
				} else {
					gBrowser.contentDocument.location.reload();
				}
			} catch (e) {
				Cu.reportError(e);
			}
		}

		// note: this method is mainly copied from: PHM_populateUndoSubmenu() in Browser-places.js
		SuperStart.populateUndoMenu = function() {
			let menu = $$('superstart-recently-closed-list');
			while (menu.hasChildNodes()) {
				menu.removeChild(menu.firstChild);
			}

			if (sessions.getClosedTabCount(window) == 0) {
				let m = document.createElement("menuitem");
				m.setAttribute("label", this.getString('ssEmpty'));
				menu.appendChild(m);
				return;
			}

			let undoItems = JSON.parse(sessions.getClosedTabData(window));
			for (let i = 0, l = undoItems.length; i < l; ++ i) {
				let m = document.createElement("menuitem");
				m.setAttribute("label", undoItems[i].title);
				if (undoItems[i].image) {
					let src = undoItems[i].image;
					if (/^https?:/.test(src)) {
						src = "moz-anno:favicon:" + src;
					}
					m.setAttribute("image", src);
				}
				m.setAttribute("class", "menuitem-iconic bookmark-item menuitem-with-favicon");
				m.setAttribute("value", i);
				m.addEventListener("command", function() {
					myUndoCloseTab(this.getAttribute('value'));
				}, false);

				let tabData = undoItems[i].state;
				let activeIndex = (tabData.index || tabData.entries.length) - 1;
				if (activeIndex >= 0 && tabData.entries[activeIndex]) {
					m.setAttribute("targetURI", tabData.entries[activeIndex].url);
				}

				m.addEventListener("click", undoCloseMiddleClick, false);
				/*
				if (i == 0) {
					m.setAttribute("key", "key_undoCloseTab");
				}
				*/
				menu.appendChild(m);
			}

			// "Restore All Tabs"
			let strings = gNavigatorBundle;
			menu.appendChild(document.createElement("menuseparator"));
			let m = menu.appendChild(document.createElement("menuitem"));
			m.id = "superstart_restoreAllTabs";
			m.setAttribute("label", strings.getString("menuRestoreAllTabs.label"));
			m.addEventListener("command", function() {
				for (let i = 0, l = undoItems.length; i < l; ++ i) {
					undoCloseTab();
				}
			}, false);
		}

		SuperStart.populateThemes = function() {
			let menu = $$('superstart-themes-list-menu');
			while (menu.hasChildNodes()) {
				menu.removeChild(menu.firstChild);
			}
			let ts = JSON.parse(tm.getThemes());
			let curr = cfg.getConfig('theme');
			for (let i = 0; i < ts.length; ++ i) {
				let t = ts[i];
				let m = document.createElement('menuitem');
				m.setAttribute('label', t.name);
				m.setAttribute('value', t.name);
				m.setAttribute('type', 'radio');
				m.setAttribute('name', 'superstart-themes-list');
				if (t.name == curr) {
					m.setAttribute('checked', true);
				}
				m.addEventListener("command", function() {
					cfg.setConfig('theme', this.getAttribute('value'));
				}, false);

				menu.appendChild(m);
			}
		}

		SuperStart.populateSearchEngines = function() {
			let menu = $$('superstart-search-engines-menu');
			while (menu.hasChildNodes()) {
				menu.removeChild(menu.firstChild);
			}

			let engineUsing = cfg.getSearchEngine();
			let engines = searchEngines.getVisibleEngines();
			let visible = false;
			for (let i = 0; i < engines.length; ++ i) {
				let engine = engines[i];
				let m = document.createElement("menuitem");
				m.setAttribute('label', engine.name);
				m.setAttribute('type', 'radio');
				if (engine.iconURI && engine.iconURI.spec) {
					m.setAttribute('image', engine.iconURI.spec);
				}
				m.setAttribute('class', "menuitem-iconic bookmark-item menuitem-with-favicon");
				m.setAttribute('value', engine.name);
				if (engine.name == engineUsing.name) {
					visible = true;
					m.setAttribute('checked', true);
				}
				m.addEventListener('command', function() {
					cfg.setConfig('searchengine', this.getAttribute('value'));
				}, false);
				menu.appendChild(m);
			}
			// TODO: if 'engineUsing' is not visible...
		}

		SuperStart.getString = function(name) {
			try {
				var str = strings.GetStringFromName(name);
			} catch (e) {
				str = name;
				let txt = e.message + " (" + name + " is missing)";
				logger.logStringMessage(txt);
			}
			return str;
		}

		SuperStart.loadInBlank = function() {
			return cfg.getConfig('load-in-blanktab');
		}
		SuperStart.getStartPage = function() {
			return startPage;
		}

		////////////////////////////////////////////////
		// private functions

		function onLoadInBlankChanged(evt, enabled) {
			enabled = enabled;

			try {
				Cu.import("resource:///modules/NewTabURL.jsm");
				if (enabled) {
					NewTabURL.override(cfg.getConfig('start-page'));
				} else {
					NewTabURL.reset();
				}
			} catch (e) {
				// the old way
				sbprefs.setCharPref('browser.newtab.url', enabled ? cfg.getConfig('start-page') : 'about:newtab');
			}
		}

		function openTab() {
			if (SuperStart.loadInBlank()) {
				if (!gBrowser) {
					window.openDialog("chrome://browser/content/", "_blank", "chrome,all,dialog=no", startPage);
				} else {
					gBrowser.loadOneTab(startPage, {inBackground: false});
					focusAndSelectUrlBar();
				}
			} else {
				savedOpenTab();
			}
		}

		/**
		 * This function is mainly copied from Browser.js::undoCloseTab();
		 */
		function myUndoCloseTab(idx) {
			let blankTabToRemove = gBrowser.selectedTab;
			let tab = null;
			let ss = Cc["@mozilla.org/browser/sessionstore;1"].getService(Ci.nsISessionStore);
			if (sessions.getClosedTabCount(window) > (idx || 0)) {
				TabView.prepareUndoCloseTab(blankTabToRemove);
				tab = sessions.undoCloseTab(window, idx || 0);
				TabView.afterUndoCloseTab();
			
				if (blankTabToRemove)
					gBrowser.removeTab(blankTabToRemove);
				}

			return tab;
		}

		// check version
		function checkFirstRun() {
			let id = cfg.getConfig('extension-id');
			let name = 'Super Start';
			let vk = 'extensions.superstart.version';
			let ver = sbprefs.getCharPref(vk);
			let addver = ver;
			try {
				Cu.import("resource://gre/modules/AddonManager.jsm");
				AddonManager.getAddonByID(id, function(addon) {
					if (addon.name == name) {
						addver = addon.version;
						if (addver != ver && window.navigator.onLine) {
							sbprefs.setCharPref(vk, addver);
							showHomepage();
						}
					}
				});
			} catch (e) {
				Cu.reportError(e);
			}
		}

		function showHomepage() {
			var thm = Cc["@mozilla.org/thread-manager;1"].getService(Ci.nsIThreadManager);
			thm.mainThread.dispatch({
				run: function(){
					let homepg = 'http://www.enjoyfreeware.org/superstart/?v=' + cfg.getConfig('version');
					gBrowser.selectedTab = gBrowser.addTab(homepg);
				}
			}, Ci.nsIThread.DISPATCH_NORMAL);
		}

		// helper function(s)
		// copied from PHM__undoCloseMiddleClick() in Browser-places.js
		function undoCloseMiddleClick(aEvent) {
			if (aEvent.button != 1) {
				return;
			}

			undoCloseTab(aEvent.originalTarget.value);
			gBrowser.moveTabToEnd();
			let menu = $$('superstart-recently-closed-list');
			menu.hidePopup();
		}

		function insertBookmarkNode(menu, node) {
			switch (node.type) {
			case node.RESULT_TYPE_URI:
				var m = document.createElement('menuitem');
				m.setAttribute("label", node.title);
				if (node.icon) {
					let src = node.icon;
					if (/^https?:/.test(src)) {
						src = "moz-anno:favicon:" + src;
					}
					m.setAttribute("image", src);
				}
				m.setAttribute("class", "menuitem-iconic bookmark-item menuitem-with-favicon");
				m.setAttribute('tooltiptext', node.uri);

				m.setAttribute("bmlink", node.uri);
				m.addEventListener("command", function() {
					gBrowser.selectedBrowser.loadURI(this.getAttribute("bmlink"));
				}, false);
				menu.appendChild(m);
			break;
			case node.RESULT_TYPE_FOLDER:
				var m = document.createElement('menu');
				m.setAttribute("label", node.title);
				m.setAttribute('class', 'menu-iconic bookmark-item');
				m.setAttribute('container', true);
				menu.appendChild(m);
				let popup = document.createElement('menupopup');
				m.appendChild(popup);
				node.QueryInterface(Ci.nsINavHistoryQueryResultNode)
				node.containerOpen = true;
				try {
					for (let i = 0, l = node.childCount; i < l; ++ i) {
						insertBookmarkNode(popup, node.getChild(i));
					}
				} finally {
					node.containerOpen = false;
				}
			break;
			case node.RESULT_TYPE_SEPARATOR:
				menu.appendChild(document.createElement('menuseparator'));
			break;
			case node.RESULT_TYPE_QUERY:
			default:
			break;
			}
		}
	})();
}
