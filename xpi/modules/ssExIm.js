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
let that = this;
let logger = this.logger;

let getDropboxDir = (function() {
	let dir = undefined;
	return function() {
		if (dir === undefined) {
			dir = FileUtils.getDir('Home', ['My Documents', 'Dropbox']);
			if (!dir.exists()) {
				dir = FileUtils.getDir('Home', ['Dropbox']);
				if (!dir.exists()) {
					dir = null;
				}
			}
		}
		return dir;
	}
}());


function addDirToZip(path, dir, zip) {
	if (path != '') {
		zip.addEntryDirectory(path, dir.lastModifiedTime, false);
	}

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
			addDirToZip('', src, zw);
		}
		zw.close();
	} catch (e) {
		logger.logStringMessage(e);
	}
	*/

	// test.. get host name
	var dnsSvc = Cc["@mozilla.org/network/dns-service;1"].getService(Ci.nsIDNSService);
	logger.logStringMessage('hostname: ' + dnsSvc.myHostName);
}

this.isDropboxInstalled = function() {
	let dir = getDropboxDir();
	return dir != null;
}

}

