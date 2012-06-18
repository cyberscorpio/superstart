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

	function create() {
		data = {
			'version' : "1.0",
			'sites' : []
		};
		save();
		that.fireEvent('sites-loaded', null);
	}

	function load() {
		inLoading = true;
		if (!file.exists()) {
			create();
		} else {
			try {
				let changed = false;
				data = that.jparse(that.fileGetContents(file));
				let sites = data.sites;
				for (let i = 0; i < sites.length; ++ i) {
					// check sites
					let s = sites[i];
					if (s.sites != undefined) {
						if (!Array.isArray(s.sites)) {
							sites.splice(i, 1);
							-- i;
							changed = true;
						} else {
							if (s.sites.length > 1) {
								for (let j = 0; j < s.sites.length; ++ j) {
									let ss = s.sites[j];
									if (ss.url == null) {
										s.sites.splice(j, 1);
										-- j;
										changed = true;
									} else if (ss.snapshots[0] == imgLoading || ss.snapshots[1] == imgLoading) {
										ss.snapshots[0] = ss.snapshots[1] = imgNoSnapshot;
										changed = true;
									}
								}
							}

							if (s.sites.length == 1) {
								sites[i] = s.sites[0];
								changed = true;
							} else if (s.sites.length == 0) {
								sites.splice(i, 1);
								-- i;
								changed = true;
							}
						}
					} else if (sites[i].url == null) {
						sites.splice(i, 1);
						-- i;
						changed = true;
					} else if (sites[i].snapshots[0] == imgLoading || sites[i].snapshots[1] == imgLoading) {
						sites[i].snapshots[0] = sites[i].snapshots[1] = imgNoSnapshot;
						changed = true;
					}
				}
				if (changed) {
					save();
				}
			} catch (e) {
				log('sitemanageer::load() ' + e);
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

	////////////////////
	// begin
	load();
}





