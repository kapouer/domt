if (!Object.keys) Object.keys = function(o) {
	if (o !== Object(o)) throw new TypeError('Object.keys called on a non-object');
	var k = [], p;
	for (p in o) if (Object.prototype.hasOwnProperty.call(o,p)) k.push(p);
	return k;
}
(function () {
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
	var _slice = Array.prototype.slice;
	try {
		// Can't be used with DOM elements in IE < 9
		_slice.call(document.documentElement);
	}	catch (e) {
		// Fails in IE < 9
		Array.prototype.slice = function (begin, end) {
			var i, arrl = this.length, a = [];
			// Although IE < 9 does not fail when applying Array.prototype.slice
			// to strings, here we do have to duck-type to avoid failing
			// with IE < 9's lack of support for string indexes
			if (this.charAt) {
				for (i = 0; i < arrl; i++) {
					a.push(this.charAt(i));
				}
			}
			// This will work for genuine arrays, array-like objects,
			// NamedNodeMap (attributes, entities, notations),
			// NodeList (e.g., getElementsByTagName), HTMLCollection (e.g., childNodes),
			// and will not fail on other DOM objects (as do DOM elements in IE < 9)
			else {
				// IE < 9 (at least IE < 9 mode in IE 10) does not work with
				// node.attributes (NamedNodeMap) without a dynamically checked length here
				for (i = 0; i < this.length; i++) {
					a.push(this[i]);
				}
			}
			// IE < 9 gives errors here if end is allowed as undefined
			// (as opposed to just missing) so we default ourselves
			return _slice.call(a, begin, end || a.length);
		};
	}
}());
