"use strict";
(function() {

var obevts = {
	'site-added': onSiteAdded,
	'site-removed': onSiteRemoved,
	'site-simple-move': onSiteSimpleMove,
	'site-move-in': onSiteMoveIn,
	'site-move-out': onSiteMoveOut,
	'site-changed': onSiteChanged,
	'site-snapshot-index-changed': onSiteSnapshotIndexChanged,
	'site-title-changed': onSiteTitleChanged
};
var cfgevts = { // to be called in onDOMLoaded
	'open-in-newtab': onOpenTypeChanged,
	'site-folder-show-size': onFolderShowSize,
	'site-buttons': onButtonShowHide,
	'site-buttons-newtab': onButtonShowHide,
	'site-buttons-refresh': onButtonShowHide,
	'site-buttons-config': onButtonShowHide,
	'site-buttons-remove': onButtonShowHide,
	'site-buttons-next-snapshot': onButtonShowHide
};
var wevts = {
	'dblclick': onDblClick,
	'keypress': onKeyPress
};
var devts = {
	'dragenter': gDrag.onEnter,
	'dragleave': gDrag.onLeave,
	'dragover': gDrag.onOver,
	'drop': gDrag.onDrop,
	'dragend': gDrag.onEnd
}
evtMgr.register([obevts, cfgevts], [wevts], [devts]);
evtMgr.clear(function() {
	var mask = $$('mask');
	mask.onclick = null;
});

evtMgr.ready(function() {
	var mask = $$('mask');
	mask.onclick = function() {
		closeFolder();
	};
	mask = null;

	var add = $$('nbb-add-site');
	add.onclick = function() { showAddSite(); };
	add.setAttribute('title', getString('ssSiteAddNew') + ' - ' + getString('ssSiteAddNewHint'));
	$.removeClass(add, 'hidden');

	// check the necessary statuses
	for (var k in cfgevts) {
		cfgevts[k](k, cfg.getConfig(k));
	}

	// all are OK, now we create the sites
	var sites = sm.getSites();
	var df = document.createDocumentFragment();
	for (var i = 0, l = sites.length; i < l; ++ i) {
		var s = sites[i];

		insert(df, s);
	}
	var container = $$('sites');
	container.appendChild(df);

	layout.layoutTopSites();

	$.removeClass(container, 'hidden');
});

var tmplMgr = (function() {
	var [tmplSite, tmplFolder] = (function() {
		function createBasicTmpl() {
			var tmpl = document.createElement('div');
			tmpl.className = 'site';
			tmpl.setAttribute('draggable', true);
				var a = document.createElement('a');
				a.setAttribute('draggable', false);
					var snapshot = document.createElement('div');
					snapshot.className = 'snapshot';
				a.appendChild(snapshot);
					var title = document.createElement('div');
					title.className = 'title';
						var img = document.createElement('img');
						title.appendChild(img);
						var text = document.createElement('p');
						text.className = 'text';
					title.appendChild(text);
				a.appendChild(title);
			tmpl.appendChild(a);
			return tmpl;
		}
		
		function initTmpl(buttons, titles) {
			var tmpl = createBasicTmpl();
			for (var i = 0; i < buttons.length; ++ i) {
				var b = document.createElement('div');
				b.className = buttons[i] + ' button';
				b.title = getString(titles[i]);
				tmpl.appendChild(b);
			}
			return tmpl;
		}

		var buttons = ['newtab', 'thistab', 'refresh', 'config', 'remove', 'next-snapshot'];
		var titles = ['ssSiteOpenInNewTab', 'ssSiteOpenInThisTab', 'ssSiteRefresh', 'ssSiteSetting', 'ssSiteRemove', 'ssSiteNextSnapshot'];
		var s = initTmpl(buttons, titles);
		buttons = ['refresh', 'newtab', 'config'];
		titles = ['ssFolderRefresh', 'ssFolderOpenAll', 'ssFolderConfig'];
		var f = initTmpl(buttons, titles);
		$.addClass(f, 'folder');
		return [s, f];
	}());
	
	function installCmdHandlers(se, cmds) {
		for (var k in cmds) {
			var r = $(se, k);
			if (r.length == 1) {
				r = r[0];
				r.onclick = cmds[k];
			}
		}
	
		se.ondragstart = gDrag.onStart;
		$(se, '.snapshot')[0].addEventListener('transitionend', layout.onSnapshotTransitionEnd, false);
	}
	
	function createAnEmptySite() {
		var se = tmplSite.cloneNode(true);
		var cmds = {
			'a': onLinkClick,
			'.next-snapshot': nextSnapshot,
			'.remove': removeSite,
			'.refresh': refreshSite,
			'.newtab': openInNewTab,
			'.thistab': openInThisTab,
			'.config': configSite
		};
		installCmdHandlers(se, cmds);
		return se;
	}
	
	function createAnEmptyFolder() {
		var se = tmplFolder.cloneNode(true);
		var cmds = {
			'a': onLinkClick,
			'.config': onFolderConfigClick,
			'.newtab': onFolderNewTabClick,
			'.refresh': refreshGroup
		};
		installCmdHandlers(se, cmds);
		return se;
	}

	function getTmpl(which) {
		if (which === 'site') {
			return tmplSite;
		} else if (which === 'folder') {
			return tmplFolder;
		}
		return null;
	}

	return {
		'createAnEmptySite': createAnEmptySite,
		'createAnEmptyFolder': createAnEmptyFolder,
		'getTmpl': getTmpl
	};
}());

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

function updateSite(s, se) {
	if ($.hasClass(se, 'folder')) {
		$.removeClass(se, 'folder');
		var tmp = createSiteElement(s);
		swapSiteItem(se, tmp);
	}
	var e = $(se, 'a')[0];
	e.title = s.title || s.url;
	e.href = s.url;

	e = $(se, '.snapshot')[0];
	setBackground(s, e);

	e = $(se, '.title img')[0];
	e.src = 'moz-anno:favicon:' + s.icon;

	e = $(se, '.text')[0];
	while(e.firstChild) {
		e.removeChild(e.firstChild);
	}
	e.appendChild(document.createTextNode(s.displayName));
}

function setFolderTitle(s, se) {
	var img = $(se, '.title > img')[0];
	img.src = 'chrome://global/skin/dirListing/folder.png';

	var e = $(se, '.text')[0];
	while(e.firstChild) {
		e.removeChild(e.firstChild);
	}
	var title = s.displayName || getString('ssFolderDefaultName');;
	e.appendChild(document.createTextNode(title));
	var size = document.createElement('span');
	size.className = 'folder-size';
	size.appendChild(document.createTextNode(' (' + s.sites.length + ')'));
	e.appendChild(size);
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
		var imgs = $(snapshot, 'img');
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
		onTimer();
	}, tm);

	function onTimer() {
		$.toggleClass(f, 'flash');
		count --;
		if (count > 0) {
			window.setTimeout(function() {
				onTimer();
			}, tm);
		} else {
			$.removeClass(f, 'flash');
		}
	}
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
	var se = null;
	if (s.sites != undefined) { // folder
		se = tmplMgr.createAnEmptyFolder();
		updateFolder(s, se);
	} else {
		se = tmplMgr.createAnEmptySite();
		updateSite(s, se);
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
	var folderArea = $$('folder');
	if (folderArea == null) {
		openFolder(idx, f);
	} else {
		closeFolder();
	}
}


function onFolderOpened(evt) {
	if (this == evt.target) {
		this.removeEventListener('transitionend', onFolderOpened, false);
		$.removeClass(this, 'resizing');
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

	folderArea.addEventListener('transitionend', onFolderOpened, false);

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

function onFolderClosed(evt) {
	if (this != evt.target) {
		return;
	}
	this.removeEventListener('transitionend', onFolderClosed, false);
	this.parentNode.removeChild(this); // FIXME: if you click a folder very quickly, 'this.parentNode' could be null ???
	$.addClass(this, 'resizing');

	$.removeClass(document.body, 'folder-closing');

	var idx = this.idx;
	var se = at(-1, idx);
	$.removeClass(se, 'closing');
	se.draggable = true;

	var mask = $$('mask');
	mask.style.display = '';

	layout.layoutTopSites();
}

function closeFolder() {
	var folderArea = $$('folder');

	folderArea.style.height = '0px';
	$.addClass(folderArea, 'resizing');
	folderArea.addEventListener('transitionend', onFolderClosed, false);

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
	if ($.hasClass(evt.target, 'button')) {
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

function configSite() {
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
	function onTransitionEnd(evt) {
		function onNewImageReady (evt) {
			if (this != evt.target) {
				return;
			}
			snapshot.removeEventListener('transitionend', onNewImageReady, true);
		}

		if (this != evt.target) {
			return;
		}
		snapshot.removeEventListener('transitionend', onTransitionEnd, true);
	
		sm.nextSnapshot(idxes[0], idxes[1]);
	
		snapshot.style.opacity = '1';
		snapshot.addEventListener('transitionend', onNewImageReady, true);
	}

	var idxes = indexFromNode(this);
	if (idxes != null) {
		var se = at(idxes[0], idxes[1]);
		if (se) {
			var snapshot = $(se, '.snapshot')[0];
			snapshot.style.opacity = '0';
			snapshot.addEventListener('transitionend', onTransitionEnd, true);
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

function onOpenTypeChanged(evt, openInNewtab) {
	if (openInNewtab) {
		$.addClass($$('sites'), 'newtab');
		$.addClass($$('folder'), 'newtab');
	} else {
		$.removeClass($$('sites'), 'newtab');
		$.removeClass($$('folder'), 'newtab');
	}
}

function onFolderShowSize(evt, show) {
	if (show) {
		$.removeClass($$('sites'), 'hide-folder-size');
	} else {
		$.addClass($$('sites'), 'hide-folder-size');
	}
}

function onButtonShowHide(evt, show) {
	var evt2classes = {
		'site-buttons-newtab': ['newtab', 'thistab'],
		'site-buttons-refresh': ['refresh'],
		'site-buttons-config': ['config'],
		'site-buttons-remove': ['remove'],
		'site-buttons-next-snapshot': ['next-snapshot']
	};

	if (evt === 'site-buttons') {
		if (show) {
			for (var k in evt2classes) {
				onButtonShowHide(k, cfg.getConfig(k));
			}
		} else {
			changeElementsClass('.button', '.site .button', 'add', 'hidden');
		}
	} else {
		var showAll = cfg.getConfig('site-buttons');
		show = showAll && show;
		evt2classes[evt].forEach(function(cls) {
			changeElementsClass('.' + cls, '.site .' + cls, show ? 'remove' : 'add', 'hidden');
		});
	}
}

/**
 * change class for elements in templates and the document
 */
function changeElementsClass(tmplSelector, selector, addOrRemove, cls) {
	['site', 'folder'].forEach(function(t) {
		var tmpl = tmplMgr.getTmpl(t);
		var elems = $(tmpl, tmplSelector);
		for (var i = 0; i < elems.length; ++ i) {
			if (addOrRemove === 'add') {
				$.addClass(elems[i], cls);
			} else if (addOrRemove === 'remove') {
				$.removeClass(elems[i], cls);
			}
		}
	});
	var elems = $(selector);
	for (var i = 0; i < elems.length; ++ i) {
		if (addOrRemove === 'add') {
			$.addClass(elems[i], cls);
		} else if (addOrRemove === 'remove') {
			$.removeClass(elems[i], cls);
		}
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

function onFolderConfigClick() {
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

function openGroupAll(g, idx) {
	var f = sm.getSite(g, idx);
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
	if (t.tagName == 'HTML' || t.id == 'navbar' || t.id == 'container' || t.id == 'sites') {
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

}());
