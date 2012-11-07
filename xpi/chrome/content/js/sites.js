(function() {
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://superstart/xl.js');
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

	var df = document.createDocumentFragment();
	for (var i = 0, l = sites.length; i < l; ++ i) {
		var s = sites[i];

		insert(df, s);
	}
	var container = $$('sites');
	container.appendChild(df);

	onOpenTypeChanged();

	layout.layoutTopSites();

	$.removeClass(container, 'hidden');

	// register site events
	var smevts = {
		'site-added': onSiteAdded,
		'site-removed': onSiteRemoved,
		'site-simple-move': onSiteSimpleMove,
		'site-move-in': onSiteMoveIn,
		'site-move-out': onSiteMoveOut,
		'site-changed': onSiteChanged,
		'site-snapshot-index-changed': onSiteSnapshotIndexChanged,
		'site-title-changed': onSiteTitleChanged,
		'open-in-newtab': onOpenTypeChanged
	};
	// register window events
	var wevts = {
		'dblclick': onDblClick,
		'keypress': onKeyPress
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
	for (var k in wevts) {
		window.addEventListener(k, wevts[k], false);
	}
	for (var k in devts) {
		document.addEventListener(k, devts[k], false);
	}

	var mask = $$('mask');
	mask.onclick = function() {
		closeFolder();
	};
	mask = null;

	var add = $$('nbb-add-site');
	add.onclick = function() { showAddSite(); };
	add.setAttribute('title', getString('ssSiteAddNew') + ' - ' + getString('ssSiteAddNewHint'));
	$.removeClass(add, 'hidden');

	window.addEventListener('unload', function() {
		window.removeEventListener('unload', arguments.callee, false);
		for (var k in smevts) {
			sm.unsubscribe(k, smevts[k]);
		}
		for (var k in wevts) {
			window.addEventListener(k, wevts[k], false);
		}
		for (var k in devts) {
			document.removeEventListener(k, devts[k], false);
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

function setBackground(s, snapshot) {
	if (s.useLastVisited && s.snapshotIndex == 0) {
		snapshot.style.backgroundSize = 'auto';
	} else {
		snapshot.style.backgroundSize = '';
	}
	snapshot.style.backgroundImage = 'url("' + s.thumbnail + '")';
}

var UPDATE_HINT = 1;
var UPDATE_URL = 2;
var UPDATE_SNAPSHOT = 4;
var UPDATE_TITLE = 8;
function updateSite(s, se, flag) {
	var updateAllFields = (flag === undefined);
	if ($.hasClass(se, 'folder')) {
		$.removeClass(se, 'folder');
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
		setBackground(s, e);
	}
	if (updateAllFields || (flag & UPDATE_TITLE)) {
		e = $(se, '.title')[0];
		while(e.firstChild) {
			e.removeChild(e.firstChild);
		}
		e.appendChild(document.createTextNode(s.displayName));
	}
}

function setFolderTitle(s, se) {
	var e = $(se, '.title')[0];
	while(e.firstChild) {
		e.removeChild(e.firstChild);
	}
	var title = s.displayName || getString('ssFolderDefaultName');;
	title += ' (' + s.sites.length + ')';
	e.appendChild(document.createTextNode(title));
}

function updateFolder(f, se) {
	if (!$.hasClass(se, 'folder')) {
		$.addClass(se, 'folder');
		var tmp = createSiteElement(f);
		swapSiteItem(se, tmp);
	} else { // createSiteElement wil call updateFolder()
		var e = $(se, 'a')[0];
		e.href = '#';
		var snapshot = $(se, '.snapshot')[0];
		var imgs = $(se, 'img');
		for (var i = imgs.length - 1; i >= 0; -- i) {
			imgs[i].parentNode.removeChild(imgs[i]);
		}
		for (var i = f.sites.length - 1; i >= 0; -- i) {
			var s = f.sites[i];
			var img = document.createElement('img');
			img.src = s.thumbnail;
			snapshot.insertBefore(img, snapshot.firstChild);
		}
	
		setFolderTitle(f, se);
	
		layout.setTopSiteSize(se);
		layout.layoutFolderElement(se);
	}
}

function flashFolder(f) {
	var count = 3;
	var tm = 100;
	$.addClass(f, 'flash');
	window.setTimeout(function() {
		$.toggleClass(f, 'flash');
		count --;
		if (count > 0) {
			window.setTimeout(arguments.callee, tm);
		} else {
			$.removeClass(f, 'flash');
		}
	}, tm);
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

function createEmptySiteElement() {
	return $.obj2Element(templates['site']);
}

function createSiteElement(s) {
	var se = $.obj2Element(templates['site']);
	se.ondragstart = gDrag.onStart;
	$(se, '.snapshot')[0].addEventListener('transitionend', layout.onSnapshotTransitionEnd, false);
	var buttons = [];
	var titles = [];
	var cmd = {};

	if (s.sites != undefined) { // folder
		$.addClass(se, 'folder');
		updateFolder(s, se);
		buttons = ['refresh', 'newtab', 'edit'];
		titles = ['ssFolderRefresh', 'ssFolderOpenAll', 'ssFolderConfig'];

		cmds = {
			'a': onLinkClick,
			'.edit': onFolderEditClick,
			'.newtab': onFolderNewTabClick,
			'.refresh': refreshGroup
		};
	} else {
		updateSite(s, se);
		buttons = ['newtab', 'thistab', 'refresh', 'edit', 'remove', 'next-snapshot'];
		titles = ['ssSiteOpenInNewTab', 'ssSiteOpenInThisTab', 'ssSiteRefresh', 'ssSiteSetting', 'ssSiteRemove', 'ssSiteNextSnapshot'];
		
		cmds = {
			'a': onLinkClick,
			'.next-snapshot': nextSnapshot,
			'.remove': removeSite,
			'.refresh': refreshSite,
			'.newtab': openInNewTab,
			'.thistab': openInThisTab,
			'.edit': editSite
		};
	}

	// create buttons
	for (var i = 0; i < buttons.length; ++ i) {
		var b = document.createElement('div');
		b.className = buttons[i] + ' button';
		b.title = getString(titles[i]);
		se.appendChild(b);
	}

	// install the command handlers
	for (var k in cmds) {
		var r = $(se, k);
		if (r.length == 1) {
			r = r[0];
			r.onclick = cmds[k];
		}
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
		return null;
	}
	return ses[i];
}

/**
 * get index g/i from the DIV
 */
function indexOf(se) {
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

function onFolderClick(idx, f) {
	if (layout.inTransition()) {
		return;
	}

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
	folderArea = document.createElement('div');
	folderArea.id = 'folder';
	container.appendChild(folderArea);
	folderArea.idx = idx;
	$.addClass(folderArea, 'resizing');
	if (cfg.getConfig('open-in-newtab')) {
		$.addClass(folderArea, 'newtab');
	}
	folderArea.addEventListener('transitionend', function(evt) {
		if (this == evt.target) {
			this.removeEventListener('transitionend', arguments.callee, false);
			$.removeClass(this, 'resizing');
		}
	}, false);

	var df = document.createDocumentFragment();
	for (var i = 0, l = f.sites.length; i < l; ++ i) {
		var s = f.sites[i];
		insert(df, s);
	}
	folderArea.appendChild(df);

	var mask = $$('mask');
	mask.style.display = 'block';

	$.addClass(document.body, 'folder-opened');
	$.addClass(se, 'opened');

	layout.layoutFolderArea();

	// set 'container'.style.top so we can make the foler all been shown, if necessary and possible
	var exH = folderArea.offsetHeight;
	window.setTimeout(function() {
		var fa = $$('folder');
		var t = $.offsetTop(fa);
		var h = parseInt(fa.style.height); // layout.act() will save the height in fa's style, so we can get it safely
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

	folderArea.style.height = '0px';
	$.addClass(folderArea, 'resizing');
	folderArea.addEventListener('transitionend', function(evt) {
		if (this != evt.target) {
			return;
		}
		this.removeEventListener('transitionend', arguments.callee, false);
		this.parentNode.removeChild(this);
		$.addClass(this, 'resizing');

		$.removeClass(document.body, 'folder-closing');
		$.removeClass(se, 'closing');
		se.draggable = true;

		var mask = $$('mask');
		mask.style.display = '';

		layout.layoutTopSites();
	}, false);

	var idx = folderArea.idx;
	var se = at(-1, idx);
	se.draggable = false;
	$.removeClass(document.body, 'folder-opened');
	$.removeClass(se, 'opened');
	$.addClass(document.body, 'folder-closing');
	$.addClass(se, 'closing');

	layout.layoutTopSites();

	var container = $$('container');
	container.style.top = '0';
}

function onLinkClick(evt) {
	if (layout.inTransition() || $.hasClass(evt.target, 'button')) {
		return false;
	}

	var idxes = indexFromNode(this);
	var s = sm.getSite(idxes[0], idxes[1]);
	if (s.sites != undefined && Array.isArray(s.sites)) {
		if (evt.ctrlKey || evt.metaKey) {
			openGroupAll(-1, idxes[1]);
		} else {
			onFolderClick(idxes[1], s);
		}
	} else {
		var inNewTab = cfg.getConfig('open-in-newtab');
		if (evt.ctrlKey || evt.metaKey) {
			inNewTab = !inNewTab;
		}
		if (s.url != null) {
			inNewTab ? $.getMainWindow().getBrowser().addTab(s.url) : document.location.href = s.url;
		}
	}
	return false;
}

function openInThisTab() {
	var idxes = indexFromNode(this);
	if (idxes != null) {
		var g = idxes[0], i = idxes[1];
		var s = sm.getSite(g, i);
		if (s.url != null) {
			document.location.href = s.url;
		}
	}
	return false;
}

function openInNewTab() {
	var idxes = indexFromNode(this);
	if (idxes != null) {
		var g = idxes[0], i = idxes[1];
		var s = sm.getSite(g, i);
		if (s.url != null) {
			$.getMainWindow().getBrowser().addTab(s.url);
		}
	}
	return false;
}

function editSite() {
	var idxes = indexFromNode(this);
	if (idxes != null) {
		var g = idxes[0], i = idxes[1];
		openUrlDialog(g, i);
	}
	return false;
}

function refreshSite() {
	var idxes = indexFromNode(this);
	if (idxes != null) {
		sm.refreshSite(idxes[0], idxes[1]);
	}
	return false;
}

function removeSite(evt) {
	var idxes = indexFromNode(this);
	if (idxes != null) {
		var g = idxes[0], i = idxes[1];
		var s = sm.getSite(g, i);
		if (s) {
			var str = getString('ssSiteRemovePrompt');
			str = str.replace(/%title%/g, s.title).replace(/%url%/g, s.url);
			if (evt.ctrlKey || evt.metaKey || confirm(str)) {
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
			snapshot.style.opacity = '0';
			snapshot.addEventListener('transitionend', function(evt) {
				if (this != evt.target) {
					return;
				}
				snapshot.removeEventListener('transitionend', arguments.callee, true);
	
				sm.nextSnapshot(idxes[0], idxes[1]);
	
				snapshot.style.opacity = '1';
				snapshot.addEventListener('transitionend', function(evt) {
					if (this != evt.target) {
						return;
					}
					snapshot.removeEventListener('transitionend', arguments.callee, true);
				}, true);
			}, true);
		}
	}
	return false;
}

// event handlers
function onSiteAdded(evt, idx) {
	var c = $$('sites');
	insert(c, sm.getSite(-1, idx));
	layout.layoutTopSites();
}

function onSiteRemoved(evt, idxes) {
	var g = idxes[0], i = idxes[1];
	if (g != -1) {
		var f = sm.getSite(-1, g);
		var fe = at(-1, g);
		if (f.sites == undefined) {
			if ($$('folder')) {
				closeFolder();
			}
			updateSite(f, fe);
			layout.setTopSiteSize(fe);
		} else {
			updateFolder(f, fe); // TODO optimize, many other places also needs to do so
		}
	}
	var se = at(g, i);
	if (se) {
		if (se) {
			se.parentNode.removeChild(se);
			if($('.folder.opened').length == 1) {
				layout.placeSitesInFolderArea();
			} else {
				layout.layoutTopSites(true);
			}
		}
	}
}

function simpleMoveHelper(from, to, f, t) {
	var p = from.parentNode;
	p.removeChild(from);
	if (f > t) {
		p.insertBefore(from, to);
	} else {
		p.insertBefore(from, to.nextSibling);
	}
}

function onSiteSimpleMove(evt, groupFromTo) {
	var [g, f, t] = groupFromTo;

	var from = at(g, f);
	var to = at(g, t);
	if (from && to) { // if the foler is not opened, from & to will be null
		simpleMoveHelper(from, to, f, t);
	}

	if (g == -1) {
		layout.layoutTopSites();
	} else {
		var se = at(-1, g);
		var imgs = $(se, 'img');
		from = imgs[f];
		to = imgs[t];
		simpleMoveHelper(from, to, f, t);
		layout.layoutFolderElement(se);

		if ($.hasClass(se, 'opened')) {
			layout.placeSitesInFolderArea();
		}
	}
}

function onSiteMoveIn(evt, fromTo) {
	var [f, t] = fromTo;
	var g = -1;
	var from = at(g, f);
	var to = at(g, t);

	if (t > f) {
		-- t;
	}

	from.parentNode.removeChild(from);
	if ($.hasClass(from, 'dragging')) {
		to.appendChild(from);
	}

	t = sm.getSite(-1, t);
	updateFolder(t, to);

	if (!gDrag.inDragging()) {
		layout.layoutTopSites();
	} else {
		flashFolder(to);
	}

	if ($$('folder') != null) {
		closeFolder();
	}
}

function onSiteMoveOut(evt, idxes) {
	var [g, i] = idxes;
	var f = sm.getSite(-1, g);
	var s = sm.getSite(-1, sm.getTopSiteCount() - 1);
	var fe = at(-1, g);
	var se = at(g, i);
	if (se == null) {
		var dragging = $('.dragging');
		if (dragging.length > 0) {
			se = dragging[0];
		}
	}

	if (f.sites == undefined) {
		updateSite(f, fe);
		layout.setTopSiteSize(fe);
	} else {
		updateFolder(f, fe);
	}

	if (se) {
		se.parentNode.removeChild(se);
		$$('sites').appendChild(se);
	} else {
		var sites = $$('sites');
		if ($(sites, '.site').length == sm.getTopSiteCount() - 1) {
			insert(sites, s);
		}
	}

	if ($$('folder') != null) {
		closeFolder();
	}

	if (!gDrag.inDragging()) {
		layout.layoutTopSites();
	}
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
			// updateFolder(f, fe);
			var imgs = $(fe, 'img');
			var img = imgs[i];
			img.src = s.thumbnail;
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

function onSiteSnapshotIndexChanged(evt, idxes) {
	var [g, i] = idxes;
	var s = sm.getSite(g, i);
	var se = at(g, i);

	if (g != -1) {
		// Update the parent folder (item)
		var f = sm.getSite(-1, g);
		var fe = at(-1, g);
		if (fe) {
			var imgs = $(fe, 'img');
			var img = imgs[i];
			img.src = s.thumbnail;
		}
	}

	if (!se) {
		return;
	}

	var snapshot = $(se, '.snapshot')[0];
	setBackground(s, snapshot);
}

function onSiteTitleChanged(evt, idxes) {
	var [g, i] = idxes;
	var s = sm.getSite(g, i);
	var se = at(g, i);
	if (s && se && s.sites && Array.isArray(s.sites)) {
		setFolderTitle(s, se);
	}
}

function onOpenTypeChanged(evt, value) {
	if (cfg.getConfig('open-in-newtab')) {
		$.addClass($$('sites'), 'newtab');
		$.addClass($$('folder'), 'newtab');
	} else {
		$.removeClass($$('sites'), 'newtab');
		$.removeClass($$('folder'), 'newtab');
	}
}

var urlDialogs = {};
function openUrlDialog(g, i) {
	var idxes = [g, i];
	var str = g + '-' + i;
	if (urlDialogs[str] != null) {
		urlDialogs[str].focus();
	} else {
		var dlg = window.openDialog('chrome://superstart/content/url.xul',
			'',
			'chrome,dialog,dependent=yes,centerscreen=yes,resizable=yes', idxes, urlDialogs);
		urlDialogs[str] = dlg;
	}
}

function showAddSite() {
	openUrlDialog(-1, -1);
}

function onFolderEditClick() {
	var idxes = indexFromNode(this);
	if (idxes != null) {
		var g = idxes[0], i = idxes[1];
		var f = sm.getSite(g, i);
		if (f && f.sites && Array.isArray(f.sites)) {
			window.openDialog('chrome://superstart/content/groupname.xul',
			'',
			'chrome,dialog,modal=yes,dependent=yes,centerscreen=yes,resizable=yes', g, i);
		}
	}
	return false;
}

function openGroupAll(g, i) {
	var f = sm.getSite(g, i);
	if (f && f.sites && Array.isArray(f.sites)) {
		for (var i = 0; i < f.sites.length; ++ i) {
			var s = f.sites[i];
			if (s.url != '') {
				$.getMainWindow().getBrowser().addTab(s.url);
			}
		}
	}
}

function onFolderNewTabClick() {
	var idxes = indexFromNode(this);
	if (idxes != null) {
		var g = idxes[0], i = idxes[1];
		openGroupAll(g, i);
	}
	return false;
}

function refreshGroup() {
	var idxes = indexFromNode(this);
	if (idxes != null) {
		var g = idxes[0], i = idxes[1];
		var f = sm.getSite(g, i);
		if (f && f.sites && Array.isArray(f.sites)) {
			if (confirm(getString('ssFolderRefreshAllConfirm'))) {
				sm.refreshSite(g, i);
			}
		}
	}
	return false;
}

function onDblClick(e) {
	var t = e.target;
	if (t.tagName == 'HTML' || t.id == 'navbar') {
		window.getSelection().removeAllRanges()
		showAddSite();
		return false;
	}
}

function onKeyPress(e) {
	var t = e.target;
	if (t.tagName != 'TEXTAREA') {
		if (e.keyCode == 27) { // ESC
			if ($$('folder')) {
				closeFolder();
			}
		}
	}
}

// export methods to drag.js
gDrag.elemFromNode = elemFromNode;
gDrag.indexFromNode = indexFromNode;
gDrag.at = at;
gDrag.openFolder = openFolder;
gDrag.closeFolder = closeFolder;

layout.createEmptySiteElement = createEmptySiteElement;


})();
