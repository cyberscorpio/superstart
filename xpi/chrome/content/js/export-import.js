"use strict"

const nsIFilePicker = Ci.nsIFilePicker;
let logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
let defExt = 'ssbackup';
let dlg = null;

function formatDate(d) { // format to '20xx-mm-dd'
	function pad(n) { return n < 10 ? '0' + n : n; }
	return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

function getFP() {
	let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.defaultString = 'superstart_' + formatDate(new Date());
	return fp;
}

function addExtIfNotFound(path, ext) {
	let extPos = path.lastIndexOf('.' + ext);
	if (extPos === -1 || extPos != path.length - ext.length - 1) {
		if (path.length > 0 && path.charAt(path.length - 1) == '.') {
			path += ext;
		} else {
			path += '.' + ext;
		}
	}
	return path;
}


evtMgr.ready(function() {
	try {
		dlg = $$('superstart-url-dialog');
		$$('export').addEventListener('click', function() {
			let path = getSavedFilePathName();
			if (path != '') {
				alert(path);
				// dlg.cancelDialog();
			}
		});
	} catch (e) {
		logger.logStringMessage(e);
	}
});

function getSavedFilePathName() {
	let fp = getFP();
	fp.init(window, "Save to...", nsIFilePicker.modeSave);
	fp.defaultExtension = defExt;
	fp.appendFilter('Super Start backup', '*.' + defExt);
	let res = fp.show();
	if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
		return addExtIfNotFound(fp.file.path, defExt);
	}
	return '';
}
