var layout = (function() {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const MINWIDTH = 1000;
	const NOTEWIDTH = 200;
	const ratio = 0.5625;//0.625; // 0.5625 => 16:9, 0.625 => 16:10

	var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
	var cfg = ssObj.getService(Ci.ssIConfig);
	ssObj = undefined;

	function LayoutParameter(width, col) {
		var compact = cfg.getConfig('site-compact');
		this.width = width;
		this.startY = 20;
		if (compact) {
			this.xPadding = 20;
			this.yPadding = 15;

			var w = Math.floor(width * 2 / 3);
			this.siteWidth = Math.floor((w - (col - 1) * this.xPadding) / col);
			if (this.siteWidth > 256) {
				this.siteWidth = 256;
			}
			this.startX = Math.floor((width - this.siteWidth * col - (col - 1) * this.xPadding) / 2);
		} else {
			this.xPadding = 30;
			this.yPadding = 20;
			this.siteWidth = Math.floor((width - (col - 1) * this.xPadding) / (col + 1));
			this.startX = Math.floor(this.siteWidth / 2);
		}
		this.siteHeight = 0; // get it in runtime
		this.snapshotWidth = this.siteWidth;
		this.snapshotHeight = Math.floor(this.snapshotWidth * ratio);
	}
	var lp0 = new LayoutParameter(MINWIDTH, 1);
	var lp1 = new LayoutParameter(MINWIDTH, 1);

	function calcLayout() {
		var w = window.innerWidth;//document.body.clientWidth;
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

		var mask = $$('mask');
		mask.style.height = window.innerHeight + 'px';

		var notes = $$('notes');
		notes.style.marginRight = Math.floor(lp0.startX / 4) + 'px';
	}

	// -- register events begin ---
	var cfgevts = {
		'col': onColChanged,
		'site-compact': onSiteCompactChanged,
		'todo-hide': onTodoHide
	};
	window.addEventListener('DOMContentLoaded', function() {
		window.removeEventListener('DOMContentLoaded', arguments.callee, false);
		for (var k in cfgevts) {
			cfg.subscribe(k, cfgevts[k]);
		}
		calcLayout();
		document.body.style.minWidth = MINWIDTH + 'px';
	}, false);
	window.addEventListener('resize', onResize, false);
	window.addEventListener('unload', function() {
		window.removeEventListener('unload', arguments.callee, false);
		window.removeEventListener('resize', onResize, false);
		for (var k in cfgevts) {
			cfg.unsubscribe(k, cfgevts[k]);
		}
		cfg = null;
	}, false);
	// -- register events ended ---

	function onResize() {
		calcLayout();

		placeTodoList();

		var ss = $$('sites');
		$.addClass(ss, 'notransition');
		layout.layoutTopSites(true);

		if($('.opened').length == 1) {
			layout.layoutFolderArea();
		}

		window.setTimeout(function() {
			$.removeClass(ss, 'notransition');
			clrTransitionState();
		}, 0);
	}

	function onColChanged(evt, v) {
		calcLayout();
		layoutTopSites();
		if($('.opened').length == 1) {
			layout.layoutFolderArea();
		}
	}

	function onSiteCompactChanged(evt, v) {
		calcLayout();
		layoutTopSites();
		if($('.opened').length == 1) {
			layout.layoutFolderArea();
		}
	}

	function onTodoHide(evt, v) {
		calcLayout();
		placeTodoList();
		layoutTopSites();
		if($('.opened').length == 1) {
			layout.layoutFolderArea();
		}
	}

	function placeTodoList() {
		/*
		var n = $$('notes');
		var w = window.innerWidth;
		n.style.left = w - NOTEWIDTH + 'px';
		*/
	}

	var transitionElement = null;
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

	function getFolderColumn(col) {
		var col = cfg.getConfig('col');
		return col;// + 1;
	}

	// 3 items per line
	// 3 items per column
	// < w > <  2w  > < w > <  2w  > < w > <  2w  > < w >
	function layoutFolderElement(se) {
		setTopSiteSize(se);
		var sn = $(se, '.snapshot')[0];

		var cw = sn.clientWidth;
		if (cw == 0) {
			cw = parseInt(sn.style.width);
		}
		var ch = sn.clientHeight;
		if (ch == 0) {
			ch = parseInt(sn.style.height);
		}
		w = cw;
		w /= 10;
		h = w * ratio;
		var ww = Math.floor(w * 2);
		var hh = Math.floor(h * 2);
		var mh = Math.floor((ch - 3 * hh) / 4);
		w = Math.floor(w);
		h = Math.floor(h);
		
		var imgs = sn.getElementsByTagName('img');
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

	function placeSitesInFolderArea() {
		var ses = $('#folder > .site');
		var x = lp1.startX;
		var y = lp1.startY;
		var w = lp1.siteWidth;
		var h = Math.floor(w * ratio);

		var col = getFolderColumn();
		return placeSites(ses, col, lp1);
	}

	function layoutFolderArea() { 
		var folder = $$('folder');
		assert(folder != null, 'Try to layout the folder area, but it is nonexist');
		if (folder == null) {
			return;
		}

		var ses = $(folder, '.site');
		assert(ses.length > 1, 'Try to layout the folder with less sites than 2');

		var height = placeSitesInFolderArea();

		var se = $('.opened');
		assert(se.length == 1, 'Only 1 folder can be opened, but we have ' + se.length);
		se = se[0];
		var top = $.offsetTop(se) + parseInt(se.style.height);

		folder.style.height = height + 'px';
		folder.style.top = top + 'px';

		// move below sites
		var ses = $('#sites > .site');
		for (var i = 0, l = ses.length; i < l; ++ i) {
			var s = ses[i];
			if (s.offsetTop > se.offsetTop) {
				var top = parseInt(s.style.top);
				top += height;
				s.style.top = top + 'px';
			}
		}
	}

	function setTopSiteSize(se) {
		se.style.width = lp0.siteWidth + 'px';
		se.style.height = lp0.siteHeight + 'px';

		var sn = $(se, '.snapshot')[0];
		sn.style.width = lp0.snapshotWidth + 'px';
		sn.style.height = lp0.snapshotHeight + 'px';
	}

	// return the height of the container, used by the #folder
	function placeSites(ses, col, lp) {
		var height = 0;
		var l = ses.length;
		if (l > 0) {
			var x = lp.startX, y = lp.startY;
			if (lp.siteHeight == 0) {
				var ch = $(ses[0], '.title')[0].offsetHeight;
				lp.siteHeight = lp.snapshotHeight + ch;
			}

			for (var i = 0, l = ses.length; i < l;) {
				var se = ses[i];
				if (!$.hasClass(se, 'dragging')) {
					se.style.width = lp.siteWidth + 'px';
					se.style.height = lp.siteHeight + 'px';
					var sn = $(se, '.snapshot')[0];
					sn.style.width = lp.snapshotWidth + 'px';
					sn.style.height = lp.snapshotHeight + 'px';

					var top = y + 'px';
					var left = x + 'px';
					if (!layout.inTransition() && ((se.style.top && top != se.style.top) || (se.style.left && left != se.style.left))) {
						setTransitionState(se);
					}
					se.style.top = top;
					se.style.left = left;
				}

				x += lp.siteWidth + lp.xPadding;
				++ i;
				if (i % col == 0 && i < l) {
					x = lp.startX;
					y += lp.siteHeight + lp.yPadding;
				}
			}
			height = y + lp.siteHeight + lp.yPadding;
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

	function enterDraggingMode() {
		lp0.snapshotWidth = Math.floor(lp0.snapshotWidth * 4 / 5);
		lp0.snapshotHeight = Math.floor(lp0.snapshotWidth * ratio);

		var w = lp0.snapshotWidth;
		var h = lp0.snapshotHeight;

		var ses = $('#sites > .site');
		for (var i = 0, l = ses.length; i < l; ++ i) {
			var se = ses[i];
			var sn = $(se, '.snapshot')[0];
			var title = $(se, '.title')[0];
			if (!$.hasClass(se, 'dragging')) {
				sn.style.width = w + 'px';
				sn.style.height = h + 'px';
				title.style.width = w + 'px';
			}
		}
	}

	function leaveDraggingMode() {
		calcLayout();
		var w = lp0.snapshotWidth;
		var h = lp0.snapshotHeight;

		var ses = $('#sites > .site');
		for (var i = 0, l = ses.length; i < l; ++ i) {
			var se = ses[i];
			var sn = $(se, '.snapshot')[0];
			var title = $(se, '.title')[0];
			if (!$.hasClass(se, 'dragging')) {
				sn.style.width = w + 'px';
				sn.style.height = h + 'px';
				title.style.width = '';
			}
		}
	}

	/*
	function onSiteResize() {
		var se = this;
		if ($.hasClass(se, 'folder')) {
			layoutFolderElement(se);
		}
	}
	*/
	function onSnapshotTransitionEng(e) {
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
	inTransition: function() {
		return transitionElement != null;
	},

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

	'placeTodoList': placeTodoList
	, 'layoutFolderArea': layoutFolderArea
	, 'placeSitesInFolderArea': placeSitesInFolderArea
	, 'layoutFolderElement': layoutFolderElement
	, 'setTopSiteSize': setTopSiteSize

	, 'enterDraggingMode': enterDraggingMode
	, 'leaveDraggingMode': leaveDraggingMode

	// 'onSiteResize': onSiteResize
	// Maybe I can use MutationObserver to mointor the resizing event!!
	// https://developer.mozilla.org/en-US/docs/DOM/MutationObserver
	, 'onSnapshotTransitionEng': onSnapshotTransitionEng
	
}; // layout
	return layout;
})();
