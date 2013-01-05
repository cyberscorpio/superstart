"use strict";
var layout = (function() {
	const MINWIDTH = 960;
	const NOTEWIDTH = 200;
	const SITE_MIN_WIDTH_IN_COMPACTMODE = 208;
	const ratio = 0.5625;//0.625; // 0.5625 => 16:9, 0.625 => 16:10

	function getLayoutParameter(col) {
		if ($.hasClass(document.body, 'hidden')) {
			return null;
		}

		var width = window.innerWidth;
		var notes = $$('notes');
		var rc = notes.getBoundingClientRect();
		if (rc.width > 0) { // it is not hidden
			width = rc.left;
		}

		var cs = window.getComputedStyle($$('margin-helper'));
		var minMargin = parseInt(cs['minWidth']);
		var maxMargin = parseInt(cs['maxWidth']);
		if (maxMargin == 0) {
			maxMargin = 999999;
		}
		var margin = parseFloat(cs['height']);
		/* since fx won't support 'vw' until version 19, so we must use this way as a workaround */
		if (margin < 0.5) {
			margin = Math.floor(width * margin);
		}
		if (margin < minMargin) {
			margin = minMargin;
		}
		if (margin > maxMargin) {
			margin = maxMargin;
		}

		var startY = parseInt(cs['marginTop']);
		cs = window.getComputedStyle($$('site-helper'));
		var minSiteWidth = parseInt(cs['minWidth']);
		var maxSiteWidth = parseInt(cs['maxWidth']);
		if (maxSiteWidth == 0) {
			maxSiteWidth = 999999;
		}
		var gapX = parseInt(cs['marginRight']);
		var gapY = parseInt(cs['marginBottom']);

		var siteWidth = Math.floor((width - 2 * margin - (col - 1) * gapX) / col);
		if (siteWidth > maxSiteWidth) {
			siteWidth = maxSiteWidth;
		}
		if (siteWidth < minSiteWidth) {
			siteWidth = minSiteWidth;
		}

		var startX = Math.floor((width - siteWidth * col - (col - 1) * gapX) / 2);
		if (startX < 0) {
			startX = 0;
		}

		return {
			'startX': startX,
			'startY': startY,
			'siteWidth': siteWidth,
			'gapX': gapX,
			'gapY': gapY,
			'lineHeight': 0
		};
	}

	var lp0 = null;
	var lp1 = null;

	function resetLayout() {
		lp0 = lp1 = null;
	}

	// -- register events begin ---
	var cfgevts = {
		'col': onColChanged,
		'sites-compact': onSitesCompactChanged,
		'sites-text-only': onSitesTextOnly,
		'todo-hide': onTodoHide,
		'theme': onThemeChanged,
		'use-customize': onUseCustomize
	};
	var wevts = {
		'resize': onResize
	};
	evtMgr.register([cfgevts], [wevts], []);
	evtMgr.ready(function() {
		setBgSize();
	});
	evtMgr.clear(function() {
		layout = undefined;
	});
	// -- register events ended ---

	function setBgSize() {
		var bg = $$('bg');
		bg.style.width = window.innerWidth + 'px';
		bg.style.height = window.innerHeight + 'px';
	}

	function onResize() {
		resetLayout();

		var ss = $$('sites');
		$.addClass(ss, 'notransition');
		layout.layoutTopSites(true);

		if($('.folder.opened').length == 1) {
			layout.layoutFolderArea();
		}

		setBgSize();

		window.setTimeout(function() {
			$.removeClass(ss, 'notransition');
		}, 0);
	}

	function onColChanged(evt, v) {
		resetLayout();
		layoutTopSites();
		if($('.folder.opened').length == 1) {
			layout.layoutFolderArea();
		}
	}

	function onSitesCompactChanged(evt, compact) {
		window.setTimeout(function() {
			resetLayout();
			layoutTopSites();
			if($('.folder.opened').length == 1) {
				layout.layoutFolderArea();
			}
		}, 0);
	}

	function onSitesTextOnly(evt, v) {
		window.setTimeout(function() {
			resetLayout();
			layoutTopSites();
			if($('.folder.opened').length == 1) {
				layout.layoutFolderArea();
			}
		}, 0);
	}

	function onTodoHide(evt, v) {
		window.setTimeout(function() {
			resetLayout();
			layoutTopSites();
			if($('.folder.opened').length == 1) {
				layout.layoutFolderArea();
			}
		}, 0);
	}

	function onThemeChanged(evt, t) {
		window.setTimeout(function() { // theme.js will change the actual theme, so we must make sure we run after that.
			resetLayout();
			layoutTopSites();
			if($('.folder.opened').length == 1) {
				layout.layoutFolderArea();
			}
		}, 0);
	}

	function onUseCustomize(evt, u) {
		window.setTimeout(function() { // theme.js will change the actual theme, so we must make sure we run after that.
			resetLayout();
			layoutTopSites();
			if($('.folder.opened').length == 1) {
				layout.layoutFolderArea();
			}
		}, 0);
	}

	function getFolderColumn() {
		var col = cfg.getConfig('col');
		return col;// + 1;
	}

	// 3 items per line
	// 3 items per column
	// < w > <  3w  > < w > <  3w  > < w > <  3w  > < w >
	function layoutFolderElement(se) {
		if (lp0 === null) {
			return;
		}
		var sn = $$$(se, '.folder-snapshot');
		var cw = sn.clientWidth;
		if (cw == 0) {
			cw = parseInt(sn.style.width);
		}
		var ch = sn.clientHeight;
		if (ch == 0) {
			ch = parseInt(sn.style.height);
		}
		var w = cw / 13;
		var h = ch / 13;
		var ww = Math.ceil(w * 3);
		var hh = Math.ceil(h * 3);
		var mh = Math.ceil((ch - 3 * hh) / 4);
		w = Math.floor(w);
		h = Math.floor(h);
		
		var imgs = sn.getElementsByTagName('img');
		var x = w;
		var y = mh;
		for (var i = 0; i < imgs.length;) {
			var img = imgs[i];
			img.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
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

	function placeSitesInFolderArea() {
		var ses = $('#folder > .site');
		if (ses.length > 0) {
			var col = getFolderColumn();
			if (lp1 === null) {
				lp1 = getLayoutParameter(col);
			}
			return placeSites(ses, col, lp1);
		}
	}

	function layoutFolderArea() { 
		var folder = $$('folder');
		if (folder == null) {
			return;
		}

		var ses = $(folder, '.site');

		var height = placeSitesInFolderArea();

		var se = $$$('.folder.opened');
		var sepos = $.getPosition(se);
		var top = sepos.top + sepos.height;

		var cs = window.getComputedStyle(se, ':after');
		var offset = parseInt(cs['bottom']);
		top -= offset;

		folder.style.height = height + 'px';
		folder.style.top = top + 'px';

		// move below sites
		var col = cfg.getConfig('col');
		var ses = $('#sites > .site');
		var begin = 0;
		for (var i = 0; i < ses.length; ++ i) {
			if (ses[i] == se) {
				begin = i + col - (i % col);
				break;
			}
		}

		var siteOffset = height - offset;
		for (var i = begin; i < ses.length; ++ i) {
			var se = ses[i];
			var [left, top] = se.pos;
			top += siteOffset;
			se.style.transform = 'translate(' + left + 'px, ' + top + 'px)';
		}
	}

	function setTopSiteSize(se) {
		if (lp0 === null) {
			return;
		}
		var sn = $$$(se, '.site-snapshot');
		sn.style.width = lp0.siteWidth + 'px';
		sn.style.height = Math.floor(lp0.siteWidth * ratio)+ 'px';

		var title = $$$(se, '.site-title');
		title.style.width = lp0.siteWidth + 'px';
	}

	// return the height of the container, used by the #folder
	function placeSites(ses, col, lp) {
		var textOnly = cfg.getConfig('sites-text-only');
		var height = 0;
		var l = ses.length;
		if (l > 0) {
			var wpx = lp.siteWidth + 'px';
			var snapshotHeight = Math.floor(lp.siteWidth * ratio);
			var hpx = snapshotHeight + 'px';
			var x = lp.startX, y = lp.startY;
			for (var i = 0, l = ses.length; i < l;) {
				var se = ses[i];
				var sn = $$$(se, '.site-snapshot');
				sn.style.width = wpx;
				sn.style.height = hpx;
				var title = $$$(se, '.site-title');
				title.style.width = wpx;

				if (lp.lineHeight == 0) {
					lp.lineHeight = (textOnly ? 0 : snapshotHeight) + se.getBoundingClientRect().height - sn.getBoundingClientRect().height;
					lp.lineHeight += lp.gapY;
				}

				var top = y + 'px';
				var left = x + 'px';
				se['pos'] = [x, y];
				if (!$.hasClass(se, 'dragging')) {
					se.style.transform = 'translate(' + left + ', ' + top + ')';
				}

				x += lp.siteWidth + lp.gapX;
				++ i;
				if (i % col == 0 && i < l) {
					x = lp.startX;
					y += lp.lineHeight;
				}
			}
			height = y + lp.lineHeight;
		}
		return height;
	}

	function layoutFolderElements() {
		var fs = $('#sites > .folder');
		for (var i = 0; i < fs.length; ++ i) {
			var f = fs[i];
			if (!$.hasClass(f, 'dragging')) {
				layoutFolderElement(f);
			}
		}
	}

	function layoutTopSites() {
		var ses = $('#sites > .site');
		if (ses.length > 0) {
			var col = cfg.getConfig('col');
			if (lp0 == null) {
				lp0 = getLayoutParameter(col);
			}
			placeSites(ses, col, lp0);
			layoutFolderElements();
		}
	}

	function onSnapshotTransitionEnd(e) {
		if (e.propertyName != 'width') {
			return;
		}
		var se = this.parentNode;
		while (se && !$.hasClass(se, 'site')) {
			se = se.parentNode;
		}
		if (se && $.hasClass(se, 'folder')) {
			layoutFolderElement(se);
		}
	}


	var actID = null;
var layout = {
	layoutTopSites: function(actingNow) {
		if (actingNow) {
			if (actID) {
				window.clearTimeout(actID);
				actID = null;
			}
			layoutTopSites();
		} else {
			if (actID == null) {
				actID = window.setTimeout(function(){
					actID = null;
					layoutTopSites();
				}, 0);
			}
		}
	}
	, 'setTopSiteSize': setTopSiteSize
	, 'layoutFolderElement': layoutFolderElement
	, 'layoutFolderArea': layoutFolderArea
	, 'placeSitesInFolderArea': placeSitesInFolderArea
	, 'onSnapshotTransitionEnd': onSnapshotTransitionEnd
	
}; // layout
	return layout;
}());
