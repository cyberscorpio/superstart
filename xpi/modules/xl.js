/**
 * oPEN sOUrCEd AS BSD lIcENSE
 *
 * xl javascript library
 *
 * Homepage: http://code.google.com/p/xljs/
 */
// note that all unused parts are removed to reduce the size
var EXPORTED_SYMBOLS = [ "xl" ];
var xl = {};

(function(_xl) {
	function _Observerable() {
		var observers = {};
		var cache = {};
		var dirty = {};

		function rebuildCache (evt) {
			delete dirty[evt];
			delete cache[evt];
	
			var tmp = [];
			var ps = [];
			for (var p in observers[evt]) {
				ps.push(p);
			}
			ps.sort();
	
			for (var i = 0; i < ps.length; ++ i) {
				var p = ps[i];
				var list = observers[evt][p];
				if (list.length == 0) {
					delete observers[evt][p];
				} else {
					for (var j = 0; j < list.length; ++ j) {
						tmp.push(list[j]);
					}
				}
			}
	
			if (tmp.length == 0) {
				delete observers[evt];
			} else {
				cache[evt] = tmp;
			}
		}
	
		function find (evt, cb) {
			var priority = undefined;
			var cbs = observers[evt];
			for (var k in cbs) {
				var list = cbs[k];
				for (var i = 0; i < list.length; ++ i) {
					if (list[i] == cb) {
						priority = k;
						break;
					}
				}
				if (priority != undefined) {
					break;
				}
			}
	
			return priority;
		}
	
		this.subscribe = function (evt, cb, priority) {
			if (find(evt, cb) != undefined) {
				return this;
			}
	
			priority = priority || _Observerable.PRIORITY_NORMAL;
			priority = xl.utils.limit(priority, _Observerable.PRIORITY_HIGHEST, _Observerable.PRIORITY_LOWEST);
			priority -= 0;
	
			observers[evt] = observers[evt] || {};
			observers[evt][priority] = observers[evt][priority] || [];
	
			observers[evt][priority].push(cb);
			dirty[evt] = true;
	
			return this;
		}
	
		this.unsubscribe = function (evt, cb, priority) {
			var cbs = observers[evt];
			if (priority == undefined) {
				priority = find(evt, cb);
			}
	
			if (priority == undefined || cbs[priority] == undefined) {
				return this;
			}
	
			var list = cbs[priority];
			for (var i = 0; i < list.length; ++ i) {
				if (list[i] == cb) {
					list.splice(i, 1);
					dirty[evt] = true;
					break;
				}
			}
	
			return this;
		}
	
		this.fireEvent = function (evt, param) {
			if (dirty[evt]) {
				rebuildCache(evt);
			}
	
			var cbs = cache[evt];
			if (cbs != undefined) {
				for (var i = 0; i < cbs.length; ++ i) {
					try {
						if (cbs[i](evt, param, this) === false) {
							break;
						}
					} catch (e) {
						this.fireEvent('EXCEPTION', e);
					}
				}
			}
	
			return this;
		}
	}
	_Observerable.PRIORITY_HIGHEST = 1;
	_Observerable.PRIORITY_NORMAL = 10;
	_Observerable.PRIORITY_LOWEST = 100;

	_xl.Observerable = _Observerable;

	_xl.utils = {
		'limit' : function (v, min, max) {
			if (v < min) {
				v = min;
			}
	
			if (v > max) {
				v = max;
			}
	
			return v;
		},

		'template' : function (tpl, obj, keepIfKeyNonexists) {
			keepIfKeyNonexists = (keepIfKeyNonexists === undefined ? true : keepIfKeyNonexists);
			var ret = '', start = 0, ps1, ps2, key, keys, found, tmp;
			while (true) {
				ps1 = tpl.indexOf('%', start);
				if (ps1 == -1) {
					ret += tpl.substring(start);
					break;
				}

				ret += tpl.substring(start, ps1);
				ps2 = tpl.indexOf('%', ps1 + 1);
				if (ps2 == ps1 + 1) {
					ret += '%';
				} else if (ps2 != -1) {
					key = tpl.substring(ps1 + 1, ps2);
					if (key in obj) {
						ret += obj[key];
					} else {
						found = false;
						if (key.indexOf('.') != -1) {
							found = true;
							keys = key.split('.');
							tmp = obj;
							for (var i = 0, l = keys.length; i < l; ++ i) {
								if (keys[i] in tmp) {
									tmp = tmp[keys[i]];
								} else {
									found = false;
									break;
								}
							}

							if (found) {
								ret += tmp;
							}
						}

						if (!found) {
							if (keepIfKeyNonexists) {
								ret += tpl.substring(ps1, ps2 + 1);
							}
						}
					}
				} else {
					ret += tpl.substring(ps1);
					break;
				}

				start = ps2 + 1;
			}
			return ret;
		}
	};
})(xl);

