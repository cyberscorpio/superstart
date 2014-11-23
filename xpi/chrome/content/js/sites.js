"use strict";
var gSites = (function() {

var obevts = {
	'site-added': onSiteAdded,
	'site-removed': onSiteRemoved,
	'site-simple-move': onSiteSimpleMove,
	'site-move-in': onSiteMoveIn,
	'site-move-out': onSiteMoveOut,
	'site-changed': onSiteChanged,
	'site-snapshot-index-changed': onSiteSnapshotIndexChanged,
	'site-title-changed': onSiteTitleChanged,
	'sites-use-bg-effect': onUseBgEffect
};
var cfgevts = { // to be called in onDOMLoaded
	'sites-compact': onSitesCompactChanged,
	'sites-text-only': onSitesTextOnly,
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

	gSites = null;
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

	if (sites.length > 0) {
		layout.layoutTopSites();
	}
});

// create the templates
(function() {
	function createBasicTmpl() {
		var tmpl = document.createElement('div');
		tmpl.className = 'site';
		tmpl.setAttribute('draggable', true);
			var a = document.createElement('a');
			a.className = 'site-link';
			a.setAttribute('draggable', false);
				var snapshot = document.createElement('div');
				snapshot.className = 'site-snapshot';
			a.appendChild(snapshot);
				var title = document.createElement('div');
				title.className = 'site-title';
					var img = document.createElement('img');
					img.className = 'site-title-image';
					title.appendChild(img);
					var text = document.createElement('p');
					text.className = 'site-title-text';
						var name = document.createElement('span');
						name.className = 'site-title-name';
					text.appendChild(name);
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
	tmplMgr.addTmpl('site', s, {
		'a':              ['click',  onLinkClick],
		'.next-snapshot': ['click',  nextSnapshot],
		'.remove':        ['click',  removeSite],
		'.refresh':       ['click',  refreshSite],
		'.newtab':        ['click',  openInNewTab],
		'.thistab':       ['click',  openInThisTab],
		'.config':        ['click',  configSite],
		'':               ['dragstart', gDrag.onStart]
	});

	buttons = ['refresh', 'newtab', 'config'];
	titles = ['ssFolderRefresh', 'ssFolderOpenAll', 'ssFolderConfig'];
	var f = initTmpl(buttons, titles);
	$.addClass(f, 'folder');
	var size = document.createElement('span'); // folder 'size'
	size.className = 'site-title-folder-size';
	$$$(f, '.site-title p').appendChild(size);
	$.addClass($$$(f, '.site-snapshot'), 'folder-snapshot');
	tmplMgr.addTmpl('folder', f, {
		'a':              ['click', onLinkClick],
		'.config':        ['click', onFolderConfigClick],
		'.newtab':        ['click', onFolderNewTabClick],
		'.refresh':       ['click', refreshGroup],
		'':               ['dragstart', gDrag.onStart]
	});

	buttons = ['remove'];
	titles = ['ssSiteRemove'];
	var p = initTmpl(buttons, titles);
	$.addClass(p, 'placeholder');
	var icon = $$$(p, '.site-title-image');
	icon.parentNode.removeChild(icon);
	$.addClass($$$(p, '.site-snapshot'), 'placeholder-snapshot');
	tmplMgr.addTmpl('placeholder', p, {
		'a':              ['click',  onLinkClick],
		'.remove':        ['click',  removeSite],
		'':               ['dragstart', gDrag.onStart]
	});
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
	var e = $$$(se, 'a');
	e.title = s.title || s.url;
	e.href = s.url;

	e = $$$(se, '.site-snapshot');
	setBackground(s, e);

	e = $$$(se, '.site-title-image');
	e.src = 'moz-anno:favicon:' + s.icon;

	e = $$$(se, '.site-title-name');
	$.empty(e);
	e.appendChild(document.createTextNode(s.displayName));
}

function setFolderTitle(s, se) {
	$$$(se, '.site-title-image').src = 'chrome://global/skin/dirListing/folder.png';

	var name = $$$(se, '.site-title-name');
	$.empty(name);
	name.appendChild(document.createTextNode(s.displayName || getString('ssFolderDefaultName')));

	var size = $$$(se, '.site-title-folder-size');
	$.empty(size);
	size.appendChild(document.createTextNode(' (' + s.sites.length + ')'));
}

function updateFolder(f, se) {
	if (!$.hasClass(se, 'folder')) {
		$.addClass(se, 'folder');
		var tmp = createSiteElement(f);
		swapSiteItem(se, tmp);
	} else { // createSiteElement will call updateFolder()
		var e = $$$(se, 'a');
		e.href = '#';
		var snapshot = $$$(se, '.folder-snapshot');
		var imgs = $(snapshot, 'img');
		for (var i = imgs.length - 1; i >= 0; -- i) {
			imgs[i].parentNode.removeChild(imgs[i]);
		}
		for (var i = f.sites.length - 1; i >= 0; -- i) {
			var s = f.sites[i];
			var img = document.createElement('img');
			img.className = 'image-preview notransition';
			img.src = s.thumbnail;
			snapshot.insertBefore(img, snapshot.firstChild);
		}
		setFolderTitle(f, se);

		layout.setTopSiteSize(se);

		window.setTimeout(function() {
			var imgs = $(snapshot, '.image-preview');
			[].forEach.call(imgs, function(img) {
				$.removeClass(img, 'notransition');
			});
		}, 0);
	}
}

function flashFolder(f) {
	var count = 3;
	var tm = 100;
	var sn = $$$(f, '.folder-snapshot');
	$.addClass(sn, 'flash');
	window.setTimeout(function() {
		onTimer();
	}, tm);

	function onTimer() {
		$.toggleClass(sn, 'flash');
		count --;
		if (count > 0) {
			window.setTimeout(function() {
				onTimer();
			}, tm);
		} else {
			$.removeClass(sn, 'flash');
		}
	}
}

function updatePlaceholder(s, se) {
	var e = $$$(se, 'a');
	e.href = '#';
}

/**
 * always insert into the end
 */
function insert(c, s) {
	var se = createSiteElement(s);
	if (se) {
		c.appendChild(se);
	}
	return se;
}

function createSiteElement(s) {
	var se = null;
	if (s.sites != undefined) { // folder
		se = tmplMgr.getNode('folder');
		updateFolder(s, se);
	} else if (s.url == 'about:placeholder') {
		se = tmplMgr.getNode('placeholder');
		updatePlaceholder(s, se);
	} else {
		se = tmplMgr.getNode('site');
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
	if (evt && this != evt.target) {
		return true;
	}

	$.removeClass(this, 'resizing');
	var ses = $(this, '.site');
	for (var i = 0; i < ses.length; ++ i) {
		$.removeClass(ses[i], 'notransition');
	}
}

function openFolder(idx, f) {
	var se = at(-1, idx);
	se.draggable = false;
	var removeLastElem = false;
	var dragging = $$$(se, '.dragging');
	if (dragging) {
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

	evtMgr.once(folderArea, 'transitionend', onFolderOpened, 500);

	var df = document.createDocumentFragment();
	for (var i = 0, l = f.sites.length; i < l; ++ i) {
		var s = f.sites[i];
		var subse = insert(df, s);
		$.addClass(subse, 'in-folder');
		$.addClass(subse, 'notransition');
	}
	folderArea.appendChild(df);

	var mask = $$('mask');
	$.removeClass(mask, 'hidden');

	$.addClass(document.body, 'folder-opened');
	$.addClass(se, 'opened');
	onUseBgEffect('sites-use-bg-effect', cfg.getConfig('sites-use-bg-effect'));
	onOpenCloseFolder(true);

	layout.layoutFolderArea();

	// set 'container'.style.top so we can make the foler all been shown, if necessary and possible
	var exH = folderArea.offsetHeight;
	window.setTimeout(function() {
		var fa = $$('folder');
		var t = $.getPosition(fa).top;
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
			var last = ses[ses.length - 1];
			dragging['pos'] = last.pos;
			fa.removeChild(last);
		}
	}, 0);
}

function onFolderClosed(evt) {
	if (evt && this != evt.target) {
		return true;
	}
	this.parentNode.removeChild(this); // FIXME: if you click a folder very quickly, 'this.parentNode' could be null ???
	$.removeClass(this, 'resizing');

	$.removeClass(document.body, 'folder-closing');

	var idx = this.idx;
	var se = at(-1, idx);
	$.removeClass(se, 'closing');
	se.draggable = true;

	var mask = $$('mask');
	$.addClass(mask, 'hidden');
	onUseBgEffect('sites-use-bg-effect', cfg.getConfig('sites-use-bg-effect'));
	onOpenCloseFolder(false);

	layout.layoutTopSites();

	var container = $$('container');
	container.style.top = '0';
}

function closeFolder() {
	var folderArea = $$('folder');

	folderArea.style.height = '0px';
	$.addClass(folderArea, 'resizing');
	evtMgr.once(folderArea, 'transitionend', onFolderClosed, 500);

	var idx = folderArea.idx;
	var se = at(-1, idx);
	se.draggable = false;
	$.removeClass(document.body, 'folder-opened');
	$.removeClass(se, 'opened');
	$.addClass(document.body, 'folder-closing');
	$.addClass(se, 'closing');

	layout.layoutTopSites();

	/*
	var container = $$('container');
	container.style.top = '0';
	*/
}

function onLinkClick(evt) {
	var idxes = indexFromNode(this);
	var s = sm.getSite(idxes[0], idxes[1]);
	if (s.sites != undefined && Array.isArray(s.sites)) {
		if (evt.ctrlKey || evt.metaKey || evt.button === 1) {
			openGroupAll(-1, idxes[1]);
		} else {
			onFolderClick(idxes[1], s);
		}
	} else {
		if (s.url != null && s.url != 'about:placeholder') {
			var wm = $.getMainWindow();
			var tb = wm.getBrowser();
			if (evt.shiftKey) {
				tb.selectedTab = addTab(tb, s.url);
			} else {
				var inNewTab = cfg.getConfig('open-in-newtab');
				if (evt.ctrlKey || evt.metaKey || evt.button === 1) {
					inNewTab = !inNewTab;
				}
				// inNewTab ? addTab(tb, s.url) : document.location.href = s.url;
				if (inNewTab) {
					addTab(tb, s.url);
				} else {
					if (cfg.getConfig('multiprocess') && wm.openUILinkIn) {
						wm.openUILinkIn(s.url, 'current');
					} else {
						document.location.href = s.url;
					}
				}
			}
		}
	}
	evt.preventDefault();
	evt.stopPropagation();
	return false;
}

function addTab(tb, url) {
	var newTab = tb.addTab(url);
	if (cfg.getConfig('open-in-newtab-near-me')) {
		var i = tb.tabContainer.getIndexOfItem(tb.selectedTab);
		tb.moveTabTo(newTab, i + 1);
	}
	return newTab;
}

function getLinkFromElem(elem) {
	var idxes = indexFromNode(elem);
	if (idxes != null) {
		var g = idxes[0], i = idxes[1];
		var s = sm.getSite(g, i);
		if (s.url != null && s.url != 'about:placeholder') {
			return s.url;
		}
	}
	return null;
}

function openInThisTab(evt) {
	var link = getLinkFromElem(this);
	if (link) {
		document.location.href = link;
	}
	return false;
}

function openInNewTab(evt) {
	var link = getLinkFromElem(this);
	if (link) {
		var tb = $.getMainWindow().getBrowser();
		if (evt.shiftKey) {
			tb.selectedTab = addTab(tb, link);
		} else {
			addTab(tb, link);
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
			var se = at(g, i);
			var isPlaceholder = s.url === 'about:placeholder';
			var str = getString('ssSiteRemovePrompt');
			str = str.replace(/%title%/g, s.title).replace(/%url%/g, s.url);
			if (isPlaceholder) {
				str = getString('ssSitePlaceholderPrompt');
				$.addClass(se, 'show-placeholder');
			}
			if (evt.ctrlKey || evt.metaKey || confirm(str)) {
				sm.removeSite(g, i);
			} else if (isPlaceholder) {
				$.removeClass(se, 'show-placeholder');
			}
			se = undefined;
		}
	}
	return false;
}

function nextSnapshot() {
	var idxes = indexFromNode(this);
	if (idxes != null) {
		var se = at(idxes[0], idxes[1]);
		if (se) {
			var sn = $$$(se, '.site-snapshot');
			$.flip(sn, function() {
				sm.nextSnapshot(idxes[0], idxes[1]);
			});
		}
	}
	return false;
}

var showAllPlaceholders = (function() {
	var tmid = null;
	function hide() {
		tmid = null;
		var phs = $('.placeholder');
		[].forEach.call(phs, function(ph) {
			$.removeClass(ph, 'show-placeholder');
		});
	}

	function show() {
		var phs = $('.placeholder');
		[].forEach.call(phs, function(ph) {
			$.addClass(ph, 'show-placeholder');
		});
		if (tmid !== null) {
			window.clearTimeout(tmid);
		}
		tmid = window.setTimeout(hide, 2000);
	}
	return show;
}());

// event handlers
function onSiteAdded(evt, idx) {
	var s = sm.getSite(-1, idx);
	var se = insert($$('sites'), s);

	layout.layoutTopSites();

	$.addClass(se, 'notransition');
	window.setTimeout(function(){
		$.removeClass(se, 'notransition');
	}, 0);

	if (s.url === 'about:placeholder') {
		showAllPlaceholders();
	}

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

			if ($.hasClass(se, 'placeholder')) {
				showAllPlaceholders();
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
	var from = at(-1, f);
	var to = at(-1, t);

	if (t > f) {
		-- t;
	}

	t = sm.getSite(-1, t);
	updateFolder(t, to);

	from.parentNode.removeChild(from);
	if ($.hasClass(from, 'dragging')) {
		to.insertBefore(from, to.firstChild);
		$.addClass(from, 'in-folder');
	}

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
		se = $$$('.dragging');
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
		$.removeClass(se, 'in-folder');
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

	var snapshot = $$$(se, '.site-snapshot');
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

function onUseBgEffect(evt, ube) {
	var opened = $('.folder.opened');
	var nsp = {'site': '', 'folder': '', 'placeholder': ''};
	if (opened.length > 0 && ube) {
		$.addClass(mask, 'grayed');
		tmplMgr.changeElementsClass(nsp, '.site', 'add', 'grayed');
	} else {
		if ($.hasClass(mask, 'grayed')) {
			$.removeClass(mask, 'grayed');
			tmplMgr.changeElementsClass(nsp, '.site', 'remove', 'grayed');
		}
	}
}

function onOpenCloseFolder(isOpen) {
	var nsp = {'site': '', 'folder': '', 'placeholder': ''};
	if (isOpen) {
		tmplMgr.changeElementsClass(nsp, '.site', 'add', 'not-opened');
		var opened = $$$('.site.opened');
		if (opened) {
			$.removeClass(opened, 'not-opened');
		}
		$.addClass($$('bg'), 'folder-opened');
	} else {
		tmplMgr.changeElementsClass(nsp, '.site', 'remove', 'not-opened');
		$.removeClass($$('bg'), 'folder-opened');
	}
}

function onSitesCompactChanged(evt, compact) {
	var nsp = {'site': '', 'folder': '', 'placeholder': ''};
	tmplMgr.changeElementsClass(nsp, '.site', compact ? 'add' : 'remove', 'compact-mode');
	['margin-helper', 'site-helper'].forEach(function(id) {
		var elem = $$(id);
		compact ? $.addClass(elem, 'compact-mode') : $.removeClass(elem, 'compact-mode');
	});
}

function onSitesTextOnly(evt, textonly) {
	var nsps = [
		{'site': '', 'folder': '', 'placeholder': ''},
		{'site': '.site-snapshot', 'folder': '.site-snapshot', 'placeholder': '.site-snapshot'},
		{'site': '.site-title', 'folder': '.site-title', 'placeholder': '.site-title'},
		{'site': '.site-title-image', 'folder': '.site-title-image'},
		{'site': '.button', 'folder': '.button', 'placeholder': '.button'}
	];
	var sels = [
		'.site',
		'.site-snapshot',
		'.site-title',
		'.site-title-image',
		'.button'
	];
	for (var i = 0; i < nsps.length; ++ i) {
		tmplMgr.changeElementsClass(nsps[i], sels[i], textonly ? 'add' : 'remove', 'text-only');
	};
}

function onOpenTypeChanged(evt, openInNewtab) {
	tmplMgr.changeElementsClass({'site': '.button.newtab'}, '.site:not(.folder) .button.newtab', openInNewtab ? 'add' : 'remove', 'open-in-newtab');
	tmplMgr.changeElementsClass({'site': '.button.thistab'}, '.site:not(.folder) .button.thistab', openInNewtab ? 'add' : 'remove', 'open-in-newtab');
}

function onFolderShowSize(evt, show) {
	var nsp = {'site': '.site-title-folder-size', 'folder': '.site-title-folder-size'}
	tmplMgr.changeElementsClass(nsp, '.site-title-folder-size', show ? 'remove' : 'add', 'hidden');
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
			tmplMgr.changeElementsClass({'site': '.button', 'folder': '.button', 'placeholder': '.button'}, '.site .button', 'add', 'hidden');
		}
	} else {
		var showAll = cfg.getConfig('site-buttons');
		show = showAll && show;
		evt2classes[evt].forEach(function(cls) {
			var nsp = {'site': '.' + cls, 'folder': '.' + cls, 'placeholder': '.' + cls};
			tmplMgr.changeElementsClass(nsp, '.site .' + cls, show ? 'remove' : 'add', 'hidden');
		});
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
	var tag = t.tagName;
	var id = t.id;
	var inPlaceholder = false;

	while(t && t.classList) {
		if ($.hasClass(t, 'placeholder')) {
			inPlaceholder = true;
			break;
		}
		t = t.parentNode; // TODO: for such case, can we change a placeholder into a normal site?
	}

	if (tag == 'HTML' || id == 'bg' || id == 'bg-mask' || id == 'navbar' || id == 'container' || id == 'sites' || inPlaceholder) {
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

// methods exported (for drag)
return {
	'elemFromNode': elemFromNode,
	'indexFromNode': indexFromNode,
	'at': at,
	'openFolder': openFolder
}

}());
