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

	////////////////////
	// load / save
	// type: nsIFile
	let file = FileUtils.getFile('ProfD', ['superstart', 'sites.json']);
	let col = 4, row = 2;
	let imgWidth = 212, imgHeight = 132;

	let imgLoading = 'images/loading.gif';
	let imgNoSnapshot = 'images/no-image.png';
	let favIcon = 'chrome://mozapps/skin/places/defaultFavicon.png';

	let inLoading = false;
	let sites = [];

	function create() {
		sites = [];
		let cnt = col * row;
		for (let i = 0; i < cnt; ++ i) {
			sites.push(emptySite());
		}
		that.filePutContents(that.stringify(sites));
		that.fireEvent('sites-loaded', null);
	}

	function align() {
		let cnt = col * row;
		if (site.length < cnt) {
//		} else if () {
		}
	}

	function load() {
		inLoading = true;
		if (!file.exists()) {
			create();
		} else {
			try {
				sites = that.jparse(that.fileGetContents(file))
				align();
			} catch (e) {
				create();
			}
		}
		inLoading = false;
	}

	function save() {
	}

	////////////////////
	// methods
	this.getSites = function() {
	}

	////////////////////
	// begin
	load();
}





