
(function() {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	var logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
	var sm = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssISiteManager);

	var index = window.arguments[0];
	var dialogs = window.arguments[1];
	let mainWindow = null;

	window.addEventListener('load', function() {
		let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);  
		mainWindow = wm.getMostRecentWindow("navigator:browser");  

		let d = document;
		if (index != -1) {
			var site = sm.getSite(index);
			if (site.url != null) {
				g('url-input').textValue = site.url;
				g('url-name').value = (site.name || '');
				if (site.image) {
					g('customize-image').setAttribute('src', site.image);
				}
				d.title = d.title + ' - ' + site.title;
			} else {
				d.title = d.title + ' (' + (index + 1) + ')';
			}
		}

		g('select-image').onclick = function() {
			selectImage();
		}
		g('clear-image').onclick = function() {
			g('customize-image').removeAttribute('src');
		}

		let links = d.getElementsByClassName('text-link');
		for (let i = 0, l = links.length; i < l; ++ i) {
			let l = links[i];
			l.setAttribute('tooltiptext', l.getAttribute('href'));
		}

		var dlg = g('superstart-url-dialog');
		dlg.onAccept = onAccept;
		dlg.setAttribute('ondialogaccept', 'return document.getElementById("superstart-url-dialog").onAccept();');
	}, false);

	window.addEventListener('unload', function() {
		if (index != -1) {
			dialogs[index] = null;
		}

		var dlg = g('superstart-url-dialog');
		dlg.onAccept = null;

	}, false);

	function onAccept() {
		try {
			var url = g('url-input').textValue;
			var name = g('url-name').value;
			var image = g('customize-image').getAttribute('src');
			if (index != -1) {
				var site = sm.getSite(index);
				if (url == site.url && name == site.name && image == (site.image || '')) {
					return;
				}

				if (url == '') {
					sm.removeSite(index);
				} else {
					sm.changeSite(index, url, name, image);
				}
			} else {
				if (url != '') {
					sm.addSite(url, name, image);
				}
			}
		} catch (e) {
			logger.logStringMessage(e);
		}

		return true;
	}

	function g(id) {
		return document.getElementById(id);
	}


	function selectImage() {
		let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
		fp.init(window, "Select an image", Ci.nsIFilePicker.modeOpen);
		fp.appendFilters(Ci.nsIFilePicker.filterImages);
		let res = fp.show();
		if (res == Ci.nsIFilePicker.returnOK) {
			g('customize-image').setAttribute('src', getUrlFromFile(fp.file));
		}
	}

	function getUrlFromFile(iF) {
		var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);  
		return ios.newFileURI(iF).spec; 
	}

})();
