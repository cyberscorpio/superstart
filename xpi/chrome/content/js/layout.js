var layout = (function() {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const pageMinWidth = 800;
	const ratio = 0.625; // h = w * 0.625 <=> w = h * 1.6

	var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
	var cfg = ssObj.getService(Ci.ssIConfig);
	var sm = ssObj.getService(Ci.ssISiteManager);
	ssObj = undefined;

	var transitionElement = null;
	var lines = [];
	var lockWhenMoveIn = false; // lock the top sites, but it won't affect the #folder to be opened

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
		var [unit, w, h] = calcSize(folder.clientWidth, col);
		var ses = $(folder, '.site');

		folder.lines = [];
		var lines = folder.lines;
		var lineCount = Math.floor(ses.length / col);
		if (ses.length % col) {
			++ lineCount;
		}

		var y = 32;
		var baseY = $.offsetTop(folder);
		for (var l = 0, i = 0; l < lineCount; ++ l) {
			lines.push(y + baseY);
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

		var container = $$('container');
		var sites = $$('sites');
		sites.lines = [];
		var lines = sites.lines;
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

				if (!lockWhenMoveIn && !$.hasClass(se, 'dragging')) {
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
						var folderAreaTop = $.offsetTop(sites) - $.offsetTop(container) + y + Math.floor(h + unit * ratio) + 12; // top(sites) - top(container) because folerArea is related to '#sites'.
						folderAreaHeight = layoutFolderArea(getFolderColumn(col), folderAreaTop);
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
	inTransition: function() {
		return transitionElement != null;
	},
	clearTransitionState: clrTransitionState,

	getFolderCol: getFolderColumn,

	lock: function() {
		lockWhenMoveIn = true;
	},
	unlock: function() {
		if (lockWhenMoveIn) {
			this.begin();
		}
		lockWhenMoveIn = false;
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
