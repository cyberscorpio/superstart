/**
 * events:
 * 	sites-loaded
 *	sites-added
 *	sites-updated
 */
var EXPORTED_SYMBOLS = [ "ssSiteManager" ];

function ssSiteManager() {

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

	let that = this;

	// utilities
	function log(s) {
		that.logger.logStringMessage(s);
	}

	function SHA1 (msg) {
		function tohex(s) {
			let hc = '0123456789ABCDEF';
			let he = new Array(s.length * 2);
			for (let i = 0, j = s.length; i < j; ++ i) {
				let c = s.charCodeAt(i);
				he[i * 2] = hc.charAt((c >> 4) & 15);
				he[i * 2 + 1] = hc.charAt(c & 15);
			}
			return he.join('');
		}

		let h = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);
		h.init(Ci.nsICryptoHash.SHA1);
		let s = Cc['@mozilla.org/io/string-input-stream;1'].createInstance(Ci.nsIStringInputStream);
		s.setData(msg, msg.length);
		h.updateFromStream(s, s.available());
		let m = h.finish(false);
		s = h = null;

		return tohex(m);
	}

	////////////////////
	// load / save
	let /* nsIFile */ file = FileUtils.getFile('ProfD', ['superstart', 'sites.json']);
	let imgWidth = 212, imgHeight = 132, ratio = 0.625;

	let imgLoading = 'images/loading.gif';
	let imgNoSnapshot = 'images/no-image.png';
	let favIcon = 'chrome://mozapps/skin/places/defaultFavicon.png';

	let inLoading = false;
	let data = null; // see doc/data.txt for details

	// fn is a function and should return **true** if it changes the site
	function travel(fn) {
		let changed = false;
		for (let i = 0, l = data.sites.length; i < l; ++ i) {
			let s = data.sites[i];
			if (s.sites && isArray(s.sites)) {
				let j = 0, k = s.sites.length;
				if (k == 0) {
					log('siteManager::travel get error data at index ' + i);
				}
				for (; j < k; ++ j) {
					if (fn(s.sites[j])) {
						changed = true;
					}
				}
			} else {
				if (fn(s)) {
					changed = true;
				}
			}
		}
		return changed;
	}

	function create() {
		data = {
			'version' : "1.0",
			'sites' : []
		};
		save();
		that.fireEvent('sites-loaded', null);
	}

	function check() {
		let changed = false;
		let sites = data.sites;
		try {
			// check for empty 
			for (let i = 0; i < sites.length; ++ i) {
				let s = sites[i];
				// folder
				if (s.sites) {
					if (!isArray(s.sites) || s.sites.length == 0) {
						delete s.sites;
						-- i; // check it as an URL in the next round
						changed = true;
					} else {
						for (let j = 0; j < s.sites.length; ++ j) {
							if (s.sites[j].url == null) {
								s.sites.splice(j, 1);
								changed = true;
							}
						}

						if (s.sites.length == 1) {
							sites[i] = s.sites[j];
							changed = true;
						} else if (s.sites.length == 0) {
							sites.splice(i, 1);
							-- i;
							changed = true;
						}
					}
				} else {
					if (s.url == null) {
						sites.splice(i, 1);
						-- i;
						changed = true;
					}
				}
			}
		} catch (e) {
			log('siteManager::check() ' + e);
			create();
			return true;
		}

		// check snapshots
		if (travel(function(s) {
			if (s.snapshots[0] == imgLoading || s.snapshots[1] == imgLoading) {
				s.snapshots[0] = s.snapshots[1] = imgNoSnapshot;
				return true;
			} else {
				return false;
			}
		})) {
			changed = true;
		}
		return changed;
	}

	function load() {
		inLoading = true;
		if (!file.exists()) {
			create();
		} else {
			try {
				let changed = false;
				data = that.jparse(that.fileGetContents(file));
				if (check()) {
					save();
				}
			} catch (e) {
				log('siteManager::load() ' + e);
				create();
			}
		}
		inLoading = false;
	}

	function save() {
		that.filePutContents(file, that.stringify(data));
	}

	function adjustSite(s) {
		return s;
	}

	let cache = null;
	function createCache() {
		cache = that.jparse(that.stringify(data.sites));
		for (let i = 0, l = cache.length; i < l; ++ i) {
			adjustSite(cache[i]);
		}
	}

	////////////////////
	// methods
	this.getSites = function() {
		if (cache === null) {
			createCache();
		}
		return cache;
	}

	this.getSite = function(idx) {
		if (idx < 0 || idx >= data.sites.length) {
			return null;
		} else {
			if (cache === null) {
				createCache();
			}
			return cache[idx];
		}
	}

	this.addSite = function(url, name, image) {
		/*
		cache = null;
		let s = {
			'url': url,
			'title': url,
			'name': name,
			'snapshots': [imgLoading, imgLoading, image]
		};
		data.sites.push(s);
		save();
		this.fireEvent('site-added', data.sites.length - 1);
		*/
		takeSnapshot();
	}


	// snapshots
	let takeSnapshot = (function() {
		let max = 3;
		let q = [];
		let taking = [];
		let browsers = {};

		function exists(url) {
			if (q.indexOf(url) != -1 || taking.indexOf(url) != -1) {
				return true;
			}
			return false;
		}

		function beginTaking() {
		/*
			if (taking.length >= max || q.length == 0) {
				return;
			}
			let url = q.shift();
			taking.push(url);
			*/
			let url = 'http://www.yahoo.com';


			let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
			let gw = wm.getMostRecentWindow("navigator:browser");

			let width = imgWidth, height = imgHeight;
			let fw = 1024, fh = Math.floor(fw * ratio);

			let gDoc = gw.document;
			let container = gDoc.getElementById('superstart-snapshot-container');
			let browser = gDoc.createElement('browser');
			browsers[url] = browser; // save it
			// set the browser attributes
			browser.width = fw;
			browser.height = fh;
			browser.setAttribute('type', 'content');
			browser.setAttribute('src', url);

			container.appendChild(browser);

			let now = (new Date()).getTime();
			let timeout = 30 * 1000;
			let timeoutId = gw.setTimeout(onTimeout, timeout);
			browser.addEventListener('load', onLoad, true);

			function onLoad() {
				gw.clearTimeout(timeoutId);
				timeout = ((new Date().getTime() - now) * 3); // wait more time for multimedia content to be loaded
				if (timeout < 1000) {
					timeout = 1000;
				} else if (timeout > 15 * 1000) {
					timeout = 15 * 1000;
				}
				timeoutId = gw.setTimeout(onTimeout, timeout);
			}

			function onTimeout() {
				let doc = browser.contentDocument;
				let title = doc.title || url;
				let icon = getIcon(doc);
				doc = null;

				let snapshot = '1.png';//getImageFileNameFromUrl(url);
				let pathName = '~/Desktop/1.png';//getImagePathFromFileName(snapshot);
				let canvas = window2canvas(gDoc, browser, width, height);
				saveCanvas(canvas, pathName, function() {
					/*
					let sites = data.sites;
					let isSnapshotUsed = false;
					for (let i = 0, l = sites.length; i < l; ++ i) {
						if (sites[i].url == url) {
							setSiteInformation(i, title, icon, snapshot, sites[i].image);
							isSnapshotUsed = true;
						}
					}

					if (!isSnapshotUsed) {
						removeSnapshotFile(snapshot);
					}

					afterFetched();
					*/
					delete browsers[url];
					browser.parentNode.removeChild(browser);
					browser = null;
				});
			}
		}

		function getIcon(doc) {
			try {
				let loc = doc.location;
				if (loc.href.indexOf('http') == 0) {
					let links = doc.getElementsByTagName('link');
					// 1. look for rel="shortcut icon"
					for (let i = 0, l = links.length; i < l; ++ i) {
						let link = links[i];
						let rel = link.rel || '';
						if (rel.search(/icon/i) != -1 && rel.search(/shortcut/i) != -1) {
							return link.href;
						}
					}

					// 2. icon only
					for (let i = 0, l = links.length; i < l; ++ i) {
						let link = links[i];
						let rel = link.rel || '';
						if (rel.search(/icon/i) != -1) {
							return link.href;
						}
					}

					// 3. fallback
					if (loc.protocol == 'http:' || loc.protocol == 'https:') {
						return loc.protocol + '//' + loc.host + '/favicon.ico';
					}
				}
			} catch (e) {
				logger.logStringMessage(e);
			}
			return favIcon;
		}


		function window2canvas(gDoc, win) {
			let w = win.clientWidth;
			let h = win.clientHeight;
			try {
				let b = win.contentDocument.body;
				w = b.clientWidth / 2;
				h = w * ratio;
			} catch (e) {
			}
	
			let contentWindow = win.contentWindow;
			let canvas = gDoc.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");
	
			canvas.style.width = w + 'px';
			canvas.style.height = h + 'px';
			canvas.width = w;
			canvas.height = h;
	
			let ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, w, h);
			ctx.save();
			ctx.mozImageSmoothingEnabled = true;
			ctx.scale(1, 1);
			ctx.drawWindow(contentWindow, 0, 0, w, h, "rgba(0,0,0,0)");
			ctx.restore();
			return canvas;
		}
	
		function saveCanvas(canvas, pathName, callback) {
			let file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
			file.initWithPath(pathName);
			let io = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
			let src = io.newURI(canvas.toDataURL('image/png', ''), 'UTF8', null);
			let persist = Cc['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Ci.nsIWebBrowserPersist);
			persist.persistFlags = Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
			persist.persistFlags |= Ci.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
	
			let listener = {
				onStateChange: function(webProgress, req, flags, aStatus) {
					if (flags & Ci.nsIWebProgressListener.STATE_STOP) {
						persist.progressListener = null;
						persist = null;
						if (callback) {
							callback();
							callback = null;
						}
					}
				}
			}
			persist.progressListener = listener;
			persist.saveURI(src, null, null, null, null, file);
		}

		function takeSnapshot(url) {
			if (exists(url)) {
				return;
			}
			q.push(url);
			beginTaking();
		}

		return takeSnapshot;
	})();

	////////////////////
	// begin
	load();
}





