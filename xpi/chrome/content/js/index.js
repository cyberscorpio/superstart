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
		// sm.nextSnapshot(idxes[0], idxes[1]);
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
		p.insertBefore(from, to.nextSibling); // TODO make it more stable?
	}

	layout.act();

}

function onSiteChanged(evt, idxes) {
	if (idxes[0] != -1) {
		// site in folder
	} else {
		// TODO: folder?
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
	function getIndex(x, y) { // private function
		var l = 0;
		for (var i = 1; i < layout.lines.length; ++ i, ++ l) {
			if (layout.lines[i] > y) {
				break;
			}
		}
		var col = cfg.getConfig('col');
		var b = l * col;
		var e = b + col;
		if (e > gDrag.topSiteCount) {
			e = gDrag.topSiteCount;
		}
		var ses = $('.site');
		if (ses.length != gDrag.topSiteCount) {
			alert('gDrag.topSiteCount != ss.length');
		}
		for (var i = b; i < e; ++ i) {
			if ($.offsetLeft(ses[i]) > x) {
				break;
			}
		}
		if (i != b) {
			-- i;
		}
		if (i < 0) {
			alert("i shouldn't < 0: i = " + i);
			i = 0;
		}
		return [-1, i];
	}
	
return {
	elem: null,
	offset: {x: 0, y: 0}, // offset of the site
	idxes: null, // index of the selected site
	topSiteCount: 0,
	pause: false,

	onStart: function(evt) {
		var se = evt.target;
		gDrag.elem = se;
		$.addClass(se, 'dragging');
		gDrag.idxes = indexFromNode(se);
		var s = gDrag.idxes != null ? sm.getSite(gDrag.idxes[0], gDrag.idxes[1]) : null;
		if (s != null) {
			var dt = evt.dataTransfer;
			dt.setData("text/uri-list", s.url);
			dt.setData("text/plain", s.url);
			dt.effectAllowed = 'move';
			var img = document.createElement('div');
			$.addClass(img, 'drag-elem');
			dt.setDragImage(img, 0, 0);

			//
			var ss = $$('sites');
			var x = $.offsetLeft(ss) + (se.style.left.replace(/px/g, '') - 0);
			var y = $.offsetTop(ss) + (se.style.top.replace(/px/g, '') - 0);
			x -= window.scrollX;
			y -= window.scrollY;
			gDrag.offset.x = evt.clientX - x;
			gDrag.offset.y = evt.clientY - y;

			gDrag.topSiteCount = sm.getTopSiteCount();
		}
	},
	
	onEnter: function(evt) {
		if (gDrag.elem) {
			evt.preventDefault();
			return false;
		}
	},
	
	onLeave: function(evt) {
		if (gDrag.elem) {
			evt.preventDefault();
			return false;
		}
	},
	
	onOver: function(evt) {
		if (gDrag.elem) {
			evt.preventDefault();
			evt.dataTransfer.dropEffect = "move";
			var el = gDrag.elem;
			var w = el.clientWidth;
			var h = $(el, '.snapshot')[0].clientHeight;
			var ss = $$('sites');
			el.style.left = evt.clientX - gDrag.offset.x - $.offsetLeft(ss) + window.scrollX + 'px';
			el.style.top = evt.clientY - gDrag.offset.y - $.offsetTop(ss) + window.scrollY + 'px';

			if (!gDrag.pause) {
				var [g, i] = getIndex(evt.clientX + window.scrollX, evt.clientY + window.scrollY);
				if (g != gDrag.idxes[0] || i != gDrag.idxes[1]) {
					if (g == -1) {
						log('begin to move ' + gDrag.idxes[1] + ' to ' + i);
						sm.simpleMove(gDrag.idxes[1], i);
						gDrag.idxes[1] = i;
						gDrag.pause = true;
						window.setTimeout(function() {
							gDrag.pause = false;
						}, 1000);
					}
				}
			}

			return false;
		}
	},
	
	onDrop: function(evt) {
		if (gDrag.elem) {
			evt.preventDefault();
			return false;
		}
	},
	
	onEnd: function(evt) {
		if (gDrag.elem) {
			$.removeClass(gDrag.elem, 'dragging');
			gDrag.elem = null;
			layout.act();
		}
	}
};
})();



})(); //// sites end

var layout = {
	lines: [],
	
	act : function() {
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
				se.style.top = y + 'px';
				se.style.left = x + 'px';
			}

			x += 5 * unit;
			++ j;
			if (j == col) {
				j = 0;
				x = 2 * unit;
				y += Math.floor(h + unit * ratio) + 12; // 12 is the title height (hardcoded)
			}
		}
	}
}; // layout


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
	}, 0);
}

function onDblClick(e) {
	var t = e.target;
	if (t.tagName == 'HTML') {
		showAddSite();
	}
}



})();
