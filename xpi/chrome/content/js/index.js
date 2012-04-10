(function() {

var imgWidth = 212, imgHeight = 132;
var imgWidthSmall = 150, imgHeightSmall = 93;
var sitesPerLine = 4;

try {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	Components.utils.import('resource://superstart/xl.js');
	var logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
	var SuperStart = $.getMainWindow().SuperStart;
	var getString = SuperStart.getString;
	var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
	var ob = ssObj.getService(Ci.ssIObserverable);
	var cfg = ssObj.getService(Ci.ssIConfig);
	var sm = ssObj.getService(Ci.ssISiteManager);
	var td = ssObj.getService(Ci.ssITodoList);
	var tm = ssObj.getService(Ci.ssIThemes);
	sitesPerLine = cfg.getConfig('site-perline');
} catch (e) {
	if (logger != null) {
		logger.logStringMessage(e);
	}
	return;
}

var sites = sm.getSites();
logger.logStringMessage(sites.length);


})();
