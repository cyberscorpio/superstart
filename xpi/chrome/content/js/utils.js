"use strict";
const {classes: Cc, interfaces: Ci} = Components;
var $ = function(e, s) {
	if (s === undefined) {
		s = e;
		e = document;
	}
	if (typeof(s) != 'string' || s == '') {
		return null;
	}
	if (s.charAt(0) == '#' && s.indexOf(' ') == -1 && s.indexOf('>') == -1) {
		return document.getElementById(s.substr(1));
	} else {
		return e.querySelectorAll(s);
	}
};

var $$ = function(id) {
	return document.getElementById(id);
};

(function($) {
	$.hasClass = function(el, cls) {
		try {
			return el.classList.contains(cls);
		} catch (e) {}
		return false;
	}

	$.addClass = function(el, cls) {
		try {
			if (!el.classList.contains(cls)) {
				el.classList.add(cls);
			}
		} catch (e) {}
	}

	function _removeClass(el, cls) {
		try {
			if (el.classList.contains(cls)) {
				el.classList.remove(cls);
			}
		} catch (e) {}
	}

	$.removeClass = function(el, cls) {
		try {
			if (cls.indexOf(' ') == -1) {
				_removeClass(el, cls);
			} else {
				var cs = cls.split(' ');
				for (var i = 0, l = cs.length; i < l; ++ i) {
					var c = cs[i];
					if (c != '') {
						_removeClass(el, c);
					}
				}
			}
		} catch (e) {}
	}

	$.toggleClass = function(el, cls) {
		if ($.hasClass(el, cls)) {
			$.removeClass(el, cls);
		} else {
			$.addClass(el, cls);
		}
	}

	$.empty = function(el) {
		while (el.firstChild) {
			el.removeChild(el.firstChild);
		}
	}

	$.isPointInElement = function(el, x, y) {
		var rc = el.getBoundingClientRect();
		return rc.left <= x && rc.right > x && rc.top <= y && rc.bottom > y;
	}

	$.getPosition = function(el) {
		var rc = el.getBoundingClientRect();
		return {
			left: rc.left + window.pageXOffset,
			top: rc.top + window.pageYOffset
		};
	}

	$.inRect = function(x, y, l, t, w, h) {
		if (x >= l && x < (l + w) && y >= t && y < (t + h)) {
			return true;
		} else {
			return false;
		}
	}

	$.inElem = function(x, y, el) {
		var pos = $.getPosition(el);
		var w = el.offsetWidth;
		var h = el.offsetHeight;
		return this.inRect(x, y, pos.left, pos.top, w, h);
	}

	$.getCSSRule = function(selector, what) {
		var result = '';
		for (var idx = 0; idx < document.styleSheets.length; ++ idx) {
			try {
				var ss = document.styleSheets[idx];
				var rs = ss.cssRules;
				for (var i = 0, l = rs.length; i < l; ++ i) {
					var r = rs[i];
					if (!r.selectorText) {
						continue;
					}
					var s = r.selectorText;

					if (s == selector) {
						if (r.style[what] != undefined) {
							result = r.style[what];
						}
					}
				}
			} catch (e) {
			}
		}

		return result;
	}

	$.insertStyle = function(href, id) {
		var style = document.createElement('link');
		if (id !== undefined) {
			style.id = id;
		}
		style.setAttribute('rel', 'stylesheet');
		style.setAttribute('type', 'text/css');
		style.setAttribute('href', href);
		document.getElementsByTagName('head')[0].appendChild(style);
	}
	
	$.getMainWindow = function() {
		return Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getMostRecentWindow("navigator:browser");
	}
})($);

