(function() {
var SuperStart = $.getMainWindow().SuperStart;
var getString = SuperStart.getString;
 
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
	for (var k in wEvts) {
		window.removeEventListener(k, wEvts[k], false);
	}
	for (var k in dEvts) {
		document.removeEventListener(k, dEvts[k], false);
	}
}, false);

window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);
	for (var k in dEvts) {
		document.addEventListener(k, dEvts[k], false);
	}
}, false);





// event handler
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
