// dragging
var gDrag = (function() {

const Cc = Components.classes;
const Ci = Components.interfaces;
var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
var cfg = ssObj.getService(Ci.ssIConfig);
var sm = ssObj.getService(Ci.ssISiteManager);
ssObj = undefined;

const HOVER = 500;

var elem = null;
var offset = {x: 0, y: 0}; // offset of the site
var dragIdxes = null;

var timeoutId = null;
var saved = {idxes:[-1,-1], inSite:false}; // saved for checking when timeout

var x = 0;
var y = 0;

function init() {
	elem = null;
	offset = {x:0, y:0};
	dragIdxes = null;
	clrTimeout();
	saved = {idxes:[-1,-1], inSite:false};
	x = y = 0;
}

function clrTimeout() {
	if (timeoutId != null) {
		clearTimeout(timeoutId);
		timeoutId = null;
	}
}

function moveElem(el, x, y) { // move the element to follow the cursor (x, y), "offset" should be set in "onStart".
	var w = el.offsetWidth;
	var h = el.offsetHeight;
	var base = $.offset(el.parentNode);

	el.style.left = x - offset.x - base.left + window.scrollX + 'px';
	el.style.top = y - offset.y - base.top + window.scrollY + 'px';
}

function getIndex(x, y) { // return [g, i, is-insite], return [-1, -1, ] means the folder is opened, but the item is not in mask
	var inSite = false;
	var l = 0;
	var lines = null;

	// first, whether the folder is opened?
	var folderArea = $$('folder');
	var sites = $$('sites');
	var par = sites;
	var g = -1;
	if (folderArea != null) {
		lines = folderArea.lines;
		assert(lines != undefined && Array.isArray(lines), '#folder.lines should be set in dragging');
		var folder = $('.folder.opened');
		assert(folder.length == 1, 'Only one folder can be opened');
		folder = folder[0];
		var idxes = indexOf(folder);
		if ($.inElem(x, y, folder)) {
			return [-1, idxes[1], true];
		} else if (!$.inElem(x, y, folderArea)) {
			return [-1, -1, false];
		}

		g = idxes[1];
		par = folderArea;
	} else {
		lines = sites.lines;
		assert(lines != undefined && Array.isArray(lines), '#sites.lines should be set in dragging');
	}

	for (var i = 1; i < lines.length; ++ i, ++ l) {
		if (lines[i] > y) {
			break;
		}
	}
	var col = cfg.getConfig('col');
	if (g != -1) { // folder is opened
		col = layout.getFolderCol(col);
	}

	var ses = $(par, '.site');
	var b = l * col;
	var e = b + col;
	if (e > ses.length) {
		e = ses.length;
	}
	for (var i = b; i < e; ++ i) {
		var se = ses[i];
		if ($.hasClass(se, 'dragging')) { // skip myself
			continue;
		}

		var pos = $.offset(se);
		if (folderArea == null && !$.hasClass(elem, 'folder') && $.inElem(x, y, se)) { // only check "inSite" on top level
			inSite = true;
			break;
		}

		if (pos.left > x) {
			break;
		}
	}

	return [g, i, inSite];
}

/**
 * x, y are the x, y from the document's origin
 */
function getPos(x, y) { // 
	var pos = { idxes: null, pos: null };
	var ses = [];
	var g = -1;
	var fa = $$('folder');
	if (fa) {
	} else {
		ses = $('#sites > .site');
	}

	for (var i = ses.length - 1; i >= 0; -- i) {
		var se = ses[i];
		if ($.hasClass('dragging')) {
			continue;
		}

		if ($.inElem(se, x, y)) {
			pos.idxes = [g, i];
			pos.pos = 'in';
			break;
		}
	}

	return pos;
}

return {
	onStart: function(evt) {
		init();
	
		var se = gDrag.elemFromNode(evt.target);
		if (!se || $.hasClass(se, 'opened') || !$.hasClass(se, 'site')) {
			evt.preventDefault();
			return false;
		}
	
		var idxes = gDrag.indexFromNode(se);
		var s = idxes != null ? sm.getSite(idxes[0], idxes[1]) : null;
		if (s != null) {
			elem = se;
			$.addClass(se, 'dragging');
	
			var dt = evt.dataTransfer;
			dt.setData("text/uri-list", s.url);
			dt.setData("text/plain", s.url);
			dt.effectAllowed = 'move';
			var img = document.createElement('div');
			$.addClass(img, 'drag-elem');
			dt.setDragImage(img, 0, 0);
	
			var of = $.offset(elem.parentNode);
			offset.x = evt.clientX - (of.left + (se.style.left.replace(/px/g, '') - 0) - window.scrollX);
			offset.y = evt.clientY - (of.top + (se.style.top.replace(/px/g, '') - 0) - window.scrollY);

			dragIdxes = idxes;
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
	
			x = evt.clientX;
			y = evt.clientY;
			moveElem(elem, x, y);
			if (layout.inTransition()) {
				return false;
			}
	
			var [g, i, inSite] = getIndex(evt.clientX + window.scrollX, evt.clientY + window.scrollY);
			var folderArea = $$('folder');
			if (folderArea) {
			} else {
				if (dragIdxes[0] != -1 && (!inSite || i != dragIdxes[0])) {
					clrTimeout(timeoutId);
					log('i vs dragIdx[0]: ' + i + ':' + dragIdxes[0]);
					saved = {idxes:[-1,-1], inSite:false};
	
					elem.parentNode.removeChild(elem);
					$$('sites').appendChild(elem);
	
					sm.moveOut(dragIdxes[0], dragIdxes[1]);
	
					dragIdxes[0] = -1;
					dragIdxes[1] = sm.getTopSiteCount() - 1;
					moveElem(elem, x, y);
				} else if (inSite) {
					assert(g != dragIdxes[0] || i != dragIdxes[1], "Can't moved to itself: " + g + ', ' + i);
					if (dragIdxes[0] != -1) {
						if (dragIdxes[0] == i) {
						}
						return false;
					}
	
					if (g != saved.idxes[0] || i != saved.idxes[1] || inSite != saved.inSite) {
						clrTimeout(timeoutId);
						saved.idxes = [g, i];
						saved.inSite = inSite;
						timeoutId = window.setTimeout(function() {
							timeoutId = null;
							saved = {idxes:[-1,-1], inSite:false};
	
							layout.lock();
	
							var target = sm.getSite(-1, i);
							sm.moveIn(dragIdxes[1], i);
	
							dragIdxes[0] = dragIdxes[1] < i ? i - 1 : i;
							dragIdxes[1] = target.sites === undefined ? 1 : target.sites.length;
							moveElem(elem, x, y);
						}, HOVER);
					}
				} else {
					var from = dragIdxes[1];
					var to = i;
					if (from < to) {
						-- to;
					}
					if (from == to) {
						clrTimeout();
						return false;
					}
					if (g != saved.idxes[0] || to != saved.idxes[1] || inSite != saved.inSite) {
						clrTimeout(timeoutId);
						saved.idxes = [g, to];
						saved.inSite = inSite;
						timeoutId = window.setTimeout(function() {
							timeoutId = null;
							saved = {idxes:[-1,-1], inSite:false};
	
							if (g == -1) {
								sm.simpleMove(g, from, to);
								dragIdxes[1] = to;
							}
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
			if (dragIdxes[0] != -1 && $$('folder') == null) {
				elem.parentNode.removeChild(elem);
			}
			elem = null;
	
			layout.unlock();
			layout.begin();
		}
	}
};
})();
