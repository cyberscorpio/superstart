"use strict";
(function() {
	const {classes: Cc, interfaces: Ci} = Components;
	var logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
	var g = window.arguments[0];
	var idx = window.arguments[1];

	evtMgr.ready(function() {
		$$('group-name').setAttribute('placeholder', getString('ssFolderDefaultName'));

		var s = sm.getSite(g, idx);
		if (s && s.sites && Array.isArray(s.sites)) {
			$$('group-name').value = s.title;
		}

		$$('superstart-name-dialog').addEventListener('dialogaccept', function() {
			return onAccept();
		}, false);
	});

	function onAccept() {
		var s = sm.getSite(g, idx);
		if (s && s.sites && Array.isArray(s.sites)) {
			sm.setTitle(g, idx, $$('group-name').value);
		}
		logger = undefined;
		return true;
	}

})();
