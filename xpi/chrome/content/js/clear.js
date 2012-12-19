"use strict";
(function() {
 	function clear() {
		window.removeEventListener('unload', clear, false);
		ob = cfg = sm = todo = tm = null;
	}

 	function registerClear() {
		window.removeEventListener('DOMContentLoaded', registerClear, false);
		window.addEventListener('unload', clear, false);
	}

	window.addEventListener('DOMContentLoaded', registerClear, false);
}());
