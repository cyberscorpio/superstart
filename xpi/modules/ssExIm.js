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

function getHostName() {
	var dnsSvc = Cc["@mozilla.org/network/dns-service;1"].getService(Ci.nsIDNSService);
	logger.logStringMessage('hostname: ' + dnsSvc.myHostName);
	return dnsSvc.myHostName;
}

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

function getItemFile(zipbase, zippath, dst) {
	zippath = zippath.replace(zipbase, '');
	let parts = zippath.split('/');
	let dir = dst.clone();
	for (let i = 0; i < parts.length; ++ i) {
		let part = parts[i];
		dir.append(part);
	}
	return dir;
}

function extract(zipbase, zip, dst, excludes) {
	let entries = zip.findEntries(zipbase + '*/');
	while (entries.hasMore()) {
		let zippath = entries.getNext();
		let dir = getItemFile(zipbase, zippath, dst);
		if (!dir.exists()) {
			dir.create(Ci.nsILocalFile.DIRECTORY_TYPE, FileUtils.PERMS_DIRECTORY);
		}
	}

	entries = zip.findEntries(null);
	while (entries.hasMore()) {
		let zippath = entries.getNext();
		if (excludes[zippath] === true) {
			continue;
		}
		let file = getItemFile(zipbase, zippath, dst);
		if (file.exists()) {
			continue;
		}
		zip.extract(zippath, file);
	}
}


function addDirToZip(path, dir, zip, excludes) {
	if (excludes === undefined) {
		excludes = {};
	}

	if (excludes[path] === undefined) {
		if (path != '') {
			zip.addEntryDirectory(path, dir.lastModifiedTime, false);
		}
	
		let entries = dir.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);
		let entry;
		while (entry = entries.nextFile) {
			if (entry.leafName.charAt(0) === '.') {
				continue; // skip .xxx
			}
			let p = path + entry.leafName;
			if (entry.isDirectory()) {
				p += '/';
				if (excludes[p] === undefined) {
					addDirToZip(p, entry, zip);
				}
			} else {
				if (excludes[p] === undefined) {
					zip.addEntryFile(p, Ci.nsIZipWriter.COMPRESSION_DEFAULT, entry, false);
				}
			}
		}
		entries.close();
	}
}

this.test = function() {
	let dst = FileUtils.getFile('Desk', ['test.zip']);
	if (dst.exists()) {
		this.import(dst.path, true);
	} else {
		this.export(dst.path);
	}
}

this.isDropboxInstalled = function() {
	let dir = getDropboxDir();
	return dir != null;
}

this.export = function(pathName) {
	let ret = false;
	try {
		let src = FileUtils.getDir("ProfD", ['superstart']);
		if (src.exists() && src.isDirectory()) {
			let dst = FileUtils.File(pathName);

			let zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
			let zip = new zipWriter();
			zip.open(dst, FileUtils.MODE_RDWR | FileUtils.MODE_CREATE | FileUtils.MODE_TRUNCATE);
	
			addDirToZip('superstart/', src, zip, {
					'superstart/user.style.v1.css': true,
					'superstart/user.style.css': true
				});
			zip.addEntryDirectory('.v1/', Date.now() * 1000, false);

			zip.close();
		} else {
			throw "can't find superstart directory, it shouldn't happen...";
		}
		ret = true;
	} catch (e) {
		logger.logStringMessage(e);
	}
	return ret;
}

this.import = function(pathName, importNotes) {
	let ret = false;
	try {
		let src = FileUtils.File(pathName);
		if (src.exists()) {
			let zip = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);
			zip.open(src);

			if (!zip.hasEntry('superstart/') || !zip.hasEntry('.v1/')) {
				zip.close();
				throw 'Format of ' + pathName + ' is incorrect...';
			}

			// TODO: 
			// 1. use the correct place
			// 2. handle 'importNotes'
			let dst = FileUtils.getDir("Desk", ['superstart.1']);
			if (!dst.exists()) {
				dst.create(Ci.nsILocalFile.DIRECTORY_TYPE, FileUtils.PERMS_DIRECTORY);
			}

			extract('superstart/', zip, dst, importNotes ? {} : {'/superstart/todo.json': true});

			zip.close();
			ret = true;
		}

	} catch (e) {
		logger.logStringMessage(e);
	}
	return ret;
}

}

