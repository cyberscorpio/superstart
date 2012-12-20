"use strict";
(function() {
	const {classes: Cc, interfaces: Ci} = Components;
	var logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
	var sm = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssISiteManager);
	var strings = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService).createBundle("chrome://superstart/locale/main.properties");

	var g = window.arguments[0];
	var idx = window.arguments[1];

	function onDOMLoaded() {
		window.removeEventListener('DOMContentLoaded', onDOMLoaded, false);
		$$('group-name').setAttribute('placeholder', strings.GetStringFromName('ssFolderDefaultName'));

		var s = sm.getSite(g, idx);
		if (s && s.sites && Array.isArray(s.sites)) {
			$$('group-name').value = s.title;
		}

		var dlg = $$('superstart-name-dialog');
		dlg.addEventListener('dialogaccept', function() {
			return onAccept();
		}, false);
	}
	window.addEventListener('DOMContentLoaded', onDOMLoaded, false);

	function onAccept() {
		var s = sm.getSite(g, idx);
		if (s && s.sites && Array.isArray(s.sites)) {
			sm.setTitle(g, idx, $$('group-name').value);
		}
		logger = sm = strings = undefined;
		return true;
	}

})();
