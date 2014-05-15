(function() {
window.Domt = Domt;

Domt.Error = DomtError;
Domt.ns = {
	repeat: 'repeat',
	bind: 'bind',
	id: 'template'
};


function initHolder(node) {
	// returns the node "caret" template, which is the template container
	// which has a copy of the repeat attribute that was set on the original
	// template node, itself being inside the caret and without the repeat
	// attribute
	var container;
	if (node.tagName == "SCRIPT" && node.type == "text/template") {
		container = node;
		container.repeat = container.getAttribute(Domt.ns.repeat);
		container.removeAttribute(Domt.ns.repeat);
		var doc = document.implementation.createHTMLDocument();
		var div = doc.createElement('div');
		div.innerHTML = container.text.replace(/^\s+|\s+$/g, '');
		var childs = div.childNodes;
		if (childs.length == 1) {
			node = childs[0];
		}	else throw new DomtError("template with children 1 != " + childs.length);
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
	return {container: container, template: node};
}

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

function Domt(parent, obj) {
	var node, current, holder, container, path, i, len;
	if (typeof parent == "string") {
		parent = document.querySelector(parent);
	}
	if (!parent) throw new DomtError("missing parent");
	// repeat
	var REPEAT = '[' + Domt.ns.repeat + ']';
	if (parent.hasAttribute(Domt.ns.repeat)) node = parent;
	var list = [];
	do {
		if (!node) continue;
		holder = initHolder(node);
		container = holder.container;
		list.push(container);
		path = container.repeat;
		// get data
		current = find(obj, path);
		if (current.value === undefined) continue;
		// repeat
		iterate(current.value, function(key, val) {
			var clone = holder.template.cloneNode();
			Domt(clone, val);
			container.parentNode.insertBefore(clone, container);
		});
	} while ((node = parent.querySelector(REPEAT)));

	len = list.length;
	for (i=0; i < len; i++) {
		container = list[i];
		container.setAttribute(Domt.ns.repeat, container.repeat);
		delete container.repeat;
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
			node.removeAttribute(att.name);
			var name = match[1];
			var val = find(current.value, att.value).value;
			if (val === undefined) return;
			if (name == "text") node.innerText = val;
			else if (name == "html") node.innerHTML = val;
			else if (val !== null) node.setAttribute(name, val);
			else node.removeAttribute(name);
		});
	} while (i < len && (node = binds.item(i++)));
};

function find(scope, path) {
	if (!scope) return {scope: scope};
	var name, val = scope, initial = val;
	path = path ? path.split('.') : [];
	if (typeof val == "function") val = val(scope, path);
	while ((name = path.shift()) !== undefined) {
		scope = val;
		val = scope[name];
		if (typeof val == "function") val = val(scope, path, name);
		if (!val) break;
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
DomtError.prototype = new Error();
DomtError.prototype.constructor = DomtError;


})();
