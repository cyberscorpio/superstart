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

		col = getFolderColumn(col);
		lp1 = new LayoutParameter(w, col);
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
		var w = lp1.siteWidth;
		var h = Math.floor(w * ratio);
		var ses = $(folder, '.site');

		var lineCount = Math.floor(ses.length / col);
		if (ses.length % col) {
			++ lineCount;
		}

		var y = lp1.startY;
		var baseY = ft;//$.offsetTop(folder);
		var titleHeight = 0;
		for (var l = 0, i = 0; l < lineCount; ++ l) {
			var x = lp1.startX;

			for (var k = 0; k < col && i < ses.length; ++ k, ++ i) {
				var se = ses[i];
				se.style.width = w + 'px';
				var snapshot = $(se, '.snapshot')[0];
				snapshot.style.height = h + 'px';

				if (titleHeight == 0) {
					var t = $(se, '.title')[0];
					titleHeight = t.clientHeight;
				}

				if (!$.hasClass(se, 'dragging')) {
					var top = y + 'px';
					var left = x + 'px';
					if (!layout.inTransition() && ((se.style.top && top != se.style.top) || (se.style.left && left != se.style.left))) {
						setTransitionState(se);
					}
					se.style.top = top;
					se.style.left = left;
				}

				x += w + lp1.xPadding;
			}
			y += h + titleHeight + lp1.yPadding;
		}

		folder.style.height = y + 'px';
		folder.style.top = ft + 'px';


		return y;
	}

	function act() {
		var col = cfg.getConfig('col');

		var container = $$('container');
		var sites = $$('sites');
		var baseY = $.offsetTop(sites);

		var ses = $('#sites > .site');
		var y = lp0.startY;
		var lineCount = Math.floor(ses.length / col);
		if (ses.length % col > 0) {
			++ lineCount;
		}

		var w = lp0.siteWidth;
		var h = Math.floor(w * ratio);

		var titleHeight = 0;
		for (var l = 0, i = 0; l < lineCount; ++ l) {
			var x = lp0.startX;
			var folderAreaHeight = 0;

			for (var k = 0; k < col && i < ses.length; ++ k, ++ i) {
				var se = ses[i];
				se.style.width = w + 'px';
				var snapshot = $(se, '.snapshot')[0];
				snapshot.style.height = h + 'px';
				if (titleHeight == 0) {
					var t = $(se, '.title')[0];
					titleHeight = t.clientHeight;
				}

				if (!lockTopSites && !$.hasClass(se, 'dragging')) {
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
						var folderAreaTop = $.offsetTop(sites) - $.offsetTop(container) + y + h + titleHeight; // top(sites) - top(container) because folerArea is related to '#sites'.
						folderAreaHeight = layoutFolderArea(getFolderColumn(col), folderAreaTop);
					}
				}

				x += w + lp0.xPadding;
			}
			y += folderAreaHeight + h + titleHeight + lp0.yPadding;
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
	inTransition: function() {
		return transitionElement != null;
	},

	getFolderCol: getFolderColumn,

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
