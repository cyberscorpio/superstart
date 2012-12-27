/**
 * created on 10/2/2012, on hospital, with my father
 */
"use strict";
(function() {
var e2id = { // use "onNavbarItemOnoff" to handle the events
	'navbar-recently-closed': 'nbb-recently-closed',
	'navbar-add-site': 'nbb-add-site',
	'navbar-themes': 'nbc-themes-pointer',
	'navbar-todo': 'nbc-notes-onoff',
	'navbar': 'navbar'
};

evtMgr.ready(function() {
	initPopupButton('nbb-recently-closed', 'superstart-recently-closed-list', getString('ssRecentlyClosed'));
	for (var k in e2id) {
		ob.subscribe(k, onNavbarItemOnoff);
		onNavbarItemOnoff(k);
	}
});
evtMgr.clear(function() {
	for (var k in e2id) {
		ob.unsubscribe(k, onNavbarItemOnoff);
	}
});

function initPopupButton(bid, mid, title) {
	var b = $$(bid);
	b.setAttribute('title', title);
	function onMouseDown(evt) {
		if (evt.button != 0) {
			return;
		}
		evt.preventDefault();
		evt.stopPropagation();

		var mw = $.getMainWindow();
		var doc = mw.document;
		var m = doc.getElementById(mid);
		if (m) {
			if (m.state == 'closed') {
				var obj = doc.getElementById('browser').boxObject;
				var rc = b.getBoundingClientRect();
				var x = rc.left + obj.screenX, y = rc.top + obj.screenY;
				y += rc.height + 2;
				m.openPopupAtScreen(x, y, false);
				$.addClass(b, 'opened');
				m.addEventListener('popuphiding', onPopupHiding, true);
			} else {
				m.hidePopup();
			}
		}
	}
	b.addEventListener('mousedown', onMouseDown, false);
	evtMgr.clear(function() {
		b.removeEventListener('mousedown', onMouseDown, false);
		b = undefined;
	});

	function onPopupHiding(evt) {
		var m = evt.target;
		if (m.id != mid) {
			return;
		}
		m.removeEventListener('popuphiding', onPopupHiding, true);
		$.removeClass(b, 'opened');
	}
}

function onNavbarItemOnoff(evt, onoff) {
	onoff = cfg.getConfig(evt);
	var id = e2id[evt];
	if (id !== undefined) {
		var b = $$(id);
		onoff ? $.removeClass(b, 'hidden') : $.addClass(b, 'hidden');
	}
}

})();
