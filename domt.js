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
	var container, REPEAT = Domt.ns.repeat;
	if (node.tagName == "SCRIPT" && node.type == "text/template") {
		this.container = container = node;
		var origHolder = node[Domt.ns.holder];
		if (origHolder) {
			this.repeat = origHolder.repeat;
			this.template = origHolder.template;
			this.invert = origHolder.invert;
		} else {
			this.reload();
		}
		node.removeAttribute(REPEAT);
	} else {
		this.template = node;
		this.container = container = document.createElement("script");
		container.type = "text/template";
		this.repeat = node.getAttribute(REPEAT) || "";
		this.invert = node.hasAttribute(REPEAT + '-invert');
		if (this.invert) container.setAttribute(REPEAT + '-invert', "");
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
	}
	container[Domt.ns.holder] = this;
	return this;
};
Holder.prototype.close = function() {
	var node = this.container;
	if (this.repeat !== undefined) {
		node.setAttribute(Domt.ns.repeat, this.repeat);
	}
};
Holder.prototype.reload = function() {
	var container = this.container;
	var REPEAT = Domt.ns.repeat;
	this.repeat = container.getAttribute(REPEAT) || this.repeat || "";
	this.invert = container.hasAttribute(REPEAT + '-invert') || this.invert;
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
			fun(key, {key: key, val: obj[key]});
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
	this.reExpr = new RegExp(start + '([^' + start + end + ']+)' + end, "g");
};

Domt.prototype.empty = function() {
	this.merge(null, {empty:true});
	return this;
};

Domt.prototype.merge = function(obj, opts) {
	var node, current, holder, container, path, i, len, parentNode, curNode;
	var parent = this.node;
	opts = opts || {};
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
			// restore holder.template modified by current.value === undefined (see after)
			holder.reload();
		}
		if (current.value === undefined) {
			// nothing to repeat, merge and save for later
			Domt(holder.template).merge(obj);
		} else {
			iterate(current.value, function(key, val) {
				var clone = holder.template.cloneNode(true);
				Domt(clone).merge(val, {strip: true});
				parentNode.insertBefore(clone, holder.invert ? container.nextSibling : container);
			});
		}
	} while ((node = parent.querySelector('[' + REPEAT + ']')));

	len = holders.length;
	for (i=0; i < len; i++) {
		holders[i].close();
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
		var added = 0;
		iterate(node.attributes, function(index, att) { // iterates over a copy
			var name = match(reBind, att.name);
			if (!name) return;
			if (opts.strip) {
				node.removeAttribute(att.name);
			}
			if (name == "text") {
				val = node.textContent || node.innerText;
			} else if (name == "html") {
				val = node.innerHTML;
			}	else {
				val = node.getAttribute(name);
				if (opts.strip && match(reBind, name)) added += 1;
			}
			var replacements = 0, initial = val;
			if (att.value) initial = att.value;
			if (initial == null) initial = "";
			val = initial.replace(reExpr, function(str, path) {
				var repl = find(current.value, path).value;
				if (repl === undefined) return "";
				replacements++;
				if (repl == null) return "";
				else return repl;
			});
			if (replacements) {
				if (!att.value) att.value = initial;
			} else {
				val = find(current.value, att.value).value;
			}
			replace(node, name, val);
		});
		if (opts.strip && !added) node.removeAttribute(Domt.ns.bind);
	} while (i < len && (node = binds.item(i++)));
	return this;
};

function replace(node, name, val) {
	if (val === undefined) return;
	if (val != null && val.toString && val.toString() == "[object Object]") val = "";
	if (name == "text") {
		if ("textContent" in node) node.textContent = val;
		else node.innerText = val;
	} else if (name == "html") node.innerHTML = val;
	else if (val !== null) node.setAttribute(name, val);
	else node.removeAttribute(name);
}

function find(scope, path) {
	var name, val = scope, filters, filter;
	if (scope == null) {
		if (path) val = undefined;
		return {scope: scope, value: val};
	}
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
	var error = new Error(message);
	error.name = arguments.callee.name;
	return error;
}

})();
