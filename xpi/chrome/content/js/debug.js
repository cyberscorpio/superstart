"use strict";
var log = null;
var assert = null;

(function() {
var logger = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
log = function() {
	var s = '';
	for (var i = 0; i < arguments.length; ++ i) {
		if (s !== '') {
			s += ', ';
		}
		s += arguments[i];
	}
	if (s !== '') {
		logger.logStringMessage(s);
	}
}

assert = function(condition, description) {
	// in release branch, we do nothing :)
}
})();
