var layout = (function() {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const ratio = 0.5625;//0.625; // h = w * 0.625 <=> w = h * 1.6
	const folderAreaPadding = 20;

	var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
	var cfg = ssObj.getService(Ci.ssIConfig);
	var sm = ssObj.getService(Ci.ssISiteManager);
	ssObj = undefined;

	var winWidth = 0;
	var siteWidth = 0;
	var subWidth = 0;
	var startX = 0;
	var startY = 20;
	var xPadding = 30;
	var yPadding = 10;

	function calcLayout() {
		winWidth = window.innerWidth;//document.body.clientWidth;
		if (winWidth < 800) {
			winWidth = 800;
		}
		var col = cfg.getConfig('col');
		siteWidth = Math.floor((winWidth - (col - 1) * xPadding) / (col + 1));
		startX = Math.floor(siteWidth / 2);

		col = getFolderColumn(col);
		subWidth = Math.floor((winWidth - (col - 1) * xPadding) / (col + 1));
		subStartX = Math.floor(subWidth / 2);
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
	var lines = [];
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
		var w = subWidth;
		var h = Math.floor(w * ratio);
		var ses = $(folder, '.site');

		folder.lines = [];
		var lines = folder.lines;
		var lineCount = Math.floor(ses.length / col);
		if (ses.length % col) {
			++ lineCount;
		}

		var y = folderAreaPadding;
		var baseY = ft;//$.offsetTop(folder);
		var titleHeight = 0;
		for (var l = 0, i = 0; l < lineCount; ++ l) {
			lines.push(y + baseY);
			var x = subStartX;

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

				x += w + xPadding;
			}
			y += h + titleHeight + yPadding;
		}
		y += folderAreaPadding - yPadding;

		folder.style.height = y + 'px';
		folder.style.top = ft + 'px';


		return y;
	}

	function act() {
		var col = cfg.getConfig('col');
		var cw = winWidth;

		var container = $$('container');
		var sites = $$('sites');
		sites.lines = [];
		var lines = sites.lines;
		var baseY = $.offsetTop(sites);

		var ses = $('#sites > .site');
		var y = startY;
		var lineCount = Math.floor(ses.length / col);
		if (ses.length % col > 0) {
			++ lineCount;
		}

		var w = siteWidth;
		var h = Math.floor(w * ratio);

		var titleHeight = 0;
		for (var l = 0, i = 0; l < lineCount; ++ l) {
			lines.push(y + baseY);
			var x = startX;
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

				x += w + xPadding;
			}
			y += folderAreaHeight + h + titleHeight + yPadding;
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
