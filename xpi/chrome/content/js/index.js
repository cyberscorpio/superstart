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
	sitesPerLine = cfg.getConfig('site-perline');
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

	layout();
	$.removeClass(container, 'hidden');

	// register site events
	var smevts = {
		'site-added': onSiteAdded,
		'site-removed': onSiteRemoved,
		'site-changed': onSiteChanged,
		'site-snapshot-changed': onSiteSnapshotChanged
	};
	// register document events
	var devts = {
		'dragenter': onDragEnter,
		'dragleave': onDragLeave,
		'dragover': onDragOver,
		'drop': onDrop,
		'dragend': onDragEnd
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
		]
	},
	'folder': {
		'tag': 'div',
		'attr': {
			'class': 'site folder'
		}
	}
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
		se.ondragstart = onDragStart;
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
	var ss = $('.site');
	for (var i = 0, l = ss.length; i < l; ++ i) {
		if (se == ss[i]) {
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
	layout();
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
			layout();
		}
	}
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
var count = 0;
function onDragStart(evt) {
	count = 0;

	var se = evt.target;
	seDragging = se;
	$.addClass(seDragging, 'dragging');
	var idxes = indexFromNode(se);
	var s = sm.getSite(idxes[0], idxes[1]);
	if (s != null) {
		var dt = evt.dataTransfer;
		dt.setData("text/uri-list", s.url);
		dt.setData("text/plain", s.url);
		// dt.effectAllowed = 'none';

		var img = document.createElement('div');
		$.addClass(img, 'drag-elem');

		dt.setDragImage(img, 0, 0);
	}
}

function onDragEnter(evt) {
	if (seDragging) {
		evt.preventDefault();
		return false;
	}
}

function onDragLeave(evt) {
	if (seDragging) {
		evt.preventDefault();
		return false;
	}
}

function onDragOver(evt) {
	if (seDragging) {
		document.title = evt.clientX + ':' + evt.clientY + '---' + count;
		count ++;
		var w = seDragging.clientWidth;
		var h = $(seDragging, '.snapshot')[0].clientHeight;
		seDragging.style.left = evt.clientX - (w / 2) + 'px';
		seDragging.style.top = evt.clientY - (h / 2) + 'px';
		evt.preventDefault();
		return false;
	}
}

function onDrop(evt) {
	if (seDragging) {
		alert('dropped!');
		evt.preventDefault();
		return false;
	}
}

function onDragEnd(evt) {
	if (seDragging) {
		$.removeClass(seDragging, 'dragging');
		seDragging = null;
		layout();
		alert('end!');
	}
}



})(); //// sites end

var seDragging = null;

function layout() {
	var row = cfg.getConfig('row');
	var col = cfg.getConfig('col');

	var cw = document.body.clientWidth;
	if (cw < pageMinWidth) {
		cw = pageMinWidth;
	}

	/** layout **
	  [ w/2] [site] [ w/4 ] [site] ... [site] [ w/2 ]
	 */

	var unit = Math.floor(cw / (3 + 5 * col ));
	var w = 4 * unit
	var h = Math.floor(w * ratio);

	var ses = $('.site');
	var x = 2 * unit;
	var y = 0;
	for (var i = 0, j = 0, l = ses.length; i < l; ++ i) {
		var se = ses[i];
		se.style.width = w + 'px';
		var snapshot = $(se, '.snapshot')[0];
		snapshot.style.height = h + 'px';
		// se.style.height = h + 'px';
		if (se != seDragging) {
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
	layout();
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
