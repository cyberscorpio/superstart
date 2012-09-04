(function() {

const Cc = Components.classes;
const Ci = Components.interfaces;
Components.utils.import('resource://superstart/xl.js');
var SuperStart = $.getMainWindow().SuperStart;
var getString = SuperStart.getString;
var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
var ob = ssObj.getService(Ci.ssIObserverable);
var cfg = ssObj.getService(Ci.ssIConfig);
var sm = ssObj.getService(Ci.ssISiteManager);
ssObj = undefined;


window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);
	init();
}, false);

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

	layout.begin();
	$.removeClass(container, 'hidden');

	// register site events
	var smevts = {
		'site-added': onSiteAdded,
		'site-removed': onSiteRemoved,
		'site-simple-move': onSiteSimpleMove,
		'site-move-in': onSiteMoveIn,
		'site-move-out': onSiteMoveOut,
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

	var mask = $$('mask');
	mask.onclick = function() {
		closeFolder();
	};
	mask = null;

	window.addEventListener('unload', function() {
		window.removeEventListener('unload', arguments.callee, false);
		for (var k in smevts) {
			sm.unsubscribe(k, smevts[k]);
		}
		for (var k in devts) {
			document.removeEventListener(k, devts[k]);
		}
		var mask = $$('mask');
		mask.onclick = null;
	}, false);
}

var templates = {
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
						}
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
		},
	} // folder
};

function swapSiteItem(se, tmp) {
	var dragging = null;
	while (se.lastChild) {
		if ($.hasClass(se.lastChild, 'dragging')) {
			dragging = se.lastChild;
		}
		se.removeChild(se.lastChild);
	}
	while (tmp.firstChild) {
		se.appendChild(tmp.removeChild(tmp.firstChild));
	}
	if (dragging != null) {
		se.appendChild(dragging);
	}
}

var UPDATE_HINT = 1;
var UPDATE_URL = 2;
var UPDATE_SNAPSHOT = 4;
var UPDATE_TITLE = 8;
function updateSite(s, se, flag) {
	var updateAllFields = (flag === undefined);
	if ($.hasClass(se, 'folder')) {
		$.removeClass(se, 'folder');
		log('folder class has been removed! > ' + s.url);
		var tmp = createSiteElement(s);
		swapSiteItem(se, tmp);
	}
	var e = $(se, 'a')[0];
	if (updateAllFields || (flag & UPDATE_HINT)) {
		e.title = s.title || s.url;
	}
	if (updateAllFields || (flag & UPDATE_URL)) {
		e.href = s.url;
	}
	if (updateAllFields || (flag & UPDATE_SNAPSHOT)) {
		e = $(se, '.snapshot')[0];
		e.style.backgroundImage = 'url("' + s.snapshots[s.snapshotIndex] + '")';
	}
	if (updateAllFields || (flag & UPDATE_TITLE)) {
		e = $(se, '.title')[0];
		while(e.firstChild) {
			e.removeChild(e.firstChild);
		}
		e.appendChild(document.createElement('span')).appendChild(document.createTextNode(s.displayName));
	}
}

function updateFolder(ss, se) {
	assert(Array.isArray(ss.sites) && ss.sites.length > 1, "ERR: updateFolder get an invalid 'ss'");
	if (!$.hasClass(se, 'folder')) {
		$.addClass(se, 'folder');
		var tmp = createSiteElement(ss);
		swapSiteItem(se, tmp);
	}
	var e = $(se, 'a')[0];
	e.href = '#';
	var snapshot = $(se, '.snapshot')[0];
	while(snapshot.lastChild) {
		snapshot.removeChild(snapshot.lastChild);
	}
	for (var i = 0; i < ss.sites.length; ++ i) {
		var s = ss.sites[i];
		var img = document.createElement('img');
		img.src = s.snapshots[s.snapshotIndex];
		snapshot.appendChild(img);
	}
	e = $(se, '.title')[0];
	while(e.firstChild) {
		e.removeChild(e.firstChild);
	}
	var title = ss.displayName + ' (' + ss.sites.length + ')';
	e.appendChild(document.createElement('span')).appendChild(document.createTextNode(title));

	layout.begin(); // the little images in the folder needs to be re-layouted
}

/**
 * always insert into the end
 */
function insert(c, s) {
	var se = createSiteElement(s);
	if (se) {
		c.appendChild(se);
	}
}

function createSiteElement(s) {
	var se = $.obj2Element(templates['site']);
	se.ondragstart = gDrag.onStart;
	var cmd = {};

	if (s.sites != undefined) { // folder
		$.addClass(se, 'folder');
		updateFolder(s, se);

		cmds = {
			'a': clickLink
		};
	} else {
		updateSite(s, se);
		var buttons = ['remove', 'next-snapshot'];
		var a = $(se, 'a')[0];
		for (var i = 0; i < buttons.length; ++ i) {
			var b = document.createElement('div');
			b.className = buttons[i] + ' button';
			a.appendChild(b);
		}
		
		cmds = {
			'a': clickLink,
			'.next-snapshot': nextSnapshot,
			'.remove': removeSite
		};
	}

	// install the command handlers
	for (var k in cmds) {
		var r = $(se, k)[0];
		r.onclick = cmds[k];
	}
	return se;
}

/**
 * get the DIV from index g/i
 */
function at(g, i) {
	var ses = null;
	if (g != -1) {
		var fa = $$('folder');
		if (!fa || fa.idx != g) {
			return null;
		}
		ses = $(fa, '.site');
	} else {
		ses = $('#sites > .site');
	}

	if (i < 0 || i >= ses.length) {
		assert(false, 'at(' + g + ',' + i + ') out of range');
		return null;
	}
	return ses[i];
}

/**
 * get index g/i from the DIV
 */
function indexOf(se) {
	assert($.hasClass(se, 'site'), 'indexOf(se), se should has class name .site');

	var p = se.parentNode;
	var g = -1;
	var ses = [];
	if (p.id == 'folder') {
		g = p.idx;
		ses = $(p, '.site');
	} else if (p.id == 'sites') {
		ses = $(p, '.site');
	}

	for (var i = 0, l = ses.length; i < l; ++ i) {
		if (se == ses[i]) {
			return [g, i];
		}
	}

	assert(false, "indexOf(se) can't find index!");
	return [-1, -1]; // shouldn't happen
}

function elemFromNode(n) {
	while (n && !$.hasClass(n, 'site')) {
		n = n.parentNode;
	}
	return n;
}

/**
 * get index g/i from element of DIV
 */
function indexFromNode(n) {
	var elem = elemFromNode(n);
	if (elem) {
		return indexOf(elem);
	}
	return null;
}

function onClickFolder(idx, f) {
	var folderArea = $$('folder');
	if (folderArea == null) {
		openFolder(idx, f);
	} else {
		closeFolder();
	}
}

function openFolder(idx, f) {
	var se = at(-1, idx);
	se.draggable = false;
	var removeLastElem = false;
	if ($(se, '.dragging').length == 1) {
		removeLastElem = true; // the last item is just moved in, so it has already existed, however, we need the item to calc the height of the #folder, so we create a duplicated one, then remove it.
	}

	if (f === undefined) {
		f = sm.getSite(-1, idx);
	}

	var container = $$('container');
	var folderArea = $$('folder');
	assert(folderArea == null, "When opening the folder, the folderArea should be null");
	folderArea = document.createElement('div');
	folderArea.id = 'folder';
	folderArea.style.zIndex = 2;
	container.appendChild(folderArea);
	folderArea.idx = idx;
	$.addClass(folderArea, 'resizing');
	folderArea.addEventListener('transitionend', function() {
		this.removeEventListener('transitionend', arguments.callee, false);
		$.removeClass(this, 'resizing');
	}, false);

	for (var i = 0, l = f.sites.length; i < l; ++ i) {
		var s = f.sites[i];
		insert(folderArea, s);
	}

	var mask = $$('mask');
	mask.style.display = 'block';

	$.addClass(se, 'opened');

	layout.begin();

	// set 'container'.style.top so we can make the foler all been shown, if necessary and possible
	var exH = folderArea.offsetHeight;
	window.setTimeout(function() {
		var fa = $$('folder');
		var t = $.offsetTop(fa);
		var h = fa.style.height.replace(/px/g, '') - 0;// layout.act() will save the height in fa's style, so we can get it safely
		h += exH;
		if (h + t - window.pageYOffset > window.innerHeight) {
			var y = h + t - window.pageYOffset - window.innerHeight;
			if (y > (t - window.pageYOffset - 48)) {
				y = t - window.pageYOffset - 48;
			}
			var container = $$('container');
			container.style.top = '-' + y + 'px';
		}

		if (removeLastElem) {
			var ses = $(fa, '.site');
			fa.removeChild(ses[ses.length - 1]);
		}
	}, 0);
}

function closeFolder() {
	var folderArea = $$('folder');
	assert(folderArea != null, "When closing the folder, the folderArea shouldn't be null");

	folderArea.style.height = '0px';
	$.addClass(folderArea, 'resizing');
	folderArea.addEventListener('transitionend', function() {
		this.removeEventListener('transitionend', arguments.callee, false);
		this.parentNode.removeChild(this);
		$.addClass(this, 'resizing');

		$.removeClass(se, 'closing');
		se.draggable = true;

		var mask = $$('mask');
		mask.style.display = '';

		layout.begin();
	}, false);

	var idx = folderArea.idx;
	var se = at(-1, idx);
	se.draggable = false;
	$.removeClass(se, 'opened');
	$.addClass(se, 'closing');

	layout.begin();

	var container = $$('container');
	container.style.top = '0';
}

function clickLink(evt) {
	if (layout.inTransition() || $.hasClass(evt.target, 'button')) {
		return false;
	}

	var idxes = indexFromNode(this);
	var s = sm.getSite(idxes[0], idxes[1]);
	if (s.sites != undefined && Array.isArray(s.sites)) {
		assert(idxes[0] == -1, 'only top level sites can be folders');
		onClickFolder(idxes[1], s);
	} else {
		alert('you click ' + s.displayName);
	}
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
						snapshot.style.backgroundPosition = '';
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
	layout.begin();
}

function onSiteRemoved(evt, idxes) {
	var g = idxes[0], i = idxes[1];
	var se = at(g, i);
	if (se) {
		assert(g == -1, 'Something need to do for ingourps removing');
		if (se) {
			se.parentNode.removeChild(se);
			layout.begin();
		}
	}
}

function onSiteSimpleMove(evt, groupFromTo) {
	var [g, f, t] = groupFromTo;
	// document.title = f + ' vs ' + t;

	var from = at(g, f);
	var to = at(g, t);
	assert(from && to && from.parentNode == to.parentNode, 'onSimpleMove from and to should be in the same level');

	var p = from.parentNode;
	p.removeChild(from);
	if (f > t) {
		p.insertBefore(from, to);
	} else {
		p.insertBefore(from, to.nextSibling);
	}

	layout.begin();
}

function onSiteMoveIn(evt, fromTo) {
	var [f, t] = fromTo;
	var g = -1;
	var from = at(g, f);
	var to = at(g, t);
	assert($$('folder') == null, 'In MoveIn, #folder should not exist');

	if (t > f) {
		-- t;
	}

	from.parentNode.removeChild(from);
	if ($.hasClass(from, 'dragging')) {
		to.appendChild(from);
	}

	t = sm.getSite(-1, t);
	updateFolder(t, to);

	layout.begin();
}

function onSiteMoveOut(evt, idxes) {
	var [g, i] = idxes;
	var f = sm.getSite(-1, g);
	var s = sm.getSite(-1, sm.getTopSiteCount() - 1);
	var fe = at(-1, g);
	var se = at(g, i);

	// log('se: ' + se.innerHTML);
	if (f.sites == undefined) {
		updateSite(f, fe);
	} else {
		updateFolder(f, fe);
	}

	if (se && !$.hasClass(se, 'dragging')) {
		se.parentNode.removeChild(se);
		$$('sites').appendChild(se);
	}
	if (!se) {
		se = at(-1, sm.getTopSiteCount() - 1);
		if (!se) {
			insert($$('sites'), s);
		}
	}

	var folder = $$('folder');
	if (folder != null) {
		closeFolder();
	}

	layout.begin();
}

function onSiteChanged(evt, idxes) {
	var [g, i] = idxes;
	var s = sm.getSite(g, i);
	var se = at(g, i);

	if (g != -1) {
		// Update the parent folder (item)
		var f = sm.getSite(-1, g);
		var fe = at(-1, g);
		if (fe) {
			updateFolder(f, fe);
		}
	}

	if (!se) {
		return;
	}

	if (s.sites === undefined) {
		updateSite(s, se);
	} else {
		updateFolder(s, se);
	}
}

function onSiteSnapshotChanged(evt, idxes) {
	onSiteChanged(null, idxes);
}



// export methods to drag.js
gDrag.elemFromNode = elemFromNode;
gDrag.indexFromNode = indexFromNode;
gDrag.at = at;
gDrag.openFolder = openFolder;


})();
