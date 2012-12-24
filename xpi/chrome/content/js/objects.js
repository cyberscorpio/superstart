/** contain the project related global objects */
const {classes: Cc, interfaces: Ci} = Components;

var getString = $.getMainWindow().SuperStart.getString;
var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
var ob = ssObj.getService(Ci.ssIObserverable);
var cfg = ssObj.getService(Ci.ssIConfig);
var sm = ssObj.getService(Ci.ssISiteManager);
var todo = ssObj.getService(Ci.ssITodoList);
var tm = ssObj.getService(Ci.ssIThemes);

var evtMgr = (function() {
	var evts = [[], [], []]; // ob, window, document

	function doRegister(obs, ws, ds, isAdd) {
		for (var i = 0; i < obs.length; ++ i) {
			for (var k in obs[i]) {
				isAdd ? ob.subscribe(k, obs[i][k]) : ob.unsubscribe(k, obs[i][k]);
			}
		}
		for (var i = 0; i < ws.length; ++ i) {
			for (var k in ws[i]) {
				isAdd ? window.addEventListener(k, ws[i][k], false) : window.removeEventListener(k, ws[i][k], false);
			}
		}
		for (var i = 0; i < ds.length; ++ i) {
			for (var k in ds[i]) {
				isAdd ? document.addEventListener(k, ds[i][k], false) : document.removeEventListener(k, ds[i][k], false);
			}
		}
	}

	function register(obs, ws, ds) {
		evts[0] = evts[0].concat(obs);
		evts[1] = evts[1].concat(ws);
		evts[2] = evts[2].concat(ds);

		doRegister(obs, ws, ds, true);
	}

	var isReady = false;
	var readyFns = [];
	function ready(fn) {
		if (isReady) {
			fn();
		} else {
			readyFns.push(fn);
		}
	}

	function onDOMLoaded() {
		window.removeEventListener('DOMContentLoaded', onDOMLoaded, false);
		for (var i = 0; i < readyFns.length; ++ i) {
			readyFns[i]();
		}
		readyFns = undefined;
		isReady = true;
	}

	var clearFns = [];
	function clear(fn) {
		clearFns.push(fn);
	}

	function onUnload() {
		window.removeEventListener('unload', onUnload, false);

		doRegister(evts[0], evts[1], evts[2], false);
		evts = undefined;

		for (var i = 0; i < clearFns.length; ++ i) {
			clearFns[i]();
		}
		clearFns = undefined;

		ob = cfg = sm = todo = tm = ssObj = getString = undefined;
	}

	window.addEventListener('DOMContentLoaded', onDOMLoaded, false);
	window.addEventListener('unload', onUnload, false);

	return {
		'ready': ready,
		'register': register,
		'clear': clear
	};
}());
