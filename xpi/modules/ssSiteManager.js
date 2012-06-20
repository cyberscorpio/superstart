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
	let imgWidth = 212, imgHeight = 132;

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
	}


	// snapshots
	let takeSnapshot = (function() {
		let max = 3;
		let q = [];
		let taking = [];

		function exists(url) {
			for (let i = 0, l = q.length; i < l; ++ i) {
				if (q[i] == url) {
					return true;
				}
			}
			for (let i = 0, l = taking.length; i < l; ++ i) {
				if (taking[i] == url) {
					return true;
				}
			}
			return false;
		}

		function takeSnapshot(url) {
			if (exists(url)) {
				return;
			}
			q.push(url);
		}

		return takeSnapshot;
	})();

	////////////////////
	// begin
	load();
}





