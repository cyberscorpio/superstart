"use strict";

Cu.import("resource://gre/modules/FileUtils.jsm");
const nsIFilePicker = Ci.nsIFilePicker;
let logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
let exim = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIExIm);
let defExt = 'ssbackup';
let dlg = null;

function formatDate(d) { // format Date to 'yyyy-mm-dd'
	function pad(n) { return n < 10 ? '0' + n : n; }
	return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

function getFP() {
	let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.defaultExtension = defExt;
	fp.appendFilter('Super Start backup', '*.' + defExt);
	fp.defaultString = 'superstart_' + formatDate(new Date()) + '.' + defExt;
	return fp;
}

/**
 * @input path name
 * @return path.ext if path is not eneded as '.ext'
 */
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
			let path = getExportFilePathName();
			if (path != '') {
				let res = exim.export(path);
				if (res) {
					dlg.cancelDialog();
				}
				let f = FileUtils.File(path);
				alert('Export to ' + f.leafName + (res ? ' successfully!' : ' failed!'));
			}
		});
		$$('import').addEventListener('click', function() {
			let path = getImportFilePathName();
			if (path != '') {
				let res = exim.import(path, true);
				if (res) {
					dlg.cancelDialog();
				}
				let f = FileUtils.File(path);
				alert('Import ' + f.leafName + (res ? ' successfully!' : ' failed!'));
			}
		});
	} catch (e) {
		logger.logStringMessage(e);
	}
});

function getExportFilePathName() {
	let fp = getFP();
	fp.init(window, "Save to...", nsIFilePicker.modeSave);
	let res = fp.show();
	if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
		return addExtIfNotFound(fp.file.path, defExt);
	}
	return '';
}

function getImportFilePathName() {
	let fp = getFP();
	fp.init(window, "Open...", nsIFilePicker.modeOpen);
	let res = fp.show();
	if (res == nsIFilePicker.returnOK) {
		return fp.file.path;
	}
	return '';
}
