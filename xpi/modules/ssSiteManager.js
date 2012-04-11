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


	function emptySite() {
		return {
			url: null,
			title: null,
			name: null,
			snapshots: [null, null, null] // [top left, whole, customized]
		};
	}

	let file = FileUtils.getFile('ProfD', ['superstart', 'sites.json']);
	let column = 4, row = 2;
	let imgWidth = 212, imgHeight = 132;

	let imgLoading = 'images/loading.gif';
	let imgNoSnapshot = 'images/no-image.png';
	let favIcon = 'chrome://mozapps/skin/places/defaultFavicon.png';

	let inLoading = false;
	let sites = [];
	function load() {
		inLoading = true;
		sites = [];
		let i = 0, l = column * row;
		for (; i < l; ++ i) {
			sites.push(emptySite());
		}
		let retry = 0;
		do {
			if (!file.exists() || retry > 0) {
				if (!file.exists()) {
					file.create(Ci.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
				}
				save();
			}
			try {
				let tmp = that.jparse(that.fileGetContents(file));
				if (tmp.length == 0) {
					save();
				} else {
					sites = tmp;
					let dirty = false;
					for (i = 0, l = sites.length; i < l; ++ i) {
						let ss = sites[i].snapshots;
						if (ss[0] == imgLoading || ss[1] == imgLoading) {
							dirty = true;
							ss[0] = ss[1] = imgNoSnapshot;
						}
					}
					if (dirty) {
						save();
					}
					align();
				}
				break;
			} catch (e) {
				log(e);
				retry ++;
			}
		} while (retry < 2);
		inLoading = false;
		that.fireEvent('sites-loaded', null);
	}

	function align() {
		let count = sites.length;
		if (count < column * row) {
			count = column * row - count;
		} else {
			count = row - (count % column);
			count = count == row ? 0 : count;
		}
		if (count > 0) {
			let idxes = [], l = sites.length;
			for (let i = 0; i < count; ++ i) {
				sites.push(emptySite());
				idxes.push(l ++);
			}

			save();

			if (!inLoading) {
				that.fireEvent('sites-added', idxes);
			}
		}
		// TODO: check empty lines (row)
	}

	function save() {
		that.filePutContents(file, that.stringify(sites));
	}

	function get(idx1, idx2) {
		if (idx1 >= 0 && idx1 < sites.length) {
			let s = sites[idx1];
			if (idx2 === undefined) {
				return s;
			} else {
				if (Array.isArray(s) && idx2 >= 0 && idx2 < s.length) {
					return s[idx2];
				}
			}
		}

		return null;
	}

	function decorateSite(s) {
	}

	// TODO: listen column / row changes

	// methods
	this.getSites = function() {
		let rs = this.jparse(this.stringify(sites));
		for (let i = 0, l = rs.length; i < l; ++ i) {
			decorateSite(rs[i]);
		}
		return rs;
	}

	this.getSite = function(idx) {
		let s = get(idx);
		if (s == null) {
			s = emptySite();
		}
		s = this.jparse(this.stringify(s));
		decorateSite(s);
		return s;
	}


	this.addSite = function(url, name, custImg) {
		let i = 0, l = sites.length;
		for (; i < l; ++ i) {
			if (sites[i].url == null) {
				break;
			}
		}
		if (i == l) {
			let idxes = [];
			sites.push(emptySite());
			idxes.push(l ++);

			let count = sites.length;
			if (count % column > 0) {
				count = column - (count % column);
				for (let j = 0; j < count; ++ j) {
					sites.push(emptySite());
					idxes.push(l ++);
				}
			}
			save();
			this.fireEvent('sites-added', idxes);
		}

		this.changeSite(i, url, name, custImg);
	}

	this.changeSite = function(idx, url, name, custImg) {
		let s = get(idx);
		if (s == null) {
			return;
		}

		url = this.regulateUrl(url);
		if (url == s.url) {
			if (name != s.name || custImg != s.snapshots[2]) {
				s.name = name;
				s.snapshots[2] = custImg == '' ? null : custImg;
				save();
				this.fireEvent('sites-updated', [idx]);
			}
		} else {
			this.removeSite(idx); // TODO: 1. if this site is the last one of a row, maybe cause problem...
						// 2. idx should be idx1 & idx2
			if (url == null) {
				return;
			}

			s = get(idx);
			s.url = s.title = url;
			s.name = name;
			s.icon = favIcon;
			s.snapshots = [null, null, custImg != '' ? custImg : null];

			this.refreshSite(idx);
		}
	}

	this.exchangeSite = function(idx1, idx2) {
	}

	this.removeSite = function(idx) {
	}

	this.refreshSite = function(idx) {
		let i = 0, l = sites.length;
		if (idx == -1) {
			for (; i < l; ++ i) {
				this.refreshSite(i);
			}
			return;
		}

		let s = get(idx);
		if (s == null || Array.isArray(s)) {
			if (s != null) {
				for (i = 0, l = s.length; i < l; ++ i) {
					this.refreshSite(idx, i);
				}
			}
			return;
		}

		if (s.snapshots[0] != null || s.snapshots[1] != null) {
			s.snapshots = [imgLoading, imgLoading, s.snapshots[2]];
			save();
			this.fireEvent('sites-updated', [idx]);
		}

		fetchSite(idx);
	}

	// helper for methods
	function doRefresh() {
	}

	////////////////////
	// begin
	load();


	// snapshots
	let sites2bFetched = [];
	let fetchingCount = 0;
	let fetchingMax = 5;
	let snapshotBrowsers = {};
	function fetchSite(idx) {
		let url = sites[idx].url; // TODO
		for (let i = 0, l = sites2bFetched.length; i < l; ++ i) {
			if (url == sites2bFetched[i]) {
				return;
			}
		}

		sites2bFetched.push(url);

		doFetchSite();
	}

	function doFetchSite() {
		if (fetchingCount >= fetchingMax || sites2bFetched.length == 0) {
			return;
		}

		++ fetchingCount;
		let url = sites2bFetched.shift();
		if (snapshotBrowsers[url]) { // if it is fetching...
			-- fetchingCount;
			return;
		}

		function getImageFileNameFromUrl(url) {
			return SHA1(url + Math.random()) + '.png';
			// return SHA1(url) + '.png';
		}

		// get the window
		let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
		let gWindow = wm.getMostRecentWindow("navigator:browser");

		let width = imgWidth, height = imgHeight;
		let fw = 1024, fh = Math.floor(fw * height / width);

		let gDoc = gWindow.document;
		let container = gDoc.getElementById('superstart-snapshot-container');
		let browser = gDoc.createElement('browser');
		snapshotBrowsers[url] = browser; // save it
		// set the browser attributes
		browser.width = fw;
		browser.height = fh;
		browser.setAttribute('type', 'content');
		browser.setAttribute('src', url);

		container.appendChild(browser);

		let now = (new Date()).getTime();
		let timeout = 30 * 1000;
		let timeoutId = gWindow.setTimeout(onTimeout, timeout);
		browser.addEventListener('load', onLoad, true);

		function onLoad() {
			gWindow.clearTimeout(timeoutId);

			timeout = ((new Date()).getTime() - now) * 3;
			if (timeout < 1000) {
				timeout = 1000; // wait at least 1s
			} else if (timeout > 30 * 1000) {
				timeout = 30 * 1000; // but not exceed 30s
			}

			timeoutId = gWindow.setTimeout(onTimeout, timeout);
		}

		function onTimeout() {
			browser.removeEventListener('load', onLoad, true);

			let doc = browser.contentDocument;
			let title = doc.title || url;
			let icon = getIcon(doc);
			doc = null;

			let snapshot = getImageFileNameFromUrl(url);
			let pathName = getImagePathFromFileName(snapshot);
			let canvas = window2canvas(gDoc, browser, width, height);
			saveCanvas(canvas, pathName, function() {
				let sites = that.sites;
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
			});
		}

		function afterFetched() {
			container.removeChild(browser);
			delete snapshotBrowsers[url];
			browser = null;

			if (fetchingCount > 0) {
				-- fetchingCount;
			} else {
				log('*** fetchingCount incorrect! ***');
			}
			
			if (sites2bFetched.length > 0) {
				doFetchSite();
			}
		}
	}

	function window2canvas(doc, win, width, height) {
		try {
			doc = win.contentDocument;
			let html = doc.getElementsByTagName('html');
			if (html.length > 0) {
				html = html[0];
				var ww = html.clientWidth;
				if (ww > win.clientWidth) {
					ww = win.clientWidth;
				}
			} else {
				var ww = win.clientWidth;
			}
			var wh = win.clientHeight;
		} catch (e) {
			var ww = win.clientWidth, wh = win.clientHeight;
		}
		let ow = ww, oh = wh;

		let contentWindow = win.contentWindow;
		let canvas = doc.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");

		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
		canvas.width = width;
		canvas.height = height;

		let ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, width, height);
		ctx.save();
		ctx.mozImageSmoothingEnabled = true;
		ctx.scale(width / ww, height / wh);
		let x = 0, y = 0;
		if (ow > ww) {
			x = (ow - ww) / 2;
		}
		if (oh > wh) {
			y = (oh - wh) / 2;
		}
		ctx.drawWindow(contentWindow, x, y, ww, wh, "rgb(255, 255, 255)");
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

}





