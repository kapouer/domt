(function domtModule() {
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Domt;
} else {
	window.Domt = Domt;
}

Domt.toString = function() {
	return '(' + domtModule.toString() + ')()';
};

Domt.version = 4;

Domt.ns = {
	id: 'domt',
	repeat: 'repeat',
	with: 'repeat-with',
	name: 'repeat-name',
	bind: 'bind',
	prefix: 'bind-',
	lookup: 'domt',
	expr: '[*]',
	query: ['html', 'text', 'src', 'href', 'lowsrc', 'srcset', 'class', 'value', 'data', 'action', 'hidden', 'id', 'name', 'style']
};

Domt.maxloops = 10000;

var templates = {};

function Filters(obj) {
	addToFilters(this, obj);
}

var Fp = Domt.filters = Filters.prototype;

function addToFilters(filters, obj) {
	for (var name in obj) {
		if (typeof obj[name] == "function") filters[name] = obj[name];
	}
	return filters;
}

// Value Filters
Fp.upper = function(val) {
	if (val == null) return val;
	return (val + "").toUpperCase();
};
Fp.lower = function(val) {
	if (val == null) return val;
	return (val + "").toLowerCase();
};
Fp.br = function(val) {
	if (val == null) return val;
	return (val + "").replace(/\n/g, "<br />");
};
Fp.text = function(val) {
	if (val == null) return val;
	return escapeText(val);
};
Fp.esc = function(val) {
	if (val == null) return val;
	return encodeURIComponent(val + "");
};
Fp.unesc = function(val) {
	if (val == null) return val;
	return decodeURIComponent(val + "");
};
Fp.json = function(val) {
	return JSON.stringify(val);
};
Fp.int = function(val) {
	var n = parseInt(val);
	if (!isNaN(n)) return "";
};
Fp.float = function(val) {
	var f = parseFloat(val);
	if (!isNaN(f)) return "";
};
Fp.bool = function(val) {
	if (val) return true;
	else return false;
};
Fp.att = function(val, context) {
	if (val && context.att) {
		return context.att;
	} else {
		return null;
	}
};
Fp['!'] = function(val) {
	return !val;
};
Fp['?'] = function(val) {
	if (val != null && val !== "") return val + '';
	else return val;
};
Fp.always = function() {
	return true;
};
Fp.never = function() {
	return false;
};
Fp.drop = function(val, context) {
	if (val && context.att) {
		context.node.removeAttribute(context.att);
	}
	return val;
};
Fp.log = function() {
	var args = Array.prototype.slice.call(arguments);
	args.unshift("Domt log");
	Function.prototype.apply.apply(console.log, [console, args]);
};

// Block Filters
Fp.invert = function(row, key, info) {
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

function Template(node) {
	if (!node) throw new DomtError("Missing node in Template constructor");
	var inst = node[Domt.ns.lookup];
	if (inst) {
		inst.open(node);
		return inst;
	}
	if (!(this instanceof Template)) {
		return new Template(node);
	}
	this.attach(node, true);
	return this;
}
Domt.Template = Template;

Template.prototype.open = function(node) {
	if (node.hasAttribute) {
		var REPEAT = Domt.ns.repeat;
		if (node.hasAttribute(REPEAT)) {
			this.repeat = node.getAttribute(REPEAT);
			node.removeAttribute(REPEAT);
		}
		var NAME = Domt.ns.name;
		if (node.hasAttribute(NAME)) {
			this.name = node.getAttribute(NAME);
			templates[this.name] = this;
			node.removeAttribute(NAME);
		}
		var BIND = Domt.ns.bind;
		if (node.hasAttribute(BIND)) {
			this.bind = node.getAttribute(BIND);
			node.removeAttribute(BIND);
		}
	}
};

Template.prototype.init = function(node) {
	var REPEAT = Domt.ns.repeat, WITH = Domt.ns.with;
	var html, fragment, cur, after, copy, replacing = false;

	if (node.nodeType == Node.COMMENT_NODE) {
		html = (node.nodeValue || node.textContent).replace(/\\-\\-/g, "--"); // HTML Comments unescaping
		this.head = node;
		if (!html) {
			if (this.fragment) {
				node = this.fragment;
				replacing = true;
			} else {
				// bad template, just return without tail
				return;
			}
		}
		this.tail = next(this.head, Node.COMMENT_NODE);
		if (!this.tail) {
			// restore it
			this.tail = this.head.ownerDocument.createComment("");
			if (this.head.nextSibling) {
				this.head.parentNode.insertBefore(this.tail, this.head.nextSibling);
			} else {
				this.head.parentNode.appendChild(this.tail);
			}
		}
	} else if (node.nodeName == "SCRIPT") {
		html = node.textContent || node.innerText;
	} else if (node.nodeName == "TEMPLATE" && node.content) {
		this.fragment = node.content;
	}
	if (!html && node.nodeType != 1) {
		// this is somehow weird
	} else if (html) {
		this.fragment = null;
		var fragment = Domt.createFragment();
		var tagName = match(/^\s*<\s*([^\s>]+)[\s>]/i, html);
		var wrapperTag = 'div';
		if (tagName) {
			tagName = tagName.toLowerCase();
			if (tagName == "td") {
				html = '<tr>' + html + '</tr>';
				wrapperTag = "table";
			} else if (tagName == "tr") {
				wrapperTag = "table";
			}
		} else {
			throw new DomtError("No tag found in template", html);
		}

		var div = fragment.ownerDocument.createElement(wrapperTag);
		div.innerHTML = html;
		node = cur = div.querySelector(tagName);
		if (!cur) {
			throw new Error("problem with querySelector here", div.innerHTML, html);
		}
		this.open(cur);
		do {
			after = cur.nextSibling;
			fragment.appendChild(cur);
			cur = after;
		} while (cur);

		var flen = fragment.childNodes.length;

		if (!flen) {
			if (!this.fragment) throw DomtError("Problem parsing template\n" + html);
		} else {
			this.fragment = fragment;
		}
		// if there is more than one node in the fragment, we can't consider
		// this template instance to represent the first node, in particular,
		// the repeat, bind attributes can't be removed and kept in this template
		if (flen > 1) node = fragment;
		if (!this.head) {
			this.head = fragment.ownerDocument.createTextNode("");
			fragment.insertBefore(this.head, fragment.firstChild);
		}
		if (!this.tail) {
			this.tail = fragment.ownerDocument.createTextNode("");
			fragment.appendChild(this.tail);
		}
	} else if (!replacing && node.hasAttribute(REPEAT)) {
		if (node.hasAttribute('id')) {
			console.warn("Repeated nodes should not have an 'id' attribute", node.cloneNode().outerHTML);
		}
		var remove = false;
		var parent = node.parentNode;
		fragment = Domt.createFragment();
		if (!this.head) {
			// browsers do not escape double dashes in comment
			this.head = node.ownerDocument.createComment("");
			parent.insertBefore(this.head, node);
			remove = true;
		}
		var end = after = node;
		html = "";
		do {
			cur = after;
			after = cur.nextSibling;
			if (!after) break;
			if (after.nodeType == Node.TEXT_NODE) {
				continue;
			} else if (after.nodeType != Node.ELEMENT_NODE || !after.hasAttribute(WITH)) {
				break;
			} else {
				end = after;
				after.removeAttribute(WITH);
			}
		} while (after);

		if (!this.tail) {
			this.tail = end.ownerDocument.createComment("");
			if (end.nextSibling) end.parentNode.insertBefore(this.tail, end.nextSibling);
			else end.parentNode.appendChild(this.tail);
		}

		after = node;
		node = null;
		do {
			cur = after;
			after = cur.nextSibling;
			if (remove)	{
				cur.parentNode.removeChild(cur);
			}
			copy = Domt.import(cur, fragment.ownerDocument);
			fragment.appendChild(copy);

			if (cur.nodeType == Node.ELEMENT_NODE) {
				if (!node) node = copy;
				html += cur.outerHTML;
			} else if (cur.nodeType == Node.TEXT_NODE) {
				html += cur.nodeValue;
			} else {
				console.trace("Undealt node type, please report", cur.nodeType, cur.outerHTML || cur.nodeValue);
			}
		} while (cur != end);

		this.fragment = fragment;
		this.head.nodeValue = html.replace(/--/g, "\\-\\-");
	} else if (!replacing) {
		this.head = node;
	}
	this.open(node);
};

Template.prototype.close = function() {
	var head = this.head;
	var parent = head && head.parentNode;
	if (parent && parent.setAttribute) {
		if (this.repeat != null) parent.setAttribute(Domt.ns.lookup, "");
	}
	if (head && head.setAttribute) {
		if (this.repeat != null) head.setAttribute(Domt.ns.repeat, this.repeat);
		if (this.bind != null) head.setAttribute(Domt.ns.bind, this.bind);
		if (this.name != null) head.setAttribute(Domt.ns.name, this.name);
	}
};

Template.prototype.attach = function(node, delayClose) {
	if (typeof node == "string") node = document.querySelector(node);
	if (node) {
		if (node.nodeType != Node.COMMENT_NODE) {
			if (!delayClose) {
				var comment = node.ownerDocument.createComment("");
				node.appendChild(comment);
				if (this.tail) node.appendChild(this.tail);
				this.head = node = comment;
			}
		} else {
			this.head = node;
		}
	}

	this.init(this.head || node);
	if (this.head) {
		this.head[Domt.ns.lookup] = this;
	}
	if (!delayClose && node) this.close();
	return this;
};

Template.prototype.clone = function(node) {
	var copy = new Template({});
	copy.fragment = Domt.import(this.fragment, this.fragment.ownerDocument);
	copy.name = this.name;
	copy.bind = this.bind;
	copy.repeat = this.repeat;
	copy.tail = this.tail && this.tail.cloneNode(true);
	if (node) {
		copy.attach(node);
	} else if (this.head) {
		copy.head = this.head.cloneNode(true);
		copy.head[Domt.ns.lookup] = copy;
	}
	return copy;
};

Template.prototype.merge = function(data, opts) {
	return Domt(this).merge(data, opts);
};

Template.prototype.empty = function() {
	return Domt(this).empty();
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

function Domt(nodes, opts) {
	if (!(this instanceof Domt)) return new Domt(nodes, opts);
	if (!opts) opts = {};
	this.loops = 0;
	this.filters = new Filters(opts);
	this._nodes = nodes;
	this.reBind = new RegExp("^" + Domt.ns.prefix + "(.*)$", "i");
	var atts = [Domt.ns.bind, Domt.ns.repeat].concat(Domt.ns.query);
	var query = opts.query;
	if (query) {
		if (typeof query == "string") query = [query];
		atts = atts.concat(query);
	}
	query = [Domt.ns.bind, Domt.ns.repeat];
	for (var i=0; i < atts.length; i++) {
		query.push(Domt.ns.prefix + atts[i]);
	}
	this.query = '[' + query.join('],[') + ']';
	var delims = Domt.ns.expr.split('*');
	if (delims.length != 2) throw DomtError("bad Domt.ns.expr");
	var start = '\\' + delims[0], end = '\\' + delims[1];
	this.reExpr = new RegExp(start + '([^' + start + end + ']*)' + end, "g");
}

Domt.prototype.init = function() {
	var nodes = this._nodes;
	delete this._nodes;
	if (nodes instanceof Template) {
		if (nodes.head && nodes.head.parentNode) {
			// attached template
			nodes = [nodes.head];
		} else {
			// template as a fragment
			nodes = nodes.fragment;
		}
	} else if (typeof nodes == "string") {
		nodes = document.querySelectorAll(nodes);
	} else if (nodes && !nodes.jquery && nodes.length === undefined && nodes.nodeType != Node.DOCUMENT_FRAGMENT_NODE) {
		nodes = [nodes];
	}
	if (!nodes || nodes.length === 0 || nodes.nodeType == Node.DOCUMENT_FRAGMENT_NODE && nodes.childNodes.length == 0) throw DomtError("Domt has no nodes to merge");
	this.nodes = nodes;
	return this;
};

Domt.template = function(node) {
	if (typeof node == "string") {
		if (templates[node]) return templates[node];
		else node = document.querySelector(node);
	}
	return new Template(node);
};

Domt.prototype.empty = function() {
	this.merge(undefined, {empty:true});
	return this;
};

Domt.prototype.merge = function(obj, opts) {
	if (this._nodes) this.init();
	opts = opts || {};
	var filters = addToFilters(this.filters, opts); // TODO copy current filters
	var nodes = opts.node;
	if (nodes) {
		if (nodes.length == null) nodes = [nodes];
	} else {
		nodes = this.nodes;
	}
	var that = this;
	var REPEAT = Domt.ns.repeat;
	var BIND = Domt.ns.bind;
	var LOOKUP = Domt.ns.lookup;
	if (nodes.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
		nodes = [nodes];
	}
	each(nodes, function(node) {
		if (node.nodeType == Node.TEXT_NODE) return;
		var parent = node;
		if (node.hasAttribute && node.hasAttribute(REPEAT) && !opts.node) {
			// because the repeated node mutates
			console.error("Repeated nodes must not be selected directly", node.cloneNode().outerHTML);
		}
		var cleanStack = [], h;
		do {
			if (that.loops++ > Domt.maxloops) {
				throw new DomtError("Parsing aborted - consider raising Domt.maxloops");
				return;
			}
			if (node.hasAttribute && node.hasAttribute(LOOKUP)) {
				node.removeAttribute(LOOKUP);
				var subnode = node.firstChild;
				while (subnode) {
					if (subnode.nodeType == Node.COMMENT_NODE) {
						h = Template(subnode);
						cleanStack.push(h);
						processNode(subnode, h);
						if (h.tail) {
							subnode = h.tail;
						}
					}
					subnode = subnode.nextSibling;
				}
			}
			h = Template(node);
			cleanStack.push(h);
			processNode(node, h);
		} while (parent.querySelector && (node = parent.querySelector('[' + LOOKUP + '],[' + REPEAT + '],[' + BIND + ']')));

		len = cleanStack.length;
		for (i=0; i < len; i++) {
			cleanStack[i].close();
		}
	});

	function processNode(node, h) {
		var bound, repeated, len, parentNode, curNode, i;
		if (!h) h = {};
		if (h.bind) {
			obj = find(obj, h.bind, undefined, filters, node);
			bound = {};
			bound[obj.name] = obj.val;
			obj = bound;
		} else {
			bound = obj;
		}

		if (h.repeat !== undefined) {
			parentNode = h.head.parentNode;
			if (opts.empty) {
				while ((curNode = h.head.nextSibling) && curNode != h.tail) {
					parentNode.removeChild(curNode);
				}
				// rebuild template from original
				h.attach();
			}
			var accessor = h.repeat.split('|');
			repeated = find(bound, accessor);
			var fragment = h.fragment;

			if (repeated.val === undefined) {
				// h.fragment is out of DOM so it won't be found by querySelector
				that.merge(bound, {node: fragment.childNodes});
			} else {
				each(repeated.val, function(val, key) {
					bound[repeated.name] = val;
					var clone = Domt.createFragment(parentNode.ownerDocument);
					each(fragment.childNodes, function(child) {
						var copy = Domt.import(child, clone.ownerDocument);
						clone.appendChild(copy);
						if (copy.querySelectorAll) {
							that.replace(bound, copy, key);
						}
					});
					bound[repeated.name] = repeated.val;
					var insertNodes = true;
					for (var i=1; i < accessor.length; i++) {
						var bfilter = filters[accessor[i]];
						if (!bfilter) continue;
						var isSingle = clone.childNodes.length == 1;
						var maybe = bfilter(val, key, {
							parent: h.head.parentNode,
							filters: filters,
							node: isSingle ? clone.childNodes.item(0) : clone,
							scope: bound,
							path: accessor[0],
							head: h.head,
							tail: h.tail
						});
						if (maybe && maybe.nodeType) {
							if (maybe.nodeType == Node.DOCUMENT_FRAGMENT_NODE) clone = maybe;
							else if (isSingle) clone.replaceChild(maybe, clone.childNodes.item(0));
							else console.error("Block filter must return a fragment");
						} else if (maybe === false) {
							insertNodes = false;
							break;
						}
					}
					if (!h.head || !h.tail || h.head.parentNode != h.tail.parentNode) {
						throw new Error("Template head or tail error");
					}
					if (insertNodes) while (clone.childNodes.length) {
						parentNode.insertBefore(clone.firstChild, h.tail);
					}
				});
			}
		} else if (node.querySelector) {
			that.replace(bound, node);
		} else if (node.nodeType == Node.COMMENT_NODE && !node.nodeValue) {
			// it's fine to not process a tail
		} else {
			console.error("Unprocessed node", node.nodeType, node.nodeValue);
		}
	}

	return this;
};

Domt.import = function(node, doc) {
	if (!doc) doc = document;
	if (doc.importNode) {
		// do not use cloneNode to work around
		// https://github.com/webcomponents/webcomponentsjs/issues/438#issuecomment-158900997
		return doc.importNode(node, true);
	} else {
		// IE8 would need a polyfill here, like
		// https://gist.github.com/dchambers/0abcec9eaf529f993b9d
		return node.cloneNode(true);
	}
};

Domt.createFragment = function(doc) {
	// template content has a new registry of custom elements
	// http://w3c.github.io/webcomponents/spec/custom/#creating-and-passing-registries
	if (!doc && typeof HTMLTemplateElement == 'function') {
		var template = document.createElement('template');
		if (template.content && template.content.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
			return template.content;
		}
	}
	if (!doc && document.implementation && document.implementation.createHTMLDocument) {
		doc = document.implementation.createHTMLDocument('');
	}
	// IE8 do have a documentFragment that is like a document
	// and also doesn't preload images. Might run scripts, though.
	if (!doc) {
		doc = document;
	}
	return doc.createDocumentFragment();
};

/* only used for debugging */
function fragmentToString(frag) {
	var doc = frag.ownerDocument;
	var div = doc.createElement('div');
	for (var i=0; i < frag.childNodes.length; i++) {
		div.appendChild(frag.childNodes.item(i).cloneNode(true));
	}
	return div.innerHTML;
}

Domt.prototype.import = function(doc) {
	return Domt.import(this.nodes, doc);
};

Domt.prototype.replace = function(obj, node, key) {
	if (!node.querySelectorAll) throw new DomtError("Cannot replace node with type " + node.nodeType);
	var descendants = node.querySelectorAll(this.query);
	var i = 0;
	var len = descendants.length;
	var val, reExpr = this.reExpr, reBind = this.reBind;
	var filters = this.filters;
	var willRepeat = {};
	do {
		each(Array.prototype.slice.call(node.attributes || [], 0), function(att) { // iterates over a copy
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
						node.setAttribute(Domt.ns.prefix + target, initial);
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
		else console.error("Missing filter", accessor[i], "in", accessor);
	}
	if (last == null) last = "";
	return {name: last, val: val};
}

function next(node, nodeType) {
	while (node = node.nextSibling) {
		if (node.nodeType == nodeType) {
			return node;
		}
	}
}

function DomtError(message) {
	var error = new Error(message);
	error.name = arguments.callee.name;
	return error;
}

})();
