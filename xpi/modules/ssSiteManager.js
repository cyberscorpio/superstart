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
	function load() {
		that.sites = [];
		for (let i = 0, j = column * row; i < j; ++ i) {
			that.sites.push(emptySite());
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
				let sites = that.jparse(that.fileGetContent(file));
				if (sites.length == 0) {
					save();
				} else {
					that.sites = sites;
				}
				align();
				break;
			} catch (e) {
				retry ++;
			}
		} while (retry < 2);
		that.fireEvent('sites-loaded', null);
	}

	function align() {
		let count = that.sites.length;
		if (count < column * row) {
			count = column * row;
		} else {
			count = row - (count % column);
			if (count == row) {
				count = 0;
			}
		}
		for (let i = 0; i < count; ++ i) {
			that.sites.push(emptySite());
		}
	}
}

