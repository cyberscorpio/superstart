/**
 * superstart object
 */
"use strict";
var SuperStartClass = (function () {
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
	
	// import components
	let m = [
		{
			'p': 'resource://gre/modules/',
			'j': ['XPCOMUtils.jsm', 'NetUtil.jsm', 'FileUtils.jsm']
		},
		{
			'p': 'resource://superstart/',
			'j': ['xl.js', 'ssConfig.js', 'ssSiteManager.js', 'ssTodoList.js', 'ssThemes.js', 'ssExIm.js']
		}
	];
	m.forEach(function(n) {
		n.j.forEach(function(o) {
			Cu.import(n.p + o);;
		});
	});
	m = undefined;
	
	/**
	 * The object for all interfaces in superstart
	 */
	function SuperStartClass() {
		xl.Observerable.call(this);
		ssConfig.call(this);
		ssSiteManager.call(this);
		ssTodoList.call(this);
		ssThemes.call(this);
		ssExIm.call(this);
	}
	
	SuperStartClass.prototype = {
		classID: Components.ID("{61af2fde-0514-46b6-ae57-149dd057d75f}"),
		/**
		 * List all the interfaces your component supports.
		 * @note nsISupports is generated automatically; you don't need to list it.
		 */
		QueryInterface: XPCOMUtils.generateQI([
			Ci.ssIObserverable,
			Ci.ssIConfig,
			Ci.ssISiteManager,
			Ci.ssITodoList,
			Ci.ssIThemes,
			Ci.ssIExIm
		]),
	
		logger : Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService),

		/////////////////////////////////////////
		// utilies

		jparse : function(text) {
			return JSON.parse(text);
		},
		stringify : function(obj) {
			return JSON.stringify(obj);
		},
		regulateUrl : function(url) {
			if (url != null && typeof(url) == 'string' && url.charAt(4) != ':' && url.charAt(5) != ':') { // exclude 'file: & http: & https: & about:'
				if (url.charAt(0) == '/') { // unix
					url = 'file://' + url;
				} else if (url.charAt(1) == ':' && (url.charAt(2) == '/' || url.charAt(2) == '\\')) { // windows
					url = 'file:///' + url;
				} else if (url.indexOf('://') == -1 && url.indexOf('about:') != 0) {
					url = 'http://' + url;
				}
			}
			return url;
		},
		getUrlFromFile : function(iF) {
			var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
			return ios.newFileURI(iF); 
		},
	
		// below file I/O is copied from:
		// - https://developer.mozilla.org/en/docs/Code_snippets/File_I_O
		fileGetContents: function(iF) {
			var data = '';
			try {
				let is = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
				let cs = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
				is.init(iF, -1, 0, 0);
				cs.init(is, "UTF-8", 0, 0);
				
				{
					let s = {};
					let read = 0;
					do { 
						read = cs.readString(0xffffffff, s);
						data += s.value;
					} while (read != 0);
				}
				cs.close();
			} catch (e) {
			}
			
			return data;
		},
	
		filePutContents: function(iF, data) {
			let os = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
			let cs = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
			
			os.init(iF, 0x02 | 0x08 | 0x20, FileUtils.PERMS_FILE, 0); 
			cs.init(os, "UTF-8", 0, 0);
			cs.writeString(data);
			cs.close();
		},
	};
	
	return SuperStartClass;
})();

var NSGetFactory = XPCOMUtils.generateNSGetFactory ? XPCOMUtils.generateNSGetFactory([SuperStartClass]) : XPCOMUtils.generateNSGetModule([SuperStartClass]);
