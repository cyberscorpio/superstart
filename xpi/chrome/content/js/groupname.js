(function() {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	var logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
	var sm = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssISiteManager);
	var strings = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService).createBundle("chrome://superstart/locale/main.properties");

	var g = window.arguments[0];
	var idx = window.arguments[1];

	window.addEventListener('DOMContentLoaded', function() {
		window.removeEventListener('DOMContentLoaded', arguments.callee, false);
		$$('group-name').setAttribute('placeholder', strings.GetStringFromName('ssFolderDefaultName'));

		var s = sm.getSite(g, idx);
		if (s && s.sites && Array.isArray(s.sites)) {
			$$('group-name').value = s.title;
		}

		var dlg = $$('superstart-name-dialog');
		dlg.onAccept = onAccept;
		dlg.setAttribute('ondialogaccept', 'return document.getElementById("superstart-name-dialog").onAccept();');
	}, false);


	function onAccept() {
		var s = sm.getSite(g, idx);
		if (s && s.sites && Array.isArray(s.sites)) {
			sm.setTitle(g, idx, $$('group-name').value);
		}
		return true;
	}

})();
