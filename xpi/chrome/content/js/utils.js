"use strict";
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
var $ = function(e, s, f) {
	if (s === undefined) {
		s = e;
		e = document;
	}
	if (s === '') { // return the element itself
		return f ? e : [e];
	}
	try {
		return f ? e.querySelector(s) : e.querySelectorAll(s);
	} catch (e) {
		return f ? null : [];
	}
};

var $$ = function(id) {
	return document.getElementById(id);
};

var $$$ = function(e, s) {
	if (s === undefined) {
		s = e;
		e = document;
	}
	return $(e, s, true);
};

(function($) {
	$.hasClass = function(el, cls) {
		return el.classList.contains(cls);
	}

	$.addClass = function(el, cls) {
		if (!el.classList.contains(cls)) {
			el.classList.add(cls);
		}
	}

	function _removeClass(el, cls) {
		if (el.classList.contains(cls)) {
			el.classList.remove(cls);
		}
	}

	$.removeClass = function(el, cls) {
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

	$.getPosition = function(el) {
		var rc = el.getBoundingClientRect();
		return {
			left: rc.left + window.pageXOffset,
			top: rc.top + window.pageYOffset,
			width: rc.width,
			height: rc.height
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
		var rc = el.getBoundingClientRect();
		return this.inRect(x, y, rc.left + window.pageXOffset, rc.top + window.pageYOffset, rc.width, rc.height);
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

	$.flip = function(elem, fn) {
		function on90deg(evt) {
			function on0deg(evt) {
				if (evt && this != evt.target) {
					return true;
				}
				this.style.transitionProperty = this.style.transitionDuration = '';
				this.removeAttribute('in-flipping');
			}

			if (evt && this != evt.target) {
				return true;
			}
		
			this.style.transitionProperty = 'none';
			this.style.transform = 'perspective(' + perspective + 'px) rotateY(-90deg)';

			fn();

			var that = this;
			window.setTimeout(function() {
				that.style.transitionProperty = 'transform';
				that.style.transitionDuration = '100ms';
				that.style.transform = '';
				evtMgr.once(that, 'transitionend', on0deg, 150);
			}, 0);
		}

		if (elem.getAttribute('in-flipping')) {
			return false;
		}
		elem.setAttribute('in-flipping', true);
		var perspective = elem.clientWidth * 3;
		elem.style.transitionProperty = 'transform';
		elem.style.transitionDuration = '150ms';
		elem.style.transform = 'perspective(' + perspective + 'px) rotateY(90deg)';
		evtMgr.once(elem, 'transitionend', on90deg, 200);
	}

	$.getMainWindow = function() {
		return Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getMostRecentWindow("navigator:browser");
	}
})($);

