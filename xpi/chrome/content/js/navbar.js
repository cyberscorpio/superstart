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
	init();
});
evtMgr.clear(function() {
	cleanup();
});

function init() {
	initPopupButton('nbb-recently-closed', 'superstart-recently-closed-list', getString('ssRecentlyClosed'));
	for (var k in e2id) {
		ob.subscribe(k, onNavbarItemOnoff);
		onNavbarItemOnoff(k);
	}
}

function cleanup() {
	for (var k in e2id) {
		ob.unsubscribe(k, onNavbarItemOnoff);
	}
}

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
				var pos = $.getPosition(b), margin = $.getElementMargin(b), border = $.getElementBorder(b), padding = $.getElementPadding(b), dimension = $.getElementDimension(b);
				var x = pos.left + obj.screenX, y = pos.top + obj.screenY;
				y += dimension[1] + margin[0] + margin[2] + border[0] + border[2] + padding[0] + padding[2];
				y += 2;
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
