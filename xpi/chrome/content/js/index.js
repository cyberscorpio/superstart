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
	sitesPerLine = cfg.getConfig('site-perline');
} catch (e) {
	if (logger != null) {
		logger.logStringMessage(e);
	}
	return;
}

// init
window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);
	initSites();
}, false);

window.addEventListener('resize', onResize, false);

window.addEventListener('unload', function() {
	window.removeEventListener('resize', onResize, false);
}, false);


// sites
var col = 4;
function initSites() {
	var sites = sm.getSites();

	var container = $$('sites');
	for (var i = 0, l = sites.length; i < l; ++ i) {
		var s = sites[i];

		insertSite(container, s);
	}
	if (sites.length % col != 0 || sites.length == 0) {
		insertSite(container, null);
	}

	layout();

	$.removeClass(container, 'hidden');
}

var siteTemplates = {
	'empty': {
		'tag': 'div',
		'attr': {
			'class': 'site empty'
		},
		'children': [
			{
				'tag': 'div',
				'attr': {
					'class': 'background'
				}
			}
		]
	}
};

function insertSite(c, s) {
	var w = null;
	if (s === null) {
		w = $.obj2Element(siteTemplates['empty']);
		w.onclick = function() { showAddSite(); };
	} else {
		if (s.sites != undefined) { // folder
			// 
		} else { // site
		}
	}

	if (w) {
		c.appendChild(w);
	}
}

function layout() {
	var row = cfg.getConfig('row');
	var col = cfg.getConfig('col');

	var cw = document.body.clientWidth;
	if (cw < pageMinWidth) {
		cw = pageMinWidth;
	}

	/** layout **
	  [ w/2] [site] [ w/4 ] [site] ... [site] [ w/2 ]
	 */

	var unit = Math.floor(cw / (3 + 5 * col ));
	var w = 4 * unit
	var h = Math.floor(w * ratio);

	var sites = $('.site');
	var x = 2 * unit;
	var y = 0;
	for (var i = 0, j = 0, l = sites.length; i < l; ++ i) {
		var s = sites[i];
		s.style.width = w + 'px';
		s.style.height = h + 'px';
		s.style.top = y + 'px';
		s.style.left = x + 'px';
		x += 5 * unit;
		++ j;
		if (j == col) {
			j = 0;
			x = 2 * unit;
			y += Math.floor(h + unit * ratio);
		}
	}
}


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
	layout();
}




})();
