/**
 * events:
 * 	'sites-loaded', 'site-added'
 */
var EXPORTED_SYMBOLS = [ "ssSiteManager" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

function ssSiteManager() {
	let that = this;
	let logger = this.logger;

	// utilities
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
			snapshots: null
		};
	}

	let file = FileUtils.getFile('ProfD', ['superstart', 'sites.json']);
	let column = 4, row = 2;
	let sites = [];
	let inLoading = false;
	function load() {
		logger.logStringMessage('111111111111111');
		inLoading = true;
		sites = [];
		for (let i = 0, j = column * row; i < j; ++ i) {
			sites.push(emptySite());
		}
		let retry = 0;
		do {
			logger.logStringMessage('222222222222');
			if (!file.exists() || retry > 0) {
				if (!file.exists()) {
					file.create(Ci.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
				}
				save();
			}
			try {
				logger.logStringMessage('33333333333322');
				let tmp = that.jparse(that.fileGetContents(file));
				if (tmp.length == 0) {
					save();
				} else {
					sites = tmp;
					align();
				}
				logger.logStringMessage('------------------');
				logger.logStringMessage(that.stringify(tmp));
				break;
			} catch (e) {
				logger.logStringMessage(e);
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
		for (let i = 0; i < count; ++ i) {
			sites.push(emptySite());
			if (!inLoading) {
				that.fireEvent('site-added', i);
			}
		}
		// TODO: check empty lines (row)
	}

	function save() {
		that.filePutContents(file, that.stringify(sites));
	}

	function decorateSite(s) {
	}


	// methods
	this.getSites = function() {
		let rs = this.jparse(this.stringify(sites));
		for (let i = 0, l = rs.length; i < l; ++ i) {
			decorateSite(rs[i]);
		}
		return rs;
	}

	this.getSite = function(idx) {
		let s = emptySite();
		if (idx >= 0 && idx < sites.length) {
			s = sites[idx];
		}
		s = this.jparse(this.stringify(s));
		decorateSite(s);
		return s;
	}

	// begin
	load();
}

