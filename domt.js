(function() {
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Domt;
} else {
	window.Domt = Domt;
}

Domt.ns = {
	repeat: 'repeat',
	bind: 'bind',
	holder: 'holder',
	expr: '[*]'
};

Domt.filters = {
	upper: function(val) {
		return (val + "").toUpperCase();
	},
	lower: function(val) {
		return (val + "").toLowerCase();
	},
	br: function(val) {
		return (val + "").replace(/\n/g, "<br />");
	},
	esc: function(val) {
		return encodeURIComponent(val + "");
	},
	unesc: function(val) {
		return decodeURIComponent(val + "");
	},
	json: function(val) {
		return JSON.stringify(val);
	}
};

function match(re, str) {
	var m = re.exec(str);
	if (m && m.length == 2) return m[1];
}

function Holder(node) {
	if (!(this instanceof Holder)) return new Holder(node);
	var container, REPEAT = Domt.ns.repeat, BIND = Domt.ns.bind;
	if (node.tagName == "SCRIPT" && node.type == "text/template") {
		this.container = container = node;
		var orig = node[Domt.ns.holder];
		if (orig) {
			this.repeat = orig.repeat;
			this.template = orig.template;
			this.invert = orig.invert;
			this.bind = orig.bind;
		} else {
			this.reload();
		}
		node.removeAttribute(REPEAT);
	} else if (node.hasAttribute(REPEAT)) {
		this.template = node;
		this.container = container = document.createElement("script");
		container.type = "text/template";
		this.repeat = node.getAttribute(REPEAT) || "";
		this.invert = node.hasAttribute(REPEAT + '-invert');
		if (this.invert) container.setAttribute(REPEAT + '-invert', "");
		if (node.hasAttribute(BIND)) {
			this.bind = node.getAttribute(BIND);
			node.removeAttribute(BIND);
		}
		node.removeAttribute(REPEAT);
		node.removeAttribute(REPEAT + '-invert');
		node.parentNode.insertBefore(container, node);
		container.text = node.outerHTML;
		node.parentNode.removeChild(node);
		var begin = document.createElement("script");
		begin.setAttribute(Domt.ns.repeat + "-tail", "");
		begin.setAttribute("type", "text/template");
		if (this.invert) {
			if (container.nextSibling) container.parentNode.insertBefore(begin, container.nextSibling);
			else container.parentNode.appendChild(begin);
		} else {
			container.parentNode.insertBefore(begin, container);
		}
	} else {
		if (node.hasAttribute(BIND)) {
			this.bind = node.getAttribute(BIND);
			node.removeAttribute(BIND);
		}
		this.container = container = node;
	}
	container[Domt.ns.holder] = this;
	return this;
};
Holder.prototype.close = function() {
	var node = this.container;
	if (this.repeat !== undefined) {
		node.setAttribute(Domt.ns.repeat, this.repeat);
	}
	if (this.bind !== undefined) {
		node.setAttribute(Domt.ns.bind, this.bind);
	}
};
Holder.prototype.reload = function() {
	var container = this.container;
	var REPEAT = Domt.ns.repeat;
	this.repeat = container.getAttribute(REPEAT) || this.repeat || "";
	this.invert = container.hasAttribute(REPEAT + '-invert') || this.invert;
	this.bind = container.getAttribute(Domt.ns.bind) || this.bind || undefined;
	var doc = document.implementation && document.implementation.createHTMLDocument ?
		document.implementation.createHTMLDocument() : document;
	var div = doc.createElement('div');
	var html = container.text.replace(/^\s+|\s+$/g, '');
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

function iterate(obj, fun) {
	if (obj == null) return 0;
	var i, len;
	if (Object.prototype.toString.call(obj) === '[object Array]') {
		len = obj.length;
		for (i=0; i < len; i++) fun(i, obj[i]);
	} else if (obj.length !== undefined && typeof obj.item == "function") {
		obj = Array.prototype.slice.call(obj, 0);
		len = obj.length;
		for (i=0; i < len; i++) fun(i, obj[i]);
	} else if (obj instanceof Object) {
		var keys = Object.keys(obj);
		len = keys.length;
		var key;
		for (i=0; i < len; i++) {
			key = keys[i];
			fun(key, obj[key]);
		}
	}
	return len;
}

function Domt(parent) {
	if (!(this instanceof Domt)) return new Domt(parent);
	if (typeof parent == "string") {
		parent = document.querySelector(parent);
	}
	if (!parent) throw DomtError("missing parent");
	this.node = parent;

	this.reBind = new RegExp("^" + Domt.ns.bind + "-(.*)$", "i");

	var delims = Domt.ns.expr.split('*');
	if (delims.length != 2) throw DomtError("bad Domt.ns.expr");
	var start = '\\' + delims[0], end = '\\' + delims[1];
	this.reExpr = new RegExp(start + '([^' + start + end + ']*)' + end, "g");
};

Domt.prototype.empty = function() {
	this.merge(null, {empty:true});
	return this;
};

Domt.prototype.merge = function(obj, opts) {
	var bound, repeated, holder, container, path, len, parentNode;
	opts = opts || {};
	var node = opts.node || this.node;
	var parent = node;
	var REPEAT = Domt.ns.repeat;
	var BIND = Domt.ns.bind;
	var holders = [];
	do {
		holder = Holder(node);
		holders.push(holder);
		container = holder.container;
		parentNode = container.parentNode;
		bound = holder.bind ? find(obj, holder.bind) : obj;
		if (holder.repeat !== undefined) {
			repeated = find(bound, holder.repeat);
			if (opts.empty) {
				if (holder.invert) {
					while ((curNode = container.nextSibling) && !curNode.hasAttribute(REPEAT + '-tail')) {
						parentNode.removeChild(curNode);
					}
				} else {
					while ((curNode = container.previousSibling) && !curNode.hasAttribute(REPEAT + '-tail')) {
						parentNode.removeChild(curNode);
					}
				}
				// restore holder.template modified by current.value === undefined (see after)
				holder.reload();
			}
			if (repeated === undefined) {
				// merge inside template (that won't be selected because it's now out of the DOM)
				this.merge(bound, {node: holder.template});
			} else {
				var self = this;
				iterate(repeated, function(key, val) {
					var clone = holder.template.cloneNode(true);
					self.replace(val, clone, key);
					parentNode.insertBefore(clone, holder.invert ? container.nextSibling : container);
				});
			}
		} else {
			this.replace(bound, node);
		}
	} while ((node = parent.querySelector('[' + REPEAT + '],[' + BIND + ']')));

	len = holders.length;
	for (i=0; i < len; i++) {
		holders[i].close();
	}
	return this;
};

Domt.prototype.replace = function(obj, node, key) {
	var descendants = node.querySelectorAll('*');
	var i = 0;
	var len = descendants.length;
	var val, reExpr = this.reExpr, reBind = this.reBind;
	do {
		iterate(node.attributes, function(index, att) { // iterates over a copy
			var name = match(reBind, att.name);
			if (!name) return;
			if (key != null) {
				node.removeAttribute(att.name);
			}
			if (name == "text") {
				val = node.textContent || node.innerText;
			} else if (name == "html") {
				val = node.innerHTML;
			}	else {
				val = node.getAttribute(name);
			}
			var replacements = 0, initial = val;
			if (att.value) initial = att.value;
			if (initial == null) initial = "";
			val = initial.replace(reExpr, function(str, path) {
				var repl = find(obj, path, key);
				if (repl === undefined || repl !== null && typeof repl == "object") return "";
				replacements++;
				if (repl == null) return "";
				else return repl;
			});
			if (replacements) {
				if (!att.value) att.value = initial;
			} else {
				val = find(obj, att.value, key);
			}
			replace(node, name, val);
		});
	} while (i < len && (node = descendants.item(i++)));
};

function replace(node, name, val) {
	if (val === undefined || val !== null && typeof val == "object") return;
	if (name == "text") {
		if ("textContent" in node) node.textContent = val;
		else node.innerText = val;
	} else if (name == "html") node.innerHTML = val;
	else if (val !== null) node.setAttribute(name, val);
	else node.removeAttribute(name);
}

function find(scope, path, key) {
	var name, val = scope, filters, filter;
	if (scope == null) {
		if (path) val = undefined;
		return val;
	}
	path = (path || "").split('|');
	filters = path;
	path = path.shift();
	path = path ? path.split('.') : [];
	if (typeof val == "function") val = val(scope, path);
	while ((name = path.shift()) !== undefined) {
		scope = val;
		if (name == '#' && key !== undefined && path.length == 0) {
			val = key;
			break;
		}
		val = scope[name];
		if (typeof val == "function") val = val(scope, path);
		if (!val) break;
	}
	if (val != null) {
		for (var i=0; i < filters.length; i++) {
			filter = Domt.filters[filters[i]];
			if (filter) val = filter(val);
		}
	}
	return val;
};


function DomtError(message) {
	var error = new Error(message);
	error.name = arguments.callee.name;
	return error;
}

})();