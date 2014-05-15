(function() {
window.Domt = Domt;

Domt.Error = DomtError;
Domt.ns = {
	repeat: 'repeat',
	bind: 'bind'
};

Domt.filters = {
	upper: function(val) {
		return Object.prototype.toString(val).toUpperCase();
	},
	lower: function(val) {
		return Object.prototype.toString(val).toLowerCase();
	}
};


function Holder(node) {
	if (!(this instanceof Holder)) return new Holder(node);
	this.node = node;
}
Holder.prototype.open = function() {
	// returns the node "caret" template, which is the template container
	// which has a copy of the repeat attribute that was set on the original
	// template node, itself being inside the caret and without the repeat
	// attribute
	var container, node = this.node;
	if (node.tagName == "SCRIPT" && node.type == "text/template") {
		container = node;
		container.repeat = container.getAttribute(Domt.ns.repeat);
		container.removeAttribute(Domt.ns.repeat);
		if (container.template) {
			node = container.template;
		}	else {
			var doc = document.implementation.createHTMLDocument();
			var div = doc.createElement('div');
			div.innerHTML = container.text.replace(/^\s+|\s+$/g, '');
			var childs = div.childNodes;
			if (childs.length == 1) {
				node = childs[0];
			}	else throw new DomtError("template with children 1 != " + childs.length);
		}
	} else {
		container = document.createElement("script");
		container.type = "text/template";
		container.repeat = node.getAttribute(Domt.ns.repeat);
		node.removeAttribute(Domt.ns.repeat);
		node.parentNode.insertBefore(container, node);
		var div = document.createElement("div");
		div.appendChild(node);
		container.text = div.innerHTML;
	}
	this.container = container;
	this.template = container.template = node;
	return this;
};
Holder.prototype.close = function() {
	var node = this.container;
	if (node.repeat !== undefined) {
		node.setAttribute(Domt.ns.repeat, node.repeat);
		delete node.repeat;
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
	if (!parent) throw new DomtError("missing parent");
	if (typeof parent == "string") {
		parent = document.querySelector(parent);
	}
	this.parent = parent;
};

Domt.prototype.merge = function(obj, opts) {
	var node, current, holder, container, path, i, len,
		parent = this.parent;
	opts = opts || {};
	if (!opts.norepeat) {
		// repeat
		var REPEAT = '[' + Domt.ns.repeat + ']';
		if (parent.hasAttribute(Domt.ns.repeat)) node = parent;
		var holders = [];
		do {
			if (!node) continue;
			holder = Holder(node).open();
			holders.push(holder);
			container = holder.container;
			path = container.repeat;
			// get data
			current = find(obj, path);
			if (current.value === undefined) {
				// nothing to repeat, merge and restore repeat
				Domt(holder.template).merge(obj, {norepeat: true});
			} else iterate(current.value, function(key, val) {
				var clone = holder.template.cloneNode();
				Domt(clone).merge(val, {strip: true});
				container.parentNode.insertBefore(clone, container);
			});
		} while ((node = parent.querySelector(REPEAT)));

		len = holders.length;
		for (i=0; i < len; i++) {
			holders[i].close();
		}
	}

	var regBind = new RegExp("^" + Domt.ns.bind + "-(.*)$", "i");
	var binds = parent.querySelectorAll('[' + Domt.ns.bind + ']');
	node = parent;
	i = 0;
	len = binds.length;
	do {
		path = node.getAttribute(Domt.ns.bind);
		current = find(obj, path);
		if (current.value === undefined) continue;
		iterate(node.attributes, function(i, att) { // iterates over a copy
			var match = regBind.exec(att.name);
			if (!match || match.length != 2) return;
			if (opts.strip) node.removeAttribute(att.name);
			var name = match[1];
			var val = find(current.value, att.value).value;
			if (val === undefined) return;
			if (name == "text") node.innerText = val;
			else if (name == "html") node.innerHTML = val;
			else if (val !== null) node.setAttribute(name, val);
			else node.removeAttribute(name);
		});
	} while (i < len && (node = binds.item(i++)));
	return this;
};

function find(scope, path) {
	if (!scope) return {scope: scope};
	var name, val = scope, initial = val, filter;
	path = path.split('|');
	if (path.length == 2) filter = Domt.filters[path[1]];
	path = path[0] ? path[0].split('.') : [];
	if (typeof val == "function") val = val(scope, path);
	while ((name = path.shift()) !== undefined) {
		scope = val;
		val = scope[name];
		if (typeof val == "function") val = val(scope, path);
		if (!val) break;
	}
	return {
		scope: scope,
		value: filter ? filter(val) : val
	};
};


function DomtError(message) {
  this.name = arguments.callee.name;
  this.message = message;
}
DomtError.prototype = new Error();
DomtError.prototype.constructor = DomtError;


})();
