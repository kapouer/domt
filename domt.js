(function domtModule() {
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Domt;
} else {
	window.Domt = Domt;
}

Domt.toString = function() {
	return '(' + domtModule.toString() + ')()';
};

Domt.ns = {
	id: 'domt',
	repeat: 'repeat',
	bind: 'bind',
	holder: 'holder',
	expr: '[*]'
};

function Filters(obj) {
	addToFilters(this, obj);
}

Domt.filters = Filters.prototype;

function addToFilters(filters, obj) {
	for (var name in obj) {
		if (typeof obj[name] == "function") filters[name] = obj[name];
	}
	return filters;
}

// Value Filters
Filters.prototype.upper = function(val) {
	if (val == null) return val;
	return (val + "").toUpperCase();
};
Filters.prototype.lower = function(val) {
	if (val == null) return val;
	return (val + "").toLowerCase();
};
Filters.prototype.br = function(val) {
	if (val == null) return val;
	return (val + "").replace(/\n/g, "<br />");
};
Filters.prototype.text = function(val) {
	if (val == null) return val;
	return escapeText(val);
};
Filters.prototype.esc = function(val) {
	if (val == null) return val;
	return encodeURIComponent(val + "");
};
Filters.prototype.unesc = function(val) {
	if (val == null) return val;
	return decodeURIComponent(val + "");
};
Filters.prototype.json = function(val) {
	return JSON.stringify(val);
};
Filters.prototype.int = function(val) {
	var n = parseInt(val);
	if (!isNaN(n)) return "";
};
Filters.prototype.float = function(val) {
	var f = parseFloat(val);
	if (!isNaN(f)) return "";
};
Filters.prototype.bool = function(val) {
	if (val) return true;
	else return false;
};
Filters.prototype.att = function(val, context) {
	if (val && context.att) {
		return context.att;
	} else {
		return null;
	}
};
Filters.prototype['!'] = function(val) {
	return !val;
};
Filters.prototype['?'] = function(val) {
	if (val != null && val !== "") return val + '';
	else return null;
};
Filters.prototype.drop = function(val, context) {
	if (val) {
		return val;
	} else if (context.att) {
		context.node.removeAttribute(context.att);
		return null;
	}
};

// Block Filters
Filters.prototype.invert = function(row, key, info) {
	info.head.parentNode.insertBefore(info.node, info.head.nextSibling);
};


var escaper;
function escapeText(str) {
	if (!escaper) {
		escaper = document.createElement('div');
		escaper.appendChild(document.createTextNode(""));
	}
	escaper.firstChild.nodeValue = str;
	return escaper.innerHTML;
}

function match(re, str) {
	var m = re.exec(str);
	if (m && m.length == 2) return m[1];
}

function newId() {
	var num = Domt.seq;
	if (!num) num = Domt.seq = 1;
	var pref = Domt.ns.id;
	var id;
	while (true) {
		id = pref + num++;
		if (!document.getElementById(id)) break;
	}
	Domt.seq = num;
	return id;
}

function Holder(node) {
	if (!(this instanceof Holder)) return new Holder(node);
	var REPEAT = Domt.ns.repeat, BIND = Domt.ns.bind;
	if (node.tagName == "SCRIPT" && node.type == "text/template") {
		this.head = node;
		var orig = node[Domt.ns.holder];
		if (orig) {
			this.repeat = orig.repeat;
			this.template = orig.template;
			this.bind = orig.bind;
			this.tail = orig.tail;
			this.id = orig.id;
		} else {
			this.reload();
		}
		node.removeAttribute(REPEAT);
	} else if (node.hasAttribute(REPEAT)) {
		this.id = newId();
		this.template = node;
		this.head = node.ownerDocument.createElement("script");
		this.head.setAttribute('tail', this.id);
		this.head.type = "text/template";
		this.repeat = node.getAttribute(REPEAT) || "";
		if (node.hasAttribute(BIND)) {
			this.bind = node.getAttribute(BIND);
			node.removeAttribute(BIND);
		}
		node.removeAttribute(REPEAT);
		node.parentNode.insertBefore(this.head, node);
		this.head.text = node.outerHTML;
		this.tail = node.ownerDocument.createElement("script");
		this.tail.id = this.id;
		node.parentNode.insertBefore(this.tail, node);
		node.parentNode.removeChild(node);
	} else {
		if (node.hasAttribute(BIND)) {
			this.bind = node.getAttribute(BIND);
			node.removeAttribute(BIND);
		}
		this.head = node;
	}
	this.head[Domt.ns.holder] = this;
	return this;
}
Holder.prototype.close = function() {
	var node = this.head;
	if (this.repeat !== undefined) {
		node.setAttribute(Domt.ns.repeat, this.repeat);
	}
	if (this.bind !== undefined) {
		node.setAttribute(Domt.ns.bind, this.bind);
	}
};
Holder.prototype.reload = function() {
	var head = this.head;
	this.tail = document.getElementById(head.getAttribute('tail'));
	var REPEAT = Domt.ns.repeat;
	this.repeat = head.getAttribute(REPEAT) || this.repeat || "";
	this.bind = head.getAttribute(Domt.ns.bind) || this.bind || undefined;
	var doc = document.implementation && document.implementation.createHTMLDocument ?
		document.implementation.createHTMLDocument('') : document;
	var div = doc.createElement('div');
	var html = head.text.replace(/^\s+|\s+$/g, '');
	var tagName = match(/<(\w+)[\s>]/i, html);
	if (tagName) {
		tagName = tagName.toLowerCase();
		if (tagName == "td") {
			html = '<table><tr>' + html + '</tr></table>';
		} else if (tagName == "tr") {
			html = '<table>' + html + '</table>';
		}
		div.innerHTML = html;
		this.template = div.querySelector(tagName);
	}
	if (!this.template) throw DomtError("problem parsing template\n" + html);
};

function each(obj, fun) {
	if (obj == null) return 0;
	var i, len;
	if (obj.jquery || Object.prototype.toString.call(obj) === '[object Array]') {
		len = obj.length;
		for (i=0; i < len; i++) fun(obj[i], i);
	} else if (obj.length !== undefined && typeof obj.item == "function") {
		len = obj.length;
		for (i=0; i < len; i++) fun(obj.item(i), i);
	} else if (obj instanceof Object) {
		var keys = Object.keys(obj);
		len = keys.length;
		var key;
		for (i=0; i < len; i++) {
			key = keys[i];
			fun(obj[key], key);
		}
	}
	return len;
}

Domt.each = each;

function Domt(nodes, options) {
	if (!(this instanceof Domt)) return new Domt(nodes, options);
	this.filters = new Filters(options);
	this._nodes = nodes;
	this.reBind = new RegExp("^" + Domt.ns.bind + "-(.*)$", "i");

	var delims = Domt.ns.expr.split('*');
	if (delims.length != 2) throw DomtError("bad Domt.ns.expr");
	var start = '\\' + delims[0], end = '\\' + delims[1];
	this.reExpr = new RegExp(start + '([^' + start + end + ']*)' + end, "g");
}

Domt.prototype.init = function() {
	var nodes = this._nodes;
	delete this._nodes;
	if (typeof nodes == "string") {
		nodes = document.querySelectorAll(nodes);
	} else if (nodes && nodes.nodeType) {
		nodes = [nodes];
	}
	if (!nodes || nodes.length == 0) throw DomtError("Domt has no nodes to merge");
	this.nodes = nodes;
};

Domt.prototype.empty = function() {
	this.merge(undefined, {empty:true});
	return this;
};

Domt.prototype.merge = function(obj, opts) {
	if (this._nodes) this.init();
	opts = opts || {};
	var filters = addToFilters(this.filters, opts);
	var nodes = opts.node ? [opts.node] : this.nodes;
	var that = this;
	each(nodes, function(node) {
		var bound, repeated, h, len, parentNode, curNode, i;
		var parent = node;
		var REPEAT = Domt.ns.repeat;
		var BIND = Domt.ns.bind;
		var holders = [];
		do {
			h = Holder(node);
			holders.push(h);
			parentNode = h.head.parentNode;
			if (h.bind) {
				obj = find(obj, h.bind, undefined, filters, node);
				bound = {};
				bound[obj.name] = obj.val;
				obj = bound;
			} else {
				bound = obj;
			}

			if (h.repeat !== undefined) {
				if (opts.empty) {
					while ((curNode = h.head.nextSibling) && curNode.id != h.tail.id) {
						parentNode.removeChild(curNode);
					}
					// restore holder.template modified by current.value === undefined (see after)
					h.reload();
				}
				var accessor = h.repeat.split('|');
				repeated = find(bound, accessor);
				if (repeated.val === undefined) {
					// merge inside template (that won't be selected because it's now out of the DOM)
					that.merge(bound, {node: h.template});
				} else {
					each(repeated.val, function(val, key) {
						var clone = h.template.ownerDocument != parentNode.ownerDocument && document.importNode ? parentNode.ownerDocument.importNode(h.template, true) : h.template.cloneNode(true);
						bound[repeated.name] = val;
						that.replace(bound, clone, key);
						bound[repeated.name] = repeated.val;
						var insertNode = true;
						for (var i=1; i < accessor.length; i++) {
							var bfilter = filters[accessor[i]];
							if (!bfilter) continue;
							var maybe = bfilter(val, key, {
								parent: h.head.parentNode,
								filters: filters,
								node: clone,
								scope:bound,
								path: accessor[0],
								head: h.head,
								tail: h.tail
							});
							if (maybe && maybe.nodeType) clone = maybe;
							else if (maybe === false) {
								insertNode = false;
								break;
							}
						}
						if (insertNode && clone.parentNode == null) {
							if (h.head.parentNode != h.tail.parentNode) throw new Error("Head and tail split");
							parentNode.insertBefore(clone, h.tail);
						}
					});
				}
			} else {
				that.replace(bound, node);
			}
		} while ((node = parent.querySelector('[' + REPEAT + '],[' + BIND + ']')));

		len = holders.length;
		for (i=0; i < len; i++) {
			holders[i].close();
		}
	});
	return this;
};

Domt.prototype.replace = function(obj, node, key) {
	var descendants = node.querySelectorAll('*');
	var i = 0;
	var len = descendants.length;
	var val, reExpr = this.reExpr, reBind = this.reBind;
	var filters = this.filters;
	var willRepeat = {};
	do {
		each(Array.prototype.slice.call(node.attributes, 0), function(att) { // iterates over a copy
			if (att.name == Domt.ns.repeat && att.value) {
				willRepeat[att.value.split('|').shift()] = true;
				return;
			}
			var name = match(reBind, att.name);
			var target;
			if (name == "text" || name == "html") {
				val = node.innerHTML;
			}	else {
				target = name || att.name;
				val = att.value;
			}
			var replacements = 0, initial = val;
			if (att.value) initial = att.value;
			if (initial == null) initial = "";
			// set an attribute that can be removed by filters
			var hadAtt = node.hasAttribute(target);
			if (target && !hadAtt) {
				node.setAttribute(target, "");
			}
			val = initial.replace(reExpr, function(str, path) {
				var accessor = path.split('|');
				if (willRepeat[accessor[0]]) return;
				var repl = find(obj, accessor, key, filters, node, target).val;
				if (repl === undefined || repl !== null && typeof repl == "object") return "";
				replacements++;
				if (repl == null) return "";
				else if (name == "text") return escapeText(repl);
				else return repl;
			});
			function clean() {
				if (!hadAtt && target) {
					node.removeAttribute(target);
				}
			}
			if (replacements) {
				// set bind-<name> attribute to be able to merge again
				if (!att.value) att.value = initial;
				if (!name) {
					name = target;
					if (key == null) {
						node.setAttribute(Domt.ns.bind + '-' + target, initial);
					}
				}
			} else {
				var accessor = (att.value || "").split('|');
				if (willRepeat[accessor[0]]) {
					return clean();
				}
				if (att.name == Domt.ns.bind) {
					return clean();
				}
				val = find(obj, accessor, key, filters, node, target).val;
				if (name == "text" && val != null && typeof val != "object") val = escapeText(val);
			}
			if (name) {
				if (replace(node, name, val)) {
					replacements++;
				}
			}
			if (!replacements) clean();
			if (replacements && key != null && name != att.name) {
				// get rid of initial attributes in a repeated block
				node.removeAttribute(att.name);
			}
		});
	} while (i < len && (node = descendants.item(i++)));
};

function replace(node, name, val) {
	if (val === undefined || val !== null && typeof val == "object") {
		return false;
	}
	if (name == "text" || name == "html") {
		node.innerHTML = val == null ? "" : val;
	} else if (node.hasAttribute(name)) {
		if (val !== null) node.setAttribute(name, val);
		else node.removeAttribute(name);
	} else {
		// no replacement because attribute was removed
		return false;
	}
	return true;
}

function find(scope, accessor, key, filters, node, att) {
	var name, last, val = scope, prev = scope, filter;
	if (!accessor) accessor = [];
	else if (typeof accessor == "string") accessor = accessor.split('|');
	var path = accessor[0];
	if (scope == null) {
		if (path) val = undefined;
		return {val: val};
	}
	path = path ? path.split('.') : [];
	if (typeof val == "function") val = val(scope, path);
	var first = true;
	for (var index = 0; index < path.length; index++) {
		name = path[index];
		prev = val;
		if (key !== undefined && path.length == index + 1) {
			if (name == '#key') {
				val = key;
				break;
			} else if (name == '#val') {
				break;
			}
		}
		if (!prev || name == "" && !(typeof prev == "object")) break;
		val = prev[name];
		if (first) {
			first = false;
			if (val === undefined) {
				return {val: val};
			}
		}
		if (typeof val == "function") val = val(prev, path);
		last = name;
	}
	if (filters) for (var i=1; i < accessor.length; i++) {
		filter = filters[accessor[i]];
		if (filter) val = filter(val, {node: node, att: att, filters: filters, scope:scope, index:index-1, path:path, name: last});
	}
	if (last == null) last = "";
	return {name: last, val: val};
}

function DomtError(message) {
	var error = new Error(message);
	error.name = arguments.callee.name;
	return error;
}

})();
