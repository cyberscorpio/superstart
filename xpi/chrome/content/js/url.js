
(function() {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	var logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
	var sm = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssISiteManager);

	var idxes = window.arguments[0];
	var str = idxes[0] + '-' + idxes[1];
	var g = idxes[0], idx = idxes[1];
	var dialogs = window.arguments[1];

	window.addEventListener('DOMContentLoaded', function() {
		window.removeEventListener('DOMContentLoaded', arguments.callee, false);

		let d = document;
		if (idx != -1) {
			var s = sm.getSite(g, idx);
			if (s && s.url != null) {
				$$('url-input').textValue = s.url;
				$$('url-name').value = (s.name || '');
				$$('snapshot-index').selectedIndex = s.snapshotIndex;

				var custimg = s.snapshots[3];
				if (custimg != '') {
					$$('customize-image').setAttribute('src', custimg);
					$$('select-customize-image').removeAttribute('disabled');
				}
				d.title = d.title + ' - ' + s.title;
			}
		}

		$$('select-image').onclick = function() {
			selectImage();
		}
		$$('clear-image').onclick = function() {
			$$('customize-image').removeAttribute('src');
			$$('select-customize-image').setAttribute('disabled', true);
			if ($$('snapshot-index').selectedIndex == 3) {
				$$('snapshot-index').selectedIndex = 0;
			}
		}

		let links = d.getElementsByClassName('text-link');
		for (let i = 0, l = links.length; i < l; ++ i) {
			let l = links[i];
			l.setAttribute('tooltiptext', l.getAttribute('href'));
		}

		var dlg = $$('superstart-url-dialog');
		dlg.onAccept = onAccept;
		dlg.setAttribute('ondialogaccept', 'return document.getElementById("superstart-url-dialog").onAccept();');
	}, false);

	window.addEventListener('unload', function() {
		dialogs[str] = null;

		var dlg = $$('superstart-url-dialog');
		dlg.onAccept = null;

	}, false);

	function onAccept() {
		try {
			var url = $$('url-input').textValue;
			var name = $$('url-name').value;
			var image = $$('customize-image').getAttribute('src');
			var snapshotIndex = $$('snapshot-index').selectedIndex;
			if (idx != -1) {
				var s = sm.getSite(g, idx);
				if (s && s.sites === undefined && s.url != '') {
					if (url == s.url && name == s.name && image == s.snapshots[3]) {
						return;
					}

					if (url == '') {
						sm.removeSite(g, idx);
					} else {
						sm.changeSite(g, idx, url, name, snapshotIndex, image);
					}
				}
			} else {
				if (url != '') {
					sm.addSite(url, name, snapshotIndex, image);
				}
			}
		} catch (e) {
			logger.logStringMessage(e);
		}

		return true;
	}

	function selectImage() {
		let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
		fp.init(window, "Select an image", Ci.nsIFilePicker.modeOpen);
		fp.appendFilters(Ci.nsIFilePicker.filterImages);
		let res = fp.show();
		if (res == Ci.nsIFilePicker.returnOK) {
			$$('customize-image').setAttribute('src', getUrlFromFile(fp.file));
			$$('select-customize-image').removeAttribute('disabled');
			$$('snapshot-index').selectedIndex = 3;
		}
	}

	function getUrlFromFile(iF) {
		var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);  
		return ios.newFileURI(iF).spec; 
	}

})();
