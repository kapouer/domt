(function() {
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Domt;
} else {
	window.Domt = Domt;
}

Domt.Error = DomtError;
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
	}
};


function Holder(node) {
	if (!(this instanceof Holder)) return new Holder(node);
	var container, REPEAT = Domt.ns.repeat;
	if (node.tagName == "SCRIPT" && node.type == "text/template") {
		container = node;
		var origHolder = node[Domt.ns.holder];
		if (origHolder) {
			this.repeat = origHolder.repeat;
			this.template = origHolder.template;
			this.invert = origHolder.invert;
		} else {
			this.repeat = container.getAttribute(REPEAT);
			this.invert = container.getAttribute(REPEAT + '-invert');
			var doc = document.implementation.createHTMLDocument();
			var div = doc.createElement('div');
			div.innerHTML = container.text.replace(/^\s+|\s+$/g, '');
			var childs = div.childNodes;
			if (childs.length == 1) {
				this.template = childs[0];
			}	else {
				throw new DomtError("template with children 1 != " + childs.length);
			}
		}
		container.removeAttribute(REPEAT);
	} else {
		this.template = node;
		container = document.createElement("script");
		container.type = "text/template";
		this.repeat = node.getAttribute(REPEAT);
		this.invert = node.getAttribute(REPEAT + '-invert');
		if (this.invert) container.setAttribute(REPEAT + '-invert', this.invert);
		node.removeAttribute(REPEAT);
		node.removeAttribute(REPEAT + '-invert');
		node.parentNode.insertBefore(container, node);
		var div = document.createElement("div");
		div.appendChild(node);
		container.text = div.innerHTML;
		var begin = document.createElement("script");
		begin.setAttribute(Domt.ns.repeat + "-tail", true);
		if (this.invert) {
			if (container.nextSibling) container.parentNode.insertBefore(begin, container.nextSibling);
			else container.parentNode.appendChild(begin);
		} else {
			container.parentNode.insertBefore(begin, container);
		}
	}
	this.container = container;
	container[Domt.ns.holder] = this;
	return this;
};
Holder.prototype.close = function() {
	var node = this.container;
	if (this.repeat !== undefined) {
		node.setAttribute(Domt.ns.repeat, this.repeat);
	}
};

function iterate(obj, fun) {
	if (obj == null) return;
	if (Object.prototype.toString.call(obj) === '[object Array]') {
		for (var i=0, len=obj.length; i < len; i++) fun(i, obj[i]);
	} else if (obj.length !== undefined && typeof obj.item == "function") {
		obj = Array.prototype.slice.call(obj, 0);
		for (var i=0, len=obj.length; i < len; i++) fun(i, obj[i]);
	} else if (obj instanceof Object) {
		var keys = obj.keys();
		for (var i=0, len=keys.length; i < len; i++) fun(keys[i], obj[keys[i]]);
	}
};

function Domt(parent) {
	if (!(this instanceof Domt)) return new Domt(parent);
	if (typeof parent == "string") {
		parent = document.querySelector(parent);
	}
	if (!parent) throw new DomtError("missing parent");
	this.parent = parent;

	this.reBind = new RegExp("^" + Domt.ns.bind + "-(.*)$", "i");

	var delims = Domt.ns.expr.split('*');
	if (delims.length != 2) throw new DomtError("bad Domt.ns.expr");
	var start = '\\' + delims[0], end = '\\' + delims[1];
	this.reExpr = new RegExp(start + '([^' + start + end + ']+)' + end, "g");
};

Domt.prototype.merge = function(obj, opts) {
	var node, current, holder, container, path, i, len, parentNode, curNode;
		parent = this.parent;
	opts = opts || {};
	if (!opts.norepeat) {
		// repeat
		var REPEAT = Domt.ns.repeat;
		if (parent.hasAttribute(REPEAT)) node = parent;
		var holders = [];
		do {
			if (!node) continue;
			holder = Holder(node);
			holders.push(holder);
			container = holder.container;
			path = holder.repeat;
			// get data
			current = find(obj, path);
			if (current.value === undefined) {
				// nothing to repeat, merge and restore repeat
				Domt(holder.template).merge(obj, {norepeat: true});
			} else {
				parentNode = container.parentNode;
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
				}
				iterate(current.value, function(key, val) {
					var clone = holder.template.cloneNode();
					Domt(clone).merge(val, {strip: true});
					parentNode.insertBefore(clone, holder.invert ? container.nextSibling : container);
				});
			}
		} while ((node = parent.querySelector('[' + REPEAT + ']')));

		len = holders.length;
		for (i=0; i < len; i++) {
			holders[i].close();
		}
	}

	var binds = parent.querySelectorAll('[' + Domt.ns.bind + ']');
	node = parent;
	i = 0;
	len = binds.length;
	var val, reExpr = this.reExpr, reBind = this.reBind;
	do {
		path = node.getAttribute(Domt.ns.bind);
		current = find(obj, path);
		if (current.value === undefined) continue;
		iterate(node.attributes, function(i, att) { // iterates over a copy
			var match = reBind.exec(att.name);
			if (!match || match.length != 2) return;
			if (opts.strip) node.removeAttribute(att.name);
			var name = match[1];
			if (name == "text") val = node.innerText;
			else if (name == "html") val = node.innerHTML;
			else val = node.getAttribute(name);
			var replacements = 0, initial = val;
			if (att.value) initial = att.value;
			val = initial.replace(reExpr, function(str, path) {
				replacements++;
				return find(current.value, path).value;
			});
			if (replacements) {
				if (!att.value) att.value = initial;
			} else {
				val = find(current.value, att.value).value;
			}
			replace(node, name, val);
		});
	} while (i < len && (node = binds.item(i++)));
	return this;
};

function replace(node, name, val) {
	if (val === undefined) return;
	if (name == "text") node.innerText = val;
	else if (name == "html") node.innerHTML = val;
	else if (val !== null) node.setAttribute(name, val);
	else node.removeAttribute(name);
}

function find(scope, path) {
	if (!scope) return {scope: scope};
	var name, val = scope, filters, filter;
	path = (path || "").split('|');
	filters = path;
	path = path.shift();
	path = path ? path.split('.') : [];
	if (typeof val == "function") val = val(scope, path);
	while ((name = path.shift()) !== undefined) {
		scope = val;
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
	return {
		scope: scope,
		value: val
	};
};


function DomtError(message) {
  this.name = arguments.callee.name;
  this.message = message;
}
DomtError.prototype = Error.prototype;


})();
