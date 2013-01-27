"use strict";
var EXPORTED_SYMBOLS = [ "ssExIm" ];
/*
 * export / import
 */
function ssExIm() {

const {classes: Cc, interfaces: Ci, results: Cr, utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
var that = this;
var logger = this.logger;

function addDirToZip(path, dir, zip) {
	zip.addEntryDirectory(path, dir.lastModifiedTime, false);

	let entries = dir.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);
	let entry;
	while (entry = entries.nextFile) {
		if (entry.isDirectory()) {
			addDirToZip(path + entry.leafName + '/', entry, zip);
		} else {
			zip.addEntryFile(path + entry.leafName, Ci.nsIZipWriter.COMPRESSION_DEFAULT, entry, false);
		}
	}
	entries.close();
}

this.test = function() {

	/*
	try {
		let zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
		let zw = new zipWriter();
	
		let dst = FileUtils.getFile('Desk', ['test.zip']);
		zw.open(dst, FileUtils.MODE_RDWR | FileUtils.MODE_CREATE | FileUtils.MODE_TRUNCATE);
	
		let src = FileUtils.getDir("ProfD", ['superstart']);
		if (src.exists() && src.isDirectory()) {
			addDirToZip('/', src, zw);
		}
		zw.close();
	} catch (e) {
		logger.logStringMessage(e);
	}
	*/
}

}

