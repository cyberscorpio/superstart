"use strict";
const {classes: Cc, interfaces: Ci} = Components;
var SuperStart = $.getMainWindow().SuperStart;
var getString = SuperStart.getString;
var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
var ob = ssObj.getService(Ci.ssIObserverable);
var cfg = ssObj.getService(Ci.ssIConfig);
var sm = ssObj.getService(Ci.ssISiteManager);
var todo = ssObj.getService(Ci.ssITodoList);
var tm = ssObj.getService(Ci.ssIThemes);
ssObj = undefined;

var evtMgr = (function() {
	var evts = [[], [], []]; // ob, window, document

	var added = 0;
	var removed = 0;
	function doRegister(obs, ws, ds, isAdd) {
		for (var i = 0; i < obs.length; ++ i) {
			for (var k in obs[i]) {
				isAdd ? ob.subscribe(k, obs[i][k]) : ob.unsubscribe(k, obs[i][k]);
				isAdd ? log('+++ ' + (++ added) + ' ' + k + ' subscribed') : log('--- ' + (++ removed) + ' ' + k + ' unsubscribed');
			}
		}
		for (var i = 0; i < ws.length; ++ i) {
			for (var k in ws[i]) {
				isAdd ? window.addEventListener(k, ws[i][k], false) : window.removeEventListener(k, ws[i][k], false);
				isAdd ? log('+++ ' + (++ added) + ' ' + k + ' subscribed') : log('--- ' + (++ removed) + ' ' + k + ' unsubscribed');
			}
		}
		for (var i = 0; i < ds.length; ++ i) {
			for (var k in ds[i]) {
				isAdd ? document.addEventListener(k, ds[i][k], false) : document.removeEventListener(k, ds[i][k], false);
				isAdd ? log('+++ ' + (++ added) + ' ' + k + ' subscribed') : log('--- ' + (++ removed) + ' ' + k + ' unsubscribed');
			}
		}
	}

	function register(obs, ws, ds) {
		evts[0] = evts[0].concat(obs);
		evts[1] = evts[1].concat(ws);
		evts[2] = evts[2].concat(ds);

		doRegister(obs, ws, ds, true);
	}

	function unregister() {
		window.removeEventListener('unload', unregister, false);
		doRegister(evts[0], evts[1], evts[2], false);
		evts = undefined;
	}

	window.addEventListener('unload', unregister, false);

	return {
		'register': register
	};
}());

(function() {

 
var sEvts = {
	'sites-use-background-effect': onUseBackgroundEffect,
};
var wEvts = {
	'scroll': onScroll
};
var dEvts = {
	'contextmenu': onContextMenu
};

evtMgr.register([sEvts], [wEvts], [dEvts]);
window.addEventListener('load', onLoad, false);
function onLoad() {
	window.removeEventListener('load', onLoad, false);
	window.setTimeout(function() {
		$.insertStyle('style/transition.css');
	}, 0);
}

// event handler
function onUseBackgroundEffect(evt, value) {
	var use = cfg.getConfig('sites-use-background-effect');
	if (use) {
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

}());
