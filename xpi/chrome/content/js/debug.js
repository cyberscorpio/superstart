var log = null;
var assert = null;

(function() {
var logger = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);

log = function(s) {
	logger.logStringMessage(s);
}

assert = function(condition, description) {
	if (!condition) {
		var debug = $('#debug');
		if (debug == null) {
			debug = document.createElement('div');
			debug.id = 'debug';
			debug.style.display = 'block';
			var container = $('#container');
			container.appendChild(debug);

			var ul = document.createElement('ul');
			debug.appendChild(ul);
		}
		var ul = $('#debug ul')[0];

		var li = document.createElement('li');
		var text = document.createTextNode(description);
		li.appendChild(text);
		ul.insertBefore(li, ul.firstChild);
		// log('assert failed: ' + description);
	}
}
})();
