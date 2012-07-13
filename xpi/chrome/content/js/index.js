(function() {

var pageMinWidth = 800;
var ratio = 0.625; // h = w * 0.625 <=> w = h * 1.6

try {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	Components.utils.import('resource://superstart/xl.js');
	var logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
	var SuperStart = $.getMainWindow().SuperStart;
	var getString = SuperStart.getString;
	var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
	var ob = ssObj.getService(Ci.ssIObserverable);
	var cfg = ssObj.getService(Ci.ssIConfig);
	var sm = ssObj.getService(Ci.ssISiteManager);
	var td = ssObj.getService(Ci.ssITodoList);
	var tm = ssObj.getService(Ci.ssIThemes);
} catch (e) {
	if (logger != null) {
		logger.logStringMessage(e);
	}
	return;
}

function log(s) {
	logger.logStringMessage(s);
}

// global init
var gEvts = {
	'resize': onResize,
	'dblclick': onDblClick
};
for (var k in gEvts) {
	window.addEventListener(k, gEvts[k], false);
}
window.addEventListener('unload', function() {
	window.removeEventListener('unload', arguments.callee, false);
	for (var k in gEvts) {
		window.removeEventListener(k, gEvts[k], false);
	}
}, false);


// sites
(function() {

window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);
	init();
}, false);

var col = 4;
function init() {
	var sites = sm.getSites();

	var container = $$('sites');
	for (var i = 0, l = sites.length; i < l; ++ i) {
		var s = sites[i];

		insert(container, s);
	}
	var add = $$('site-add');
	add.onclick = function() { showAddSite(); };
	$.removeClass(add, 'hidden');

	layout.act();
	$.removeClass(container, 'hidden');

	// register site events
	var smevts = {
		'site-added': onSiteAdded,
		'site-removed': onSiteRemoved,
		'site-simple-move': onSiteSimpleMove,
		'site-changed': onSiteChanged,
		'site-snapshot-changed': onSiteSnapshotChanged
	};
	// register document events
	var devts = {
		'dragenter': gDrag.onEnter,
		'dragleave': gDrag.onLeave,
		'dragover': gDrag.onOver,
		'drop': gDrag.onDrop,
		'dragend': gDrag.onEnd
	}

	for (var k in smevts) {
		sm.subscribe(k, smevts[k]);
	}
	for (var k in devts) {
		document.addEventListener(k, devts[k]);
	}

	window.addEventListener('unload', function() {
		window.removeEventListener('unload', arguments.callee, false);
		for (var k in smevts) {
			sm.unsubscribe(k, smevts[k]);
		}
		for (var k in devts) {
			document.removeEventListener(k, devts[k]);
		}
	}, false);
}

var templates = {
	'empty': {
		'tag': 'div',
		'attr': {
			'class': 'site empty'
		},
		'children': [
			{
				'tag': 'div',
				'attr': {
					'class': 'snapshot'
				}
			}
		]
	},
	'site': {
		'tag': 'div',
		'attr': {
			'class': 'site',
			'draggable': 'true'
		},
		'children': [
			{
				'tag': 'a',
				'attr': {
					'draggable': 'false'
				},
				'children': [
					{
						'tag': 'div',
						'attr': {
							'class': 'snapshot'
						},
						'children': [
							{
								'tag': 'div',
								'attr': {
									'class': 'remove button'
								}
							}, // remove
							{
								'tag': 'div',
								'attr': {
									'class': 'next-snapshot button'
								}
							} // right arrow
						]
					}, // background
					{
						'tag': 'p',
						'attr': {
							'class': 'title'
						}
					} // title
				]
			} // a
		] // site children
	}, // site
	'folder': {
		'tag': 'div',
		'attr': {
			'class': 'site folder'
		}
	} // folder
};

var UPDATE_HINT = 1;
var UPDATE_URL = 2;
var UPDATE_SNAPSHOT = 4;
var UPDATE_TITLE = 8;
function updateSite(s, se, flag) {
	var all = (flag === undefined);
	var e = $(se, 'a')[0];
	if (all || (flag & UPDATE_HINT)) {
		e.title = s.title || s.url;
	}
	if (all || (flag & UPDATE_URL)) {
		e.href = s.url;
	}
	if (all || (flag & UPDATE_SNAPSHOT)) {
		e = $(se, '.snapshot')[0];
		e.style.backgroundImage = 'url("' + s.snapshots[s.snapshotIndex] + '")';
	}
	if (all || (flag & UPDATE_TITLE)) {
		e = $(se, '.title')[0];
		while(e.firstChild) {
			e.removeChild(e.firstChild);
		}
		e.appendChild(document.createElement('span')).appendChild(document.createTextNode(s.displayName));
	}
}

function insert(c, s) {
	var se = null;
	if (s.sites != undefined) { // folder
		// 
	} else {
		se = $.obj2Element(templates['site']);
		se.ondragstart = gDrag.onStart;
		updateSite(s, se);
		
		var cmds = {
			'a': clickLink,
			'.next-snapshot': nextSnapshot,
			'.remove': removeSite
		};
		for (var k in cmds) {
			var r = $(se, k)[0];
			r.onclick = cmds[k];
		}
	}

	if (se) {
		c.appendChild(se);
	}
}

function at(g, i) {
	if (g != -1) {
		alert('at(g, i) is to be implement for g is not -1');
	}
	var ses = $('.site');
	if (i < 0 || i >= ses.length) {
		return null;
	}
	return ses[i];
}

function indexOf(se) {
	var ses = $('.site');
	for (var i = 0, l = ses.length; i < l; ++ i) {
		if (se == ses[i]) {
			return i;
		}
	}
	return -1;
}

function indexFromNode(elem) {
	while (elem && !$.hasClass(elem, 'site')) {
		elem = elem.parentNode;
	}
	if (elem) {
		var i = indexOf(elem);
		if (i == -1) {
			alert("Can't get element index!");
			return null;
		}
		return [-1, i];
	}
	return null;
}

function clickLink(evt) {
	if (layout.inTransition() || $.hasClass(evt.target, 'button')) {
		return false;
	}

	var idxes = indexFromNode(this);
	var s = sm.getSite(idxes[0], idxes[1]);
	alert('you click ' + s.displayName);
	return false;
}

function removeSite() {
	var idxes = indexFromNode(this);
	if (idxes != null) {
		var g = idxes[0], i = idxes[1];
		var s = sm.getSite(g, i);
		if (s) {
			var str = getString('ssSiteRemovePrompt');
			str = xl.utils.template(str, s);
			if (confirm(str)) {
				sm.removeSite(g, i);
			}
		}
	}
	return false;
}

function nextSnapshot() {
	var idxes = indexFromNode(this);
	if (idxes != null) {
		var se = at(idxes[0], idxes[1]);
		if (se) {
			var snapshot = $(se, '.snapshot')[0];
			$.addClass(snapshot, 'snapshoting');
			snapshot.style.backgroundPosition = '-' + snapshot.clientWidth + 'px 0';
			snapshot.addEventListener('transitionend', function() {
				snapshot.removeEventListener('transitionend', arguments.callee, true);
	
				$.removeClass(snapshot, 'snapshoting');
				snapshot.style.backgroundPosition = snapshot.clientWidth + 'px 0';
				sm.nextSnapshot(idxes[0], idxes[1]);
	
				window.setTimeout(function() {
					$.addClass(snapshot, 'snapshoting');
					snapshot.style.backgroundPosition = '0 0';
					snapshot.addEventListener('transitionend', function() {
						snapshot.removeEventListener('transitionend', arguments.callee, true);
						$.removeClass(snapshot, 'snapshoting');
					}, true);
				}, 0);
			}, true);
		}
	}
	return false;
}

// event handlers
function onSiteAdded(evt, idx) {
	var c = $$('sites');
	insert(c, sm.getSite(-1, idx));
	layout.act();
}

function onSiteRemoved(evt, idxes) {
	var g = idxes[0], i = idxes[1];
	var se = at(g, i);
	if (se) {
		if (g != -1) {
			alert('Something need to do for ingourps removing');
		}
		if (se) {
			se.parentNode.removeChild(se);
			layout.act();
		}
	}
}

function onSiteSimpleMove(evt, fromTo) {
	var [f, t] = fromTo;
	document.title = f + ' vs ' + t;

	var ses = $('.site');
	var from = ses[f];

	var to = ses[t];
	var p = from.parentNode;
	p.removeChild(from);
	if (f > t) {
		p.insertBefore(from, to);
	} else {
		p.insertBefore(from, to.nextSibling);
	}

	layout.act();
}

function onSiteChanged(evt, idxes) {
	if (idxes[0] != -1) {
		// site in folder
	} else {
		// TODO: folder
		var s = sm.getSite(-1, idxes[1]);
		var se = at(idxes[0], idxes[1]);
		if (se) {
			updateSite(s, se);
		}
	}
}

function onSiteSnapshotChanged(evt, idxes) {
	if (idxes[0] != -1) {
		// site in folder
	} else {
		// TODO: folder?
		var s = sm.getSite(-1, idxes[1]);
		var se = at(idxes[0], idxes[1]);
		if (se) {
			updateSite(s, se, UPDATE_SNAPSHOT);
		}
	}
}


// dragging
var gDrag = (function() {
	var HOVER = 300;

	var elem = null;
	var offset = {x: 0, y: 0}; // offset of the site
	var activeIdxes =  null;

	var timeoutId = null;
	var savedIdxes = [-1, -1]; // saved for checking when timeout

	var topSiteCount = 0;

	function begin() {
		elem = null;
		offset = {x:0, y:0};
		activeIdxes = null;
		_clearTimeout();
		savedIdxes = [-1,-1];
	}

	function _clearTimeout() {
		if (timeoutId != null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}

	function inRect(x, y, l, t, w, h) {
		if (x >= l && x < (l + w) && y >= t && y < (t + h)) {
			return true;
		} else {
			return false;
		}
	}

	function getIndex(x, y) { // private function, return [g, i, is-insite]
		var inSite = false;
		var l = 0;
		for (var i = 1; i < layout.lines.length; ++ i, ++ l) {
			if (layout.lines[i] > y) {
				break;
			}
		}
		var col = cfg.getConfig('col');
		var b = l * col;
		var e = b + col;
		if (e > topSiteCount) {
			e = topSiteCount;
		}
		var ses = $('.site');
		if (ses.length != topSiteCount) {
			alert('ERR: topSiteCount != ss.length');
		}
		for (var i = b; i < e; ++ i) {
			var se = ses[i];
			if ($.hasClass(se, 'dragging')) { // skip myself
				continue;
			}

			var pos = $.offset(se);
			var w = se.offsetWidth;
			var h = se.offsetHeight;
			if (inRect(x, y, pos.left, pos.top, w, h)) {
				// inSite = true;
				// break;
			}

			if (pos.left > x) {
				break;
			}
		}

		return [-1, i, inSite];
	}
	
return {
	onStart: function(evt) {
		begin();

		var se = evt.target;
		elem = se;
		$.addClass(se, 'dragging');
		activeIdxes = indexFromNode(se);
		var s = activeIdxes != null ? sm.getSite(activeIdxes[0], activeIdxes[1]) : null;
		if (s != null) {
			var dt = evt.dataTransfer;
			dt.setData("text/uri-list", s.url);
			dt.setData("text/plain", s.url);
			dt.effectAllowed = 'move';
			var img = document.createElement('div');
			$.addClass(img, 'drag-elem');
			dt.setDragImage(img, 0, 0);

			var ss = $$('sites');
			var oft = $.offset(ss);
			offset.x = evt.clientX - (oft.left + (se.style.left.replace(/px/g, '') - 0) - window.scrollX);
			offset.y = evt.clientY - (oft.top + (se.style.top.replace(/px/g, '') - 0) - window.scrollY);

			topSiteCount = sm.getTopSiteCount();
		}
	},
	
	onEnter: function(evt) {
		if (elem) {
			evt.preventDefault();
			return false;
		}
	},
	
	onLeave: function(evt) {
		if (elem) {
			evt.preventDefault();
			return false;
		}
	},
	
	onOver: function(evt) {
		if (elem) {
			evt.preventDefault();
			evt.dataTransfer.dropEffect = "move";
			var el = elem;
			var w = el.offsetWidth;
			var h = el.offsetHeight;
			var base = $.offset($$('sites'));

			el.style.left = evt.clientX - offset.x - base.left + window.scrollX + 'px';
			el.style.top = evt.clientY - offset.y - base.top + window.scrollY + 'px';

			if (layout.inTransition()) {
				return false;
			}

			var [g, i, inSite] = getIndex(evt.clientX + window.scrollX, evt.clientY + window.scrollY);
			/*if (inSite) {
			} else */{
				if (g == activeIdxes[0]) { // in the same level
					var from = activeIdxes[1];
					var to = i;
					if (from < to) {
						-- to;
					}
					if (from == to) {
						_clearTimeout();
						return false;
					}
					if (g != savedIdxes[0] || to != savedIdxes[1]) {
						_clearTimeout(timeoutId);
						savedIdxes = [g, to];
						timeoutId = window.setTimeout(function() {
							timeoutId = null;
							savedIdxes = [-1, -1];

							if (g == -1) {
								log('begin to move ' + from + ' to ' + to);
								sm.simpleMove(from, to);
								activeIdxes[1] = to;
							} // TODO: g != -1
						}, HOVER);
					}
				}
			}

			return false;
		}
	},
	
	onDrop: function(evt) {
		if (elem) {
			evt.preventDefault();
			return false;
		}
	},
	
	onEnd: function(evt) {
		if (elem) {
			_clearTimeout(timeoutId);

			$.removeClass(elem, 'dragging');
			elem = null;
			layout.act();
		}
	}
};
})();



})(); //// sites end

var layout = (function() {
	var transitionElement = null;
	function _clearTransition() {
		if (transitionElement) {
			log('clear transition');
			transitionElement.removeEventListener('transitionend', _clearTransition, true);
			transitionElement = null;
		}
	}

	function _setTransition(se) {
		if (transitionElement == null) {
			log('now, in transition');

			transitionElement = se;
			se.addEventListener('transitionend', _clearTransition, true);
		}
	}

return {
	lines: [],
	inTransition: function() {
		return transitionElement != null;
	},

	clearTransition: _clearTransition,
	
	act: function() {
		var col = cfg.getConfig('col');
	
		var cw = document.body.clientWidth;
		if (cw < pageMinWidth) {
			cw = pageMinWidth;
		}

		this.lines = [];
		var ss = $$('sites');
		var baseY = $.offsetTop(ss);

	
		/** layout **
		  [ w/2] [  site  ] [ w/4 ] [site] ... [site] [ w/2 ]
		         |<-  w ->|
		 */
	
		var unit = Math.floor(cw / (3 + 5 * col ));
		var w = 4 * unit
		var h = Math.floor(w * ratio);
	
		var ses = $('.site');
		var x = 2 * unit;
		var y = 0;
		for (var i = 0, j = 0, l = ses.length; i < l; ++ i) {
			if (i % col == 0) {
				this.lines.push(y + baseY);
			}

			var se = ses[i];
			se.style.width = w + 'px';
			var snapshot = $(se, '.snapshot')[0];
			snapshot.style.height = h + 'px';

			if (!$.hasClass(se, 'dragging')) {
				var _t = y + 'px';
				var _l = x + 'px';
				if (!this.inTransition() && ((se.style.top && _t != se.style.top) || (se.style.left && _l != se.style.left))) {
					_setTransition(se);
				}
				se.style.top = _t;
				se.style.left = _l;
			}

			x += 5 * unit;
			++ j;
			if (j == col) {
				j = 0;
				x = 2 * unit;
				y += Math.floor(h + unit * ratio) + 12; // 12 is the title height (hardcoded)
			}
		}

		// update .site::height
		window.setTimeout(function() {
			for (var i = 0, j = 0, l = ses.length; i < l; ++ i) {
				var se = ses[i];
				var snapshot = $(se, '.snapshot')[0];
				se.style.height = snapshot.offsetHeight + 'px';
			}
		}, 0);
	}
}; // layout
})();


// methods
var urlDialogs = {};
function showAddSite() {
	var index = -1;
	if (urlDialogs[index] != null) {
		urlDialogs[index].focus();
	} else {
		var dlg = window.openDialog('chrome://superstart/content/url.xul',
			'',
			'chrome,dialog,dependent=yes,centerscreen=yes,resizable=yes', index, urlDialogs);
		urlDialogs[index] = dlg;
	}
}


// event handler
function onResize() {
	var ss = $$('sites');
	$.addClass(ss, 'notransition');
	layout.act();
	window.setTimeout(function() {
		$.removeClass(ss, 'notransition');
		layout.clearTransition(); // because there is no transition in the resizing procession, so we must clear the flag
	}, 0);
}

function onDblClick(e) {
	var t = e.target;
	if (t.tagName == 'HTML') {
		showAddSite();
	}
}



})();
