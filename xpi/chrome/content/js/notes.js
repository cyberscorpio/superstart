/**
 * created on 10/2/2012, on hospital, with my father
 */
(function() {
const Cc = Components.classes;
const Ci = Components.interfaces;
var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
var cfg = ssObj.getService(Ci.ssIConfig);
ssObj = undefined;

var cfgevts = {
	'todo-hide': onTodoHide
};

window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);
	for (var k in cfgevts) {
		cfg.subscribe(k, cfgevts[k]);
	}

	if (!cfg.getConfig('todo-hide')) {
		$.removeClass($$('notes'), 'hidden');
		layout.placeTodoList();
	}
}, false);
window.addEventListener('unload', function() {
	window.removeEventListener('unload', arguments.callee, false);
	for (var k in cfgevts) {
		cfg.unsubscribe(k, cfgevts[k]);
	}
	cfg = null;
}, false);

function onTodoHide(evt, v) {
	if (v) {
		$.addClass($$('notes'), 'hidden');
	} else {
		$.removeClass($$('notes'), 'hidden');
	}
}

function init() {
}

})();
