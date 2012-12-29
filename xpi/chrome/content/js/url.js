"use strict";
(function() {
	const {classes: Cc, interfaces: Ci} = Components;
	let logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);

	let idxes = window.arguments[0];
	let str = idxes[0] + '-' + idxes[1];
	let g = idxes[0], idx = idxes[1];
	let dialogs = window.arguments[1];

	evtMgr.ready(function() {
		let d = document;
		if (idx != -1) {
			let s = sm.getSite(g, idx);
			if (s && s.url != null) {
				$$('url-input').textValue = s.url;
				$$('url-name').value = (s.name || '');
				$$('snapshot-index').selectedIndex = s.snapshotIndex;
				if (s.useLastVisited) {
					$$('use-lastvisited').setAttribute('checked', true);
				}

				let custimg = s.customizeImage;
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
			if ($$('snapshot-index').selectedIndex == 2) {
				$$('snapshot-index').selectedIndex = 0;
			}
		}

		let links = d.getElementsByClassName('text-link');
		for (let i = 0, l = links.length; i < l; ++ i) {
			let l = links[i];
			l.setAttribute('tooltiptext', l.getAttribute('href'));
		}

		$$('superstart-url-dialog').addEventListener('dialogaccept', function() {
			return onAccept();
		}, false);
	});

	evtMgr.clear(function() {
		if (dialogs) {
			dialogs[str] = null;
		}

		$$('superstart-url-dialog').onAccept = null;
	});

	function onAccept() {
		try {
			var url = $$('url-input').textValue;
			var name = $$('url-name').value;
			var image = $$('customize-image').getAttribute('src');
			var snapshotIndex = $$('snapshot-index').selectedIndex;
			var useLastVisited = $$('use-lastvisited').checked;
			if (idx != -1) {
				var s = sm.getSite(g, idx);
				if (s && s.sites === undefined && s.url != '') {
					if (url == s.url && name == s.name && image == s.customizeImage && snapshotIndex == s.snapshotIndex && useLastVisited == s.useLastVisited) {
						return;
					}

					if (url == '') {
						sm.removeSite(g, idx);
					} else {
						sm.changeSite(g, idx, url, name, snapshotIndex, useLastVisited, image);
					}
				}
			} else {
				if (url != '') {
					sm.addSite(url, name, snapshotIndex, useLastVisited, image);
				}
			}
		} catch (e) {
			logger.logStringMessage(e);
		}

		return true;
	}

	function selectImage() {
		let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
		fp.init(window, getString('ssSelectImage'), Ci.nsIFilePicker.modeOpen);
		fp.appendFilters(Ci.nsIFilePicker.filterImages);
		let res = fp.show();
		if (res == Ci.nsIFilePicker.returnOK) {
			$$('customize-image').setAttribute('src', getUrlFromFile(fp.file));
			$$('select-customize-image').removeAttribute('disabled');
			$$('snapshot-index').selectedIndex = 2;
		}
	}

	function getUrlFromFile(iF) {
		var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);  
		return ios.newFileURI(iF).spec; 
	}

})();
