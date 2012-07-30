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

/**** used for debug ****/
function log(s) {
	logger.logStringMessage(s);
}

function assert(condition, description) {
	if (!condition) {
		var debug = $('#debug');
		if (debug == null) {
			debug = document.createElement('div');
			debug.id = 'debug';
			debug.style.display = 'block';
			var container = $('#container');
			container.appendChild(debug);

			var ul = document.createElement('ul');
			debug.appendChild(ul);
		}
		var ul = $('#debug ul')[0];

		var li = document.createElement('li');
		var text = document.createTextNode(description);
		li.appendChild(text);
		ul.appendChild(li);
		// log('assert failed: ' + description);
	}
}

// global init
var gEvts = {
	'resize': onResize,
	'scroll': onScroll,
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

	layout.begin();
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

var UPDATE_HINT = 1;
var UPDATE_URL = 2;
var UPDATE_SNAPSHOT = 4;
var UPDATE_TITLE = 8;
function updateSite(s, se, flag) {
	var updateAllFields = (flag === undefined);
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
	assert(g == -1, 'at(g, i) is to be implement for g is not -1'); // TODO
	var ses = $('.site');
	if (i < 0 || i >= ses.length) {
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
	if (p.id != 'sites') {
		// TODO: Get the group index
		assert(false, 'TODO: get group index in indexOf(se)');
	} else {
		var ses = $(p, '.site');
		for (var i = 0, l = ses.length; i < l; ++ i) {
			if (se == ses[i]) {
				return [g, i];
			}
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

	var container = $$('container');
	var folderArea = $$('folder');
	assert(folderArea == null, "When opening the folder, the folderArea should be null");
	folderArea = document.createElement('div');
	folderArea.id = 'folder';
	folderArea.style.zIndex = 2;
	container.appendChild(folderArea);
	folderArea.idx = idx;

	for (var i = 0; i < f.sites.length; ++ i) {
		var s = f.sites[i];
		insert(folderArea, s);
	}

	var mask = $$('mask');
	mask.style.display = 'block';

	$.addClass(se, 'opened');

	layout.begin();

	// set 'container'.style.top so we can make the foler all been shown, if necessary and possible
	window.setTimeout(function() {
		var fa = $$('folder');
		var t = $.offsetTop(fa);
		var h = fa.style.height.replace(/px/g, '') - 0;//layout.act() will save the height in fa's style, so we can get it safely
		if (h + t - window.pageYOffset > window.innerHeight) {
			var y = h + t - window.innerHeight;
			if (y > (t - 32)) {
				y = t - 32;
			}
			var container = $$('container');
			container.style.top = '-' + y + 'px';
		}
	}, 0);
}

function closeFolder() {
	var folderArea = $$('folder');
	assert(folderArea != null, "When closing the folder, the folderArea shouldn't be null");

	folderArea.style.height = '0px';
	folderArea.addEventListener('transitionend', function() {
		this.removeEventListener('transitionend', arguments.callee, false);
		this.parentNode.removeChild(this);

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

	layout.begin();
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

	function init() {
		elem = null;
		offset = {x:0, y:0};
		activeIdxes = null;
		clrTimeout();
		savedIdxes = [-1,-1];
	}

	function clrTimeout() {
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

	function getIndex(x, y) { // return [g, i, is-insite]
		var inSite = false;
		var l = 0;
		var lines = layout.getLines();
		for (var i = 1; i < lines.length; ++ i, ++ l) {
			if (lines[i] > y) {
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
		assert(ses.length == topSiteCount, 'ERR: topSiteCount != ss.length');
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
		init();

		var se = elemFromNode(evt.target);
		if (!se || $.hasClass(se, 'opened') || !$.hasClass(se, 'site')) {
			// log('888 move: ' + se.className);
			evt.preventDefault();
			return false;
		}

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
			var base = $.offset(el.parentNode);

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
						clrTimeout();
						return false;
					}
					if (g != savedIdxes[0] || to != savedIdxes[1]) {
						clrTimeout(timeoutId);
						savedIdxes = [g, to];
						timeoutId = window.setTimeout(function() {
							timeoutId = null;
							savedIdxes = [-1, -1];

							if (g == -1) {
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
			clrTimeout(timeoutId);

			$.removeClass(elem, 'dragging');
			elem = null;
			layout.begin();
		}
	}
};
})();



})(); //// sites end

var layout = (function() {
	var transitionElement = null;
	var lines = [];

	function clrTransitionState() {
		if (transitionElement) {
			log('clear transition');
			transitionElement.removeEventListener('transitionend', clrTransitionState, true);
			transitionElement = null;
		}
	}

	function setTransitionState(se) {
		if (transitionElement == null) {
			log('now, in transition');
			transitionElement = se;
			se.addEventListener('transitionend', clrTransitionState, true);
		}
	}

	// 3 items per line
	// 3 items per column
	// < w > <  2w  > < w > <  2w  > < w > <  2w  > < w >
	function layoutFolderElement(se, cw, ch) {
		var snapshot = $(se, '.snapshot')[0];
		var w = cw;
		w /= 10;
		var h = w * ratio;
		var ww = Math.floor(w * 2);
		var hh = Math.floor(h * 2);
		var mh = Math.floor((ch - 3 * hh) / 4);
		w = Math.floor(w);
		h = Math.floor(h);
		
		var imgs = snapshot.getElementsByTagName('img');
		var x = w;
		var y = mh;
		for (var i = 0; i < imgs.length;) {
			var img = imgs[i];
			img.style.left = x + 'px';
			img.style.top = y + 'px';
			img.style.width = ww + 'px';
			img.style.height = hh + 'px';
			x += ww + w;

			++ i;
			if (i % 3 == 0) {
				x = w;
				y += hh + mh;
			}

		}
	}

	function calcSize(containerWidth, col) {
		/** layout **
		  [ w/2] [  site  ] [ w/4 ] [site] ... [site] [ w/2 ]
		         |<-  w ->|
		 */
		var unit = Math.floor(containerWidth / (3 + 5 * col ));
		var w = 4 * unit
		var h = Math.floor(w * ratio);
		return [unit, w, h];
	}

	function layoutFolderArea(col, ft) { 
		var folder = $$('folder');
		assert(folder != null, 'Try to layout the folder area, but it is nonexist');
		var [unit, w, h] = calcSize(folder.clientWidth, col);
		var ses = $(folder, '.site');

		// TODO: save the lines
		var lineCount = Math.floor(ses.length / col);
		if (ses.length % col) {
			++ lineCount;
		}

		var y = 32;
		for (var l = 0, i = 0; l < lineCount; ++ l) {
			var x = 2 * unit;

			for (var k = 0; k < col && i < ses.length; ++ k, ++ i) {
				var se = ses[i];
				se.style.width = w + 'px';
				var snapshot = $(se, '.snapshot')[0];
				snapshot.style.height = h + 'px';

				if (!$.hasClass(se, 'dragging')) {
					var top = y + 'px';
					var left = x + 'px';
					if (!layout.inTransition() && ((se.style.top && top != se.style.top) || (se.style.left && left != se.style.left))) {
						setTransitionState(se);
					}
					se.style.top = top;
					se.style.left = left;
				}

				x += 5 * unit;
			}
			y += Math.floor(h + unit * ratio) + 12; // 12 is the title height (hardcoded)
		}
		y += 20; // 32 - 12

		folder.style.height = y + 'px';
		folder.style.top = ft + 'px';


		return y;
	}

	function act() {
		var col = cfg.getConfig('col');
	
		var cw = window.innerWidth;//document.body.clientWidth;
		if (cw < pageMinWidth) {
			cw = pageMinWidth;
		}

		lines = [];
		var ss = $$('sites');
		var baseY = $.offsetTop(ss);

		var ses = $('#sites > .site');
		var y = 0;
		var lineCount = Math.floor(ses.length / col);
		if (ses.length % col > 0) {
			++ lineCount;
		}

		var [unit, w, h] = calcSize(cw, col);
		for (var l = 0, i = 0; l < lineCount; ++ l) {
			lines.push(y + baseY);
			var x = 2 * unit;
			var folderAreaHeight = 0;

			for (var k = 0; k < col && i < ses.length; ++ k, ++ i) {
				var se = ses[i];
				se.style.width = w + 'px';
				var snapshot = $(se, '.snapshot')[0];
				snapshot.style.height = h + 'px';

				if (!$.hasClass(se, 'dragging')) {
					var top = y + 'px';
					var left = x + 'px';
					if (!layout.inTransition() && ((se.style.top && top != se.style.top) || (se.style.left && left != se.style.left))) {
						setTransitionState(se);
					}
					se.style.top = top;
					se.style.left = left;
				}

				if ($.hasClass(se, 'folder')) {
					layoutFolderElement(se, w, h);

					if ($.hasClass(se, 'opened')) {
						var folderAreaTop = y + Math.floor(h + unit * ratio) + 12;
						folderAreaHeight = layoutFolderArea(col + 1, folderAreaTop);
						folderAreaHeight += 32;
					}
				}

				x += 5 * unit;
			}
			y += Math.floor(h + unit * ratio) + folderAreaHeight + 12; // 12 is the title height (hardcoded)
		}

		var mask = $$('mask');
		mask.style.height = window.innerHeight + 'px';

		// update .site::height
		window.setTimeout(function() {
			var ses = $('.site');
			for (var i = 0, j = 0, l = ses.length; i < l; ++ i) {
				var se = ses[i];
				var snapshot = $(se, '.snapshot')[0];
				se.style.height = snapshot.offsetHeight + 'px';
			}
		}, 0);
	}

	var actID = null;

var layout = {
	getLines: function() {
		return lines;
	},

	inTransition: function() {
		return transitionElement != null;
	},

	clearTransitionState: clrTransitionState,
	begin: function(actingNow) {
		if (actingNow) {
			if (actID) {
				window.clearTimeout(actID);
				actID = null;
			}
			act();
		} else {
			if (actID == null) {
				actID = window.setTimeout(function(){
					actID = null;
					act();
				}, 0);
			}
		}
	},
	
}; // layout
	return layout;
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
	layout.begin();
	window.setTimeout(function() {
		$.removeClass(ss, 'notransition');
		layout.clearTransitionState(); // No transition when resizing, say, the "transitioned" callback won't be called, so we clear it manually
	}, 0);
}

function onScroll() {
	var mask = $$('mask');
	mask.style.top = window.pageYOffset + 'px';
	mask.style.left = window.pageXOffset + 'px';
}

function onDblClick(e) {
	var t = e.target;
	if (t.tagName == 'HTML') {
		showAddSite();
	}
}



})();
