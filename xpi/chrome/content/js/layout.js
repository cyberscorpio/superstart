"use strict";
var layout = (function() {
	const MINWIDTH = 960;
	const NOTEWIDTH = 200;
	const SITE_MIN_WIDTH_IN_COMPACTMODE = 208;
	const ratio = 0.5625;//0.625; // 0.5625 => 16:9, 0.625 => 16:10

	function LayoutParameter(width, col) {
		var compact = cfg.getConfig('sites-compact');
		this.width = width;
		this.startY = 20;
		if (compact) {
			this.xPadding = 20;
			this.yPadding = 5;
			if (cfg.getConfig('sites-text-only')) {
				this.yPadding = 15;
			}

			var w = Math.floor(width * 2 / 3);
			this.siteWidth = Math.floor((w - (col - 1) * this.xPadding) / col);
			if (this.siteWidth > SITE_MIN_WIDTH_IN_COMPACTMODE) {
				this.siteWidth = SITE_MIN_WIDTH_IN_COMPACTMODE;
			}
			this.startX = Math.floor((width - this.siteWidth * col - (col - 1) * this.xPadding) / 2);
		} else {
			this.xPadding = 30;
			this.yPadding = 20;
			this.siteWidth = Math.floor((width - (col - 1) * this.xPadding) / (col + 1));
			this.startX = Math.floor(this.siteWidth / 2);
		}
		this.lineHeight = 0;
		this.snapshotWidth = this.siteWidth;
		this.snapshotHeight = Math.floor(this.snapshotWidth * ratio);
	}
	var lp0 = new LayoutParameter(MINWIDTH, 1);
	var lp1 = new LayoutParameter(MINWIDTH, 1);

	function calcLayout() {
		var w = window.innerWidth;
		if (w < MINWIDTH) {
			w = MINWIDTH;
		}
		if (!cfg.getConfig('todo-hide')) {
			w -= NOTEWIDTH;
		}
		var col = cfg.getConfig('col');
		lp0 = new LayoutParameter(w, col);

		col = getFolderColumn();
		lp1 = new LayoutParameter(w, col);

		var notes = $$('notes');
		notes.style.width = NOTEWIDTH + 'px';
		notes.style.marginRight = Math.floor(lp0.startX / 4) + 'px';
	}

	// -- register events begin ---
	var cfgevts = {
		'col': onColChanged,
		'sites-compact': onSitesCompactChanged,
		'sites-text-only': onSitesTextOnly,
		'todo-hide': onTodoHide
	};
	var wevts = {
		'resize': onResize
	};
	evtMgr.register([cfgevts], [wevts], []);
	evtMgr.ready(function() {
		checkTextOnly();
		calcLayout();
		document.body.style.minWidth = MINWIDTH + 'px';
	});
	evtMgr.clear(function() {
		layout = undefined;
	});
	// -- register events ended ---

	function onResize() {
		calcLayout();

		var ss = $$('sites');
		$.addClass(ss, 'notransition');
		layout.layoutTopSites(true);

		if($('.folder.opened').length == 1) {
			layout.layoutFolderArea();
		}

		window.setTimeout(function() {
			$.removeClass(ss, 'notransition');
		}, 0);
	}

	function onColChanged(evt, v) {
		calcLayout();
		layoutTopSites();
		if($('.folder.opened').length == 1) {
			layout.layoutFolderArea();
		}
	}

	function onSitesCompactChanged(evt, v) {
		calcLayout();
		layoutTopSites();
		if($('.folder.opened').length == 1) {
			layout.layoutFolderArea();
		}
	}

	function onSitesTextOnly(evt, v) {
		checkTextOnly();
		calcLayout();
		layoutTopSites();
		if($('.folder.opened').length == 1) {
			layout.layoutFolderArea();
		}
	}

	function checkTextOnly() {
		var only = cfg.getConfig('sites-text-only');
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
			tmplMgr.changeElementsClass(nsps[i], sels[i], only ? 'add' : 'remove', 'text-only');
		};
	}

	function onTodoHide(evt, v) {
		calcLayout();
		layoutTopSites();
		if($('.folder.opened').length == 1) {
			layout.layoutFolderArea();
		}
	}

	function getFolderColumn() {
		var col = cfg.getConfig('col');
		return col;// + 1;
	}

	// 3 items per line
	// 3 items per column
	// < w > <  3w  > < w > <  3w  > < w > <  3w  > < w >
	function layoutFolderElement(se) {
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
		var col = getFolderColumn();
		return placeSites(ses, col, lp1);
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

		for (var i = begin; i < ses.length; ++ i) {
			var se = ses[i];
			var [left, top] = se.pos;
			top += height;
			se.style.transform = 'translate(' + left + 'px, ' + top + 'px)';
		}
	}

	function setTopSiteSize(se) {
		var sn = $$$(se, '.site-snapshot');
		sn.style.width = lp0.snapshotWidth + 'px';
		sn.style.height = lp0.snapshotHeight + 'px';

		var title = $$$(se, '.site-title');
		title.style.width = lp0.snapshotWidth + 'px';
	}

	// return the height of the container, used by the #folder
	function placeSites(ses, col, lp) {
		var textOnly = cfg.getConfig('sites-text-only');
		var height = 0;
		var l = ses.length;
		if (l > 0) {
			var nw = lp.snapshotWidth + 'px';
			var nh = lp.snapshotHeight + 'px';
			var sw = lp.siteWidth + 'px';
			var x = lp.startX, y = lp.startY;
			for (var i = 0, l = ses.length; i < l;) {
				var se = ses[i];
				var sn = $$$(se, '.site-snapshot');
				sn.style.width = nw;
				sn.style.height = nh;
				var title = $$$(se, '.site-title');
				title.style.width = nw;

				if (lp.lineHeight == 0) {
					lp.lineHeight = (textOnly ? 0 : lp.snapshotHeight) + se.getBoundingClientRect().height - sn.getBoundingClientRect().height;
					lp.lineHeight += lp.yPadding;
				}

				var top = y + 'px';
				var left = x + 'px';
				se['pos'] = [x, y];
				if (!$.hasClass(se, 'dragging')) {
					se.style.transform = 'translate(' + left + ', ' + top + ')';
				}

				x += lp.siteWidth + lp.xPadding;
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
		var col = cfg.getConfig('col');

		placeSites(ses, col, lp0);
		layoutFolderElements();
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
	},

	'layoutFolderArea': layoutFolderArea
	, 'placeSitesInFolderArea': placeSitesInFolderArea
	, 'layoutFolderElement': layoutFolderElement
	, 'setTopSiteSize': setTopSiteSize

	// 'onSiteResize': onSiteResize
	// Maybe I can use MutationObserver to mointor the resizing event!!
	// https://developer.mozilla.org/en-US/docs/DOM/MutationObserver
	, 'onSnapshotTransitionEnd': onSnapshotTransitionEnd
	
}; // layout
	return layout;
}());
