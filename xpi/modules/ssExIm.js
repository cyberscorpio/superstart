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
let defExt = 'ssbackup';

function getHostName() {
	var dnsSvc = Cc["@mozilla.org/network/dns-service;1"].getService(Ci.nsIDNSService);
	logger.logStringMessage('hostname: ' + dnsSvc.myHostName);
	return dnsSvc.myHostName;
}

function filter(s) {
	return s.replace(/["/\\*?< >|:]/g, '');
}

function getCloudFileName() { // 'hostname_yyyy-mm-dd'
	function pad(n) { return n < 10 ? '0' + n : n; }
	let d = new Date();
	return filter(getHostName()) + '_' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '.' + defExt;
}

let getDropboxDir = (function() {
	return function() {
		let dir = null;
		let cloudPath = that.getConfig('cloud-dir');
		if (cloudPath !== '') {
			try {
				dir = FileUtils.File(cloudPath);
				if (!dir.exists() || !dir.isDirectory()) {
					return null;
				}
			} catch (e) {
				return null;
			}
		} else {
			dir = FileUtils.getDir('Home', ['My Documents', 'Dropbox']); // xp
			if (!dir.exists() || !dir.isDirectory()) {
				dir = FileUtils.getDir('Home', ['Dropbox']); // vista / 7 / osx (linux is not tested)
				if (!dir.exists() || !dir.isDirectory()) {
					return null;
				}
			}
		}
		return dir;
	}
}());

function getCloudDir() {
	let d = getDropboxDir();
	if (d !== null) {
		let subdir = that.getConfig('cloud-subdir');
		if (subdir != '') {
			subdir = subdir.replace('\\', '/');
			let subs = subdir.split('/');
			subs.forEach(function(s){
				s = filter(s);
				if (s != '') {
					d.append(s);
				}
			});
		}
		d.append('superstart');
	}
	return d;
}

function getItemFile(zipbase, zippath, dst) {
	zippath = zippath.replace(zipbase, '');
	let parts = zippath.split('/');
	let f = dst.clone();
	for (let i = 0; i < parts.length; ++ i) {
		let part = parts[i];
		if (part.charAt(0) == '.') { // .xxx excluded
			return null;
		}
		f.append(part);
	}
	return f;
}

function extract(zipbase, zip, dst, excludes) {
	let entries = zip.findEntries(zipbase + '*/');
	while (entries.hasMore()) {
		let zippath = entries.getNext();
		let dir = getItemFile(zipbase, zippath, dst);
		if (dir && !dir.exists()) {
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
		if (file === null || file.exists()) {
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

this.getDefExt = function() {
	return defExt;
}

this.isDropboxInstalled = function() {
	let dir = getDropboxDir();
	return dir !== null;
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
	let dst = null;
	try {
		let profD = FileUtils.getDir('ProfD', []);
		let src = FileUtils.File(pathName);
		if (src.exists()) {
			let zip = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);
			zip.open(src);

			if (!zip.hasEntry('superstart/') || !zip.hasEntry('.v1/')) {
				zip.close();
				throw 'Format of ' + pathName + ' is incorrect...';
			}


			dst = FileUtils.getDir("ProfD", ['superstart.' + Date.now()]);
			if (!dst.exists()) {
				dst.create(Ci.nsILocalFile.DIRECTORY_TYPE, FileUtils.PERMS_DIRECTORY);
			}
			extract('superstart/', zip, dst, importNotes ? {} : {'/superstart/todo.json': true});
			zip.close();

			if (!importNotes) {
				try {
					let notes = FileUtils.getFile("ProfD", ['superstart', 'todo.json']);
					if (notes && notes.exists()) {
						notes.copyTo(dst, 'todo.json');
					}
				} catch (ne) {
					logger.logStringMessage(ne);
				}
			}

			let backup = FileUtils.getDir("ProfD", ['superstart.backup']);
			if (backup.exists()) {
				try {
					backup.remove(true);
				} catch (dontcare) { }
			}
			let origin = FileUtils.getDir('ProfD', ['superstart']);
			origin.moveTo(profD, 'superstart.backup');

			dst.moveTo(profD, 'superstart');

			this.reloadSites();
			if (importNotes) {
				this.reloadTodoList();
			}
			this.reloadTheme();
			this.fireEvent('reload', null);

			ret = true;
		}

	} catch (e) {
		try {
			if (dst && dst.exists()) {
				dst.remove(true);
			}
		} catch (dontcare) {}
		logger.logStringMessage(e);
	}
	return ret;
}

this.cloudExport = function() {
	let f = getCloudDir();
	if (f === null) {
		return '';
	}

	if (!f.exists()) {
		f.create(Ci.nsILocalFile.DIRECTORY_TYPE, FileUtils.PERMS_DIRECTORY);
	}
	let name = getCloudFileName();
	f.append(name);
	if (!this.export(f.path)) {
		return '';
	}

	let max = this.getConfig('cloud-backup-count');
	let items = getCloudItems();
	while (items.length > max) {
		let x = getCloudDir();
		x.append(items.pop());
		x.remove(true);
	}

	return f.path;
}

this.cloudImport = function(fileName, importNotes) {
	let f = getCloudDir();
	if (f === null) {
		return false;
	}

	f.append(fileName);
	return this.import(f.path, importNotes);
}

this.getCloudItems = function() {
	return getCloudItems();
}

function getCloudItems() {
	let items = [];
	let f = getCloudDir();
	if (f !== null && f.exists()) {
		let entries = f.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);
		let entry;
		while (entry = entries.nextFile) {
			let name = entry.leafName;
			let result = /.*_(\d{4})-(\d\d)-(\d\d)/.exec(name);
			if (result !== null && parseInt(result[2]) > 0) {
				items.push({
						'name': name,
						'time': new Date(result[1], result[2] - 1, result[3])
					});
			}
		}
		entries.close();
	}
	if (items.length > 0) {
		items.sort(function(i1, i2) {
			let d1 = i1.time;
			let d2 = i2.time;
			return d1 > d2 ? -1 : 1;
		});
		items = items.map(function(i) {
			return i.name;
		});
	}

	return items;
}


}

