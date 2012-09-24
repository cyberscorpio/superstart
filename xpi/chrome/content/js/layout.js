var layout = (function() {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const MINWIDTH = 800;
	const ratio = 0.5625;//0.625; // 0.5625 => 16:9, 0.625 => 16:10

	var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
	var cfg = ssObj.getService(Ci.ssIConfig);
	var sm = ssObj.getService(Ci.ssISiteManager);
	ssObj = undefined;

	function LayoutParameter(width, col) {
		this.width = width;
		this.xPadding = 30;
		this.yPadding = 10;
		this.startY = 20;
		this.siteWidth = Math.floor((width - (col - 1) * this.xPadding) / (col + 1));
		this.startX = Math.floor(this.siteWidth / 2);
	}
	var lp0 = new LayoutParameter(MINWIDTH, 1);
	var lp1 = new LayoutParameter(MINWIDTH, 1);

	function calcLayout() {
		var w = window.innerWidth;//document.body.clientWidth;
		if (w < MINWIDTH) {
			w = MINWIDTH;
		}
		var col = cfg.getConfig('col');
		lp0 = new LayoutParameter(w, col);

		col = getFolderColumn();
		lp1 = new LayoutParameter(w, col);

		var mask = $$('mask');
		mask.style.height = window.innerHeight + 'px';
	}

	// -- register events begin ---
	window.addEventListener('DOMContentLoaded', function() {
		window.removeEventListener('DOMContentLoaded', arguments.callee, false);
		calcLayout();
	}, false);
	window.addEventListener('resize', onResize, false);
	window.addEventListener('unload', function() {
		window.removeEventListener('unload', arguments.callee, false);
		window.removeEventListener('resize', onResize, false);
	}, false);
	// -- register events ended ---

	function onResize() {
		calcLayout();

		var ss = $$('sites');
		$.addClass(ss, 'notransition');
		layout.begin();
		window.setTimeout(function() {
			$.removeClass(ss, 'notransition');
			clrTransitionState();
		}, 0);
	}

	var transitionElement = null;
	var lockTopSites = false; // lock the top sites, but it won't affect the #folder to be opened

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
		return col + 1;
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

	function layoutFolderArea() { 
		var folder = $$('folder');
		assert(folder != null, 'Try to layout the folder area, but it is nonexist');
		if (folder == null) {
			return;
		}

		var ses = $(folder, '.site');
		assert(ses.length > 1, 'Try to layout the folder with less sites than 2');

		var x = lp1.startX;
		var y = lp1.startY;
		var w = lp1.siteWidth;
		var h = Math.floor(w * ratio);

		var col = getFolderColumn();
		var lineCount = Math.floor(ses.length / col);
		if (ses.length % col) {
			++ lineCount;
		}

		var height = placeSites(ses, col, x, y, w, h, lp1.xPadding, lp1.yPadding);

		var se = $('.opened');
		assert(se.length == 1, 'Only 1 folder can be opened, but we have ' + se.length);
		se = se[0];
		var top = $.offsetTop(se) + (se.style.height.replace(/px/g, '') - 0);

		folder.style.height = height + 'px';
		folder.style.top = top + 'px';

		// move below sites
		ses = $('#sites > .site');
		for (var i = 0, l = ses.length; i < l; ++ i) {
			var s = ses[i];
			if (s.offsetTop > se.offsetTop) {
				var top = s.style.top.replace(/px/g, '') - 0;
				top += height;
				s.style.top = top + 'px';
			}
		}
	}

	// return the height of the container
	function placeSites(ses, col, sx, sy, w, h, px, py) {
		var height = 0;
		var l = ses.length;
		if (l > 0) {
			var x = sx, y = sy;
			var th = $(ses[0], '.title')[0].offsetHeight;

			for (var i = 0, l = ses.length; i < l;) {
				var se = ses[i];
				se.style.width = w + 'px';
				se.style.height = h + th + 'px';
				$(se, '.snapshot')[0].style.height = h + 'px';

				if (!$.hasClass(se, 'dragging')) {
					var top = y + 'px';
					var left = x + 'px';
					if (!layout.inTransition() && ((se.style.top && top != se.style.top) || (se.style.left && left != se.style.left))) {
						setTransitionState(se);
					}
					se.style.top = top;
					se.style.left = left;
				}

				x += w + px;
				++ i;
				if (i % col == 0 && i < l) {
					x = sx;
					y += h + th + py;
				}
			}
			height = y + h + th + py;
		}
		return height;
	}

	function layoutSites() {
		var col = cfg.getConfig('col');

		var container = $$('container');
		var sites = $$('sites');

		var ses = $('#sites > .site');
		var y = lp0.startY;
		var w = lp0.siteWidth;
		var h = Math.floor(w * ratio);

		placeSites(ses, col, lp0.startX, lp0.startY, w, h, lp0.xPadding, lp0.yPadding);
		var fs = $('#sites > .folder');
		for (var i = 0; i < fs.length; ++ i) {
			layoutFolderElement(fs[i], w, h);
		}

		if ($('.opened').length > 0) {
			layoutFolderArea();
		}
	}

	var actID = null;

var layout = {
	inTransition: function() {
		return transitionElement != null;
	},

	lock: function() { // TODO: for '#folder' there is a bug for the position
		lockTopSites = true;
	},
	unlock: function() {
		if (lockTopSites) {
			this.begin();
		}
		lockTopSites = false;
	},

	begin: function(actingNow) {
		if (actingNow) {
			if (actID) {
				window.clearTimeout(actID);
				actID = null;
			}
			layoutSites();
		} else {
			if (actID == null) {
				actID = window.setTimeout(function(){
					actID = null;
					layoutSites();
				}, 0);
			}
		}
	},
	
}; // layout
	return layout;
})();
