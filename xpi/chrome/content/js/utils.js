"use strict";
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

	$.isChild = function(c, p) {
		try {
			while (c != null) {
				if (c == p) {
					return true;
				}
				c = c.parentNode;
			}
		} catch (e) {}
		return false;
	}

	$.isPointInElement = function(el, x, y) {
		var rc = el.getBoundingClientRect();
		return rc.left <= x && rc.right > x && rc.top <= y && rc.bottom > y;
	}

	$.getPosition = function(el) {
		var x = 0, y = 0;
		if (el.offsetParent) {
			do {
				x += el.offsetLeft;
				y += el.offsetTop;
				el = el.offsetParent;
			} while (el);
		}

		return [x, y];
	}

	$.offset = function(el) {
		var o = {left: 0, top: 0};
		while(el) {
			o.left += el.offsetLeft;
			o.top += el.offsetTop;
			el = el.offsetParent;
		}
		return o;
	}

	$.offsetTop = function(el) {
		var t = 0;
		while(el) {
			t += el.offsetTop;
			el = el.offsetParent;
		}
		return t;
	}

	$.offsetLeft = function(el) {
		var l = 0;
		while(el) {
			l += el.offsetLeft;
			el = el.offsetParent;
		}
		return l;
	}


	$.inRect = function(x, y, l, t, w, h) {
		if (x >= l && x < (l + w) && y >= t && y < (t + h)) {
			return true;
		} else {
			return false;
		}
	}

	$.inElem = function(x, y, el) {
		var pos = $.offset(el);
		var w = el.offsetWidth;
		var h = el.offsetHeight;
		return this.inRect(x, y, pos.left, pos.top, w, h);
	}


	// return [width, height] of the element
	$.getElementDimension = function(el, cs) {
		try {
			cs = cs || window.getComputedStyle(el, null);
			return [
				parseInt(cs.getPropertyValue('width')),
				parseInt(cs.getPropertyValue('height'))
				];
		} catch (e) {
			return [0, 0];
		}
	}

	// margin + border + padding
	$.getElementExtensionalY = function(el, cs) {
		try {
			cs = cs || window.getComputedStyle(el, null);
			return parseInt(cs.getPropertyValue('margin-top')) +
				parseInt(cs.getPropertyValue('margin-bottom')) +
				parseInt(cs.getPropertyValue('border-top-width')) +
				parseInt(cs.getPropertyValue('border-bottom-width')) +
				parseInt(cs.getPropertyValue('padding-top')) +
				parseInt(cs.getPropertyValue('padding-bottom'))
		} catch (e) {
			return 0;
		}
	}

	$.getElementFullHeight = function(el, cs) {
		try {
			cs = cs || window.getComputedStyle(el, null);
			return this.getElementExtensionalY(el, cs) + parseInt(cs.getPropertyValue('height'));
		} catch (e) {
			return 0;
		}
	}
	
	$.getElementMargin = function(el, cs) {
		try {
			cs = cs || window.getComputedStyle(el, null);
			return [
				parseInt(cs.getPropertyValue('margin-top')),
				parseInt(cs.getPropertyValue('margin-right')),
				parseInt(cs.getPropertyValue('margin-bottom')),
				parseInt(cs.getPropertyValue('margin-left'))
				];
		} catch (e) {
			return [0, 0, 0, 0];
		}
	}
	
	$.getElementBorder = function(el, cs) {
		cs = cs || window.getComputedStyle(el, null);
		try {
			return [
				parseInt(cs.getPropertyValue('border-top-width')),
				parseInt(cs.getPropertyValue('border-right-width')),
				parseInt(cs.getPropertyValue('border-bottom-width')),
				parseInt(cs.getPropertyValue('border-left-width'))
				];
		} catch (e) {
			return [0, 0, 0, 0];
		}
	}
	
	$.getElementPadding = function(el, cs) {
		cs = cs || window.getComputedStyle(el, null);
		try {
			return [
				parseInt(cs.getPropertyValue('padding-top')),
				parseInt(cs.getPropertyValue('padding-right')),
				parseInt(cs.getPropertyValue('padding-bottom')),
				parseInt(cs.getPropertyValue('padding-left'))
				];
		} catch (e) {
			return [0, 0, 0, 0];
		}
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
	
	$.escapeHTML = function(str) {
		return str.replace(/[&"<>]/g, function (m) {
				return "&" +
					({
						"&" : "amp",
						'"' : "quot",
						"<" : "lt",
						">" : "gt"
					})[m] + ";"
				});
	}

	const Ci = Components.interfaces;
	$.getMainWindow = function() {
		return window.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation)
			.QueryInterface(Ci.nsIDocShellTreeItem)
			.rootTreeItem
			.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIDOMWindow);
	}
})($);
