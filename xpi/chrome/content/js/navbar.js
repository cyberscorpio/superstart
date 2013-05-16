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
	initPopupButton([
		{bid: 'nbb-recently-closed', mid: 'superstart-recently-closed-list', title: getString('ssRecentlyClosed')},
		{bid: 'nbc-themes-pointer', mid: 'superstart-themes-list-menu', title: getString('ssThemes')}
	]);
	for (var k in e2id) {
		ob.subscribe(k, onNavbarItemOnoff);
		onNavbarItemOnoff(k);
	}

	var sbar = $$('nb-search');
	var input = $$('nb-search-box');
	var switcher = $$('nb-search-dropdown');
	input.addEventListener('focus', onFocus, false);
	input.addEventListener('blur', onBlur, false);

	function onFocus() {
		$.addClass(sbar, 'focus');
	}

	function onBlur() {
		$.removeClass(sbar, 'focus');
	}
});
evtMgr.clear(function() {
	for (var k in e2id) {
		ob.unsubscribe(k, onNavbarItemOnoff);
	}
});

function initPopupButton(pops) {
	function onMouseDown(evt) {
		if (evt.button != 0) {
			return;
		}
		evt.preventDefault();
		evt.stopPropagation();

		var doc = $.getMainWindow().document;
		var b = evt.target;
		var m = doc.getElementById(b.mid);
		if (m) {
			if (m.state == 'closed') {
				var obj = doc.getElementById('browser').boxObject;
				var rc = b.getBoundingClientRect();
				var x = rc.left + obj.screenX, y = rc.top + obj.screenY;
				y += rc.height + 2;
				m.openPopupAtScreen(x, y, false);
				$.addClass(b, 'opened');
				m.addEventListener('popuphiding', onPopupHiding, true);
				m.bid = b.id;
			} else {
				m.hidePopup();
			}
		}
	}

	function onPopupHiding(evt) {
		var m = evt.target;
		var b = $$(m.bid);
		delete m.bid;
		$.removeClass(b, 'opened');
		m.removeEventListener('popuphiding', onPopupHiding, true);
	}

	for (var i = 0; i < pops.length; ++ i) {
		var p = pops[i];
		var b = $$(p.bid);
		b.mid = p.mid;
		b.setAttribute('title', p.title);
		b.addEventListener('mousedown', onMouseDown, false);
	}
	evtMgr.clear(function() {
		for (var i = 0; i < pops.length; ++ i) {
			var b = $$(p.bid);
			b.removeEventListener('mousedown', onMouseDown, false);
		}
	});
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
