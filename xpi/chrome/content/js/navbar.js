/**
 * created on 10/2/2012, on hospital, with my father
 */
(function() {
const {classes: Cc, interfaces: Ci} = Components;
var SuperStart = $.getMainWindow().SuperStart;
var getString = SuperStart.getString;
var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
var ob = ssObj.getService(Ci.ssIObserverable);
var cfg = ssObj.getService(Ci.ssIConfig);
ssObj = undefined;

var e2id_map = { // use "onNavbarItemOnoff" to handle the events
	'navbar-recently-closed': 'nbb-recently-closed',
	'navbar-add-site': 'nbb-add-site',
	'navbar-themes': 'nbc-themes-pointer',
	'navbar-todo': 'nbc-notes-onoff',
	'navbar': 'navbar'
};

window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);
	init();
}, false);
window.addEventListener('unload', function() {
	window.removeEventListener('unload', arguments.callee, false);
	cleanup();
	ob = cfg = null;
}, false);

function init() {
	initPopupButton('nbb-recently-closed', 'superstart-recently-closed-list', getString('ssRecentlyClosed'));
	for (var k in e2id_map) {
		ob.subscribe(k, onNavbarItemOnoff);
		onNavbarItemOnoff(k);
	}

	$.removeClass($$('navbar'), 'hidden');
}

function cleanup() {
	for (var k in e2id_map) {
		ob.unsubscribe(k, onNavbarItemOnoff);
	}
}

function initPopupButton(bid, mid, title) {
	var b = $$(bid);
	b.setAttribute('title', title);
	b.addEventListener('mousedown', function(evt) {
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
				var x = pos[0] + obj.screenX, y = pos[1] + obj.screenY;
				y += dimension[1] + margin[0] + margin[2] + border[0] + border[2] + padding[0] + padding[2];
				y += 2;
				m.openPopupAtScreen(x, y, false);
				$.addClass(b, 'opened');
				m.addEventListener('popuphiding', onPopupHiding, true);
			} else {
				m.hidePopup();
			}
		}
	}, false);

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
	var id = e2id_map[evt];
	if (id !== undefined) {
		var b = $$(id);
		onoff ? $.removeClass(b, 'hidden') : $.addClass(b, 'hidden');
	}
}

})();
