
if ("undefined" == typeof(SuperStart)) {
	function $(id) {
		return document.getElementById(id);
	}

	var SuperStart = {};

	(function() {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		var sbprefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
		var logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
		var strings = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService).createBundle("chrome://superstart/locale/main.properties");
		var ss = Cc['@mozilla.org/browser/sessionstore;1'].getService(Ci.nsISessionStore);
		var hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
		var bs = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
		var cfg = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIConfig);
		var sm = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssISiteManager);

		var savedOpenTab = function() {}
		var indexUrl = cfg.getConfig('index-url');
		if (window.gInitialPages) {
			try {
				window.gInitialPages.push(indexUrl);
				window.gInitialPages.push(indexUrl + '#');
			} catch (e) {}
		}

		window.addEventListener('load', function() {
			window.removeEventListener('load', arguments.callee, false);

			// context menu
			var menu = $('contentAreaContextMenu');
			menu.addEventListener('popupshowing', function() {
				var item = $('context-superstart-add');
				item.hidden = true;

				var doc = gBrowser.selectedBrowser.contentDocument;
				var url = doc.location.href.toLowerCase();
				// works for http(s), file:/// and about:
				if (url.indexOf('http://') == 0 || url.indexOf('https://') == 0 || url.indexOf('file:///') == 0 || url.indexOf('about:') == 0) {
					item.hidden = false;
				}
			}, false);

			if (window.TMP_BrowserOpenTab) {
				savedOpenTab = window.TMP_BrowserOpenTab;
				window.TMP_BrowserOpenTab = openTab;
			} else {
				savedOpenTab = window.BrowserOpenTab;
				window.BrowserOpenTab = openTab;
			}

			// for case where openTab() won't work
			// for example: when set browser.tabs.closeWindowWithLastTab to false...
			if (gBrowser._beginRemoveTab) {
				eval("gBrowser._beginRemoveTab = " + gBrowser._beginRemoveTab.toString().replace(/this\.addTab\((("about:blank")|(BROWSER_NEW_TAB_URL))(.*)?\);/, 'this.addTab((SuperStart.loadInBlank() ? SuperStart.getIndexUrl() : $1)$4);'));
			}

			// check version first
			checkFirstRun();
		}, false);

		////////////////////////////////////////////////
		// methods
	
		SuperStart.onContextMenuAdd = function() {
			var doc = gBrowser.selectedBrowser.contentDocument;
			var url = doc.location.href;
	
			sm.addSite(url, '', '');
		}

		SuperStart.onMenuAdd = function() {
			var dlg = window.openDialog('chrome://superstart/content/url.xul',
					'',
					'chrome,dialog,dependent=yes,centerscreen=yes,resizable=yes', -1);
		}

		SuperStart.onMenuRefreshAll = function() {
			sm.refreshSite(-1);
		}

		SuperStart.onMenuOptions = function() {
			var dlg = window.openDialog('chrome://superstart/content/options.xul',
					'',
					'chrome,dialog,modal=yes,dependent=yes,centerscreen=yes,resizable=yes');
		}

		SuperStart.onToolbarOpen = function() {
			try {
				if (gBrowser.contentDocument.location.href != indexUrl) {
					gBrowser.contentDocument.location.href = indexUrl;
				} else {
					gBrowser.contentDocument.location.reload();
				}
			} catch (e) {}
		}

		// note: this method is mainly copied from: PHM_populateUndoSubmenu() in Browser-places.js
		SuperStart.populateUndoMenu = function() {
			var menu = $('superstart-recently-closed-list');
			while (menu.hasChildNodes()) {
				menu.removeChild(menu.firstChild);
			}

			if (ss.getClosedTabCount(window) == 0) {
				var m = document.createElement("menuitem");
				m.setAttribute("label", this.getString('ssEmpty'));
				menu.appendChild(m);
				return;
			}

			var undoItems = JSON.parse(ss.getClosedTabData(window));
			for (var i = 0, l = undoItems.length; i < l; ++ i) {
				var m = document.createElement("menuitem");
				m.setAttribute("label", undoItems[i].title);
				if (undoItems[i].image) {
					let iconURL = undoItems[i].image;
					if (/^https?:/.test(iconURL)) {
						iconURL = "moz-anno:favicon:" + iconURL;
					}
					m.setAttribute("image", iconURL);
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
				if (i == 0) {
					m.setAttribute("key", "key_undoCloseTab");
				}
				menu.appendChild(m);
			}

			// "Restore All Tabs"
			var strings = gNavigatorBundle;
			menu.appendChild(document.createElement("menuseparator"));
			m = menu.appendChild(document.createElement("menuitem"));
			m.id = "superstart_restoreAllTabs";
			m.setAttribute("label", strings.getString("menuRestoreAllTabs.label"));
			m.addEventListener("command", function() {
				for (var i = 0, l = undoItems.length; i < l; ++ i) {
					undoCloseTab();
				}
			}, false);
		}

		SuperStart.populateBookmarks = function(event) {
			if (event.target != event.currentTarget) {
				return;
			}
			var menu = $('superstart-bookmarks');
			while (menu.hasChildNodes()) {
				menu.removeChild(menu.firstChild);
			}

			var options = hs.getNewQueryOptions();
			var query = hs.getNewQuery();
			var folder = bs.bookmarksMenuFolder;
			query.setFolders([folder], 1);

			var result = hs.executeQuery(query, options);
			var rootNode = result.root;
			rootNode.containerOpen = true;
			try {
				var l = rootNode.childCount;
				if (l == 0) {
					var m = document.createElement("menuitem");
					m.setAttribute("label", this.getString('ssEmpty'));
					menu.appendChild(m);
				} else {
					for (var i = 0; i < l; ++ i) {
						var node = rootNode.getChild(i);
						insertBookmarkNode(menu, node);
					}
				}
			} finally {
				rootNode.containerOpen = false;
			}
		}

		SuperStart.getString = function(name) {
			try {
				var str = strings.GetStringFromName(name);
			} catch (e) {
				str = name;
				var txt = e.message + " (" + name + " is missing)";
				logger.logStringMessage(txt);
			}
			return str;
		}

		SuperStart.loadInBlank = function() {
			return cfg.getConfig('load-in-blanktab');
		}
		SuperStart.getIndexUrl = function() {
			return indexUrl;
		}

		////////////////////////////////////////////////
		// private functions

		function openTab() {
			if (SuperStart.loadInBlank()) {
				if (!gBrowser) {
					window.openDialog("chrome://browser/content/", "_blank", "chrome,all,dialog=no", indexUrl);
				} else {
					gBrowser.loadOneTab(indexUrl, {inBackground: false});
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
			var blankTabToRemove = gBrowser.selectedTab;
			var tab = null;
			var ss = Cc["@mozilla.org/browser/sessionstore;1"].getService(Ci.nsISessionStore);
			if (ss.getClosedTabCount(window) > (idx || 0)) {
				TabView.prepareUndoCloseTab(blankTabToRemove);
				tab = ss.undoCloseTab(window, idx || 0);
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
				Components.utils.import("resource://gre/modules/AddonManager.jsm");
				AddonManager.getAddonByID(id, function(addon) {
					if (addon.name == name) {
						addver = addon.version;
					}
				});
			} catch (e) {
				var em = Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);
				var addon = em.getItemForID(id);
				if (addon.name == name) {
					addver = addon.version;
				}
			}
			if (addver != ver && window.navigator.onLine) {
				sbprefs.setCharPref(vk, addver);
				gBrowser.addEventListener('load', showHomepage, true);
			}
		}

		function showHomepage() {
			let homepg = 'http://www.enjoyfreeware.org/superstart/?v=' + cfg.getConfig('version');
			gBrowser.removeEventListener('load', showHomepage, true);
			gBrowser.selectedTab = gBrowser.addTab(homepg);
		}

		// helper function(s)
		// copied from PHM__undoCloseMiddleClick() in Browser-places.js
		function undoCloseMiddleClick(aEvent) {
			if (aEvent.button != 1) {
				return;
			}

			undoCloseTab(aEvent.originalTarget.value);
			gBrowser.moveTabToEnd();
			var menu = $('superstart-recently-closed-list');
			menu.hidePopup();
		}

		function insertBookmarkNode(menu, node) {
			switch (node.type) {
			case node.RESULT_TYPE_URI:
				var m = document.createElement('menuitem');
				m.setAttribute("label", node.title);
				if (node.icon) {
					let iconURL = node.icon;
					if (/^https?:/.test(iconURL)) {
						iconURL = "moz-anno:favicon:" + iconURL;
					}
					m.setAttribute("image", iconURL);
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
				var popup = document.createElement('menupopup');
				m.appendChild(popup);
				node.QueryInterface(Ci.nsINavHistoryQueryResultNode)
				node.containerOpen = true;
				try {
					for (var i = 0, l = node.childCount; i < l; ++ i) {
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
