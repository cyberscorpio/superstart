"use strict";
var log = null;
var assert = null;

(function() {
var logger = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
log = function(s) {
	logger.logStringMessage(s);
}

assert = function(condition, description) {
	// in release branch, we do nothing :)
}
})();
