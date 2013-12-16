"use strict";

(function() {

var sEvts = {
	'reload': onReload
};
var wEvts = {
	'scroll': onScroll
};
var dEvts = {
	'contextmenu': onContextMenu
};
evtMgr.register([sEvts], [wEvts], [dEvts]);
evtMgr.once(window, 'load', function() {
		window.setTimeout(function() {
			$.insertStyle('chrome://superstart/content/style/transition.css');
		}, 0);
	}, 500);

// event handler
function onReload() {
	document.location.reload();
}

function onScroll() {
	var mask = $$('mask');
	mask.style.top = window.pageYOffset + 'px';
	mask.style.left = window.pageXOffset + 'px';
}

function onContextMenu(evt) {
	var t = evt.target;
	while (t) {
		if (t.id == 'notes' || t.id == 'nb-search') {
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

}());
