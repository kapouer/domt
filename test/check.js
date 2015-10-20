if (!window.describe) {
	window.tests = {};
	window.describe = function(str, suite) {
		console.log(str, "can be run manually by calling");
		suite();
	};
	window.it = function(name, test) {
		console.log('tests["' + name + '"]()');
		tests[name] = test;
	};
}

window.assert = {equal: function(actual, expected) {
	if (actual != expected) {
		throw new Error("Actual\n" + actual + "\n\nExpected\n" + expected);
	}
}};

Domt.prototype.check = function(expectedId) {
	var actual = this.nodes;
	var isFragment = this.nodes.nodeType == Node.DOCUMENT_FRAGMENT_NODE;
	if (!isFragment) {
		if (actual.length != 1) {
			throw new Error("domt.check() only works with one target node instead of " + actual.length);
		}
		actual = actual[0];
		var id = actual.id;
	}
	if (!actual) throw new Error("Missing node when checking against " + expectedId);
	actual = actual.cloneNode(true);
	if (!isFragment) actual.removeAttribute('id');

	expectedId = expectedId || 'expected-' + id;
	var expected = document.getElementById(expectedId);
	if (!expected) {
		console.error(actual.outerHTML);
		throw new Error("Missing expected node with id " + expectedId);
	}
	expected = expected.cloneNode(true);
	expected.removeAttribute('id');


	actual = actual && (isFragment ? fragmentToString(actual) : actual.outerHTML);
	expected =  expected && (isFragment ? expected.innerHTML : expected.outerHTML);

	if (!actual && !expected) throw new Error("void check " + id + " " + expectedId);

	window.assert.equal(actual, expected);
}

function fragmentToString(frag) {
	var div = frag.ownerDocument.createElement("div");
	div.appendChild(frag.cloneNode(true));
	return div.innerHTML;
}
