(function() {
const Cc = Components.classes;
const Ci = Components.interfaces;
var SuperStart = $.getMainWindow().SuperStart;
var getString = SuperStart.getString;
var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
var ob = ssObj.getService(Ci.ssIObserverable);
var cfg = ssObj.getService(Ci.ssIConfig);
ssObj = undefined;
 
var sEvts = {
	'site-use-background-effect': onUseBgEffectChanged
};
var wEvts = {
	'scroll': onScroll
};
var dEvts = {
	'contextmenu': onContextMenu
};
for (var k in wEvts) {
	window.addEventListener(k, wEvts[k], false);
}
window.addEventListener('unload', function() {
	window.removeEventListener('unload', arguments.callee, false);
	for (var k in sEvts) {
		ob.unsubscribe(k, sEvts[k]);
	}
	ob = null;
	cfg = null;
	for (var k in wEvts) {
		window.removeEventListener(k, wEvts[k], false);
	}
	for (var k in dEvts) {
		document.removeEventListener(k, dEvts[k], false);
	}
}, false);

window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);
	for (var k in sEvts) {
		ob.subscribe(k, sEvts[k]);
	}
	for (var k in dEvts) {
		document.addEventListener(k, dEvts[k], false);
	}

	onUseBgEffectChanged();
}, false);

// event handler
function onUseBgEffectChanged(evt, value) {
	var useBgEffect = cfg.getConfig('site-use-background-effect');
	if (useBgEffect) {
		$.addClass(document.body, 'use-background-effect');
	} else {
		$.removeClass(document.body, 'use-background-effect');
	}
}


function onScroll() {
	var mask = $$('mask');
	mask.style.top = window.scrollY + 'px';
	mask.style.left = window.scrollX + 'px';
}


function onContextMenu(evt) {
	var t = evt.target;
	while (t) {
		if (t.id == 'notes') {
			return;
		}
		t = t.parentNode;
	}

	var win = $.getMainWindow();
	var menu = win.document.getElementById('superstart-menu');
	if (menu) {
		menu.openPopupAtScreen(evt.screenX, evt.screenY, true);
		evt.preventDefault();
	}
}


})();
