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

if (!window.assert) window.assert = {equal: function(actual, expected) {
	if (actual != expected) {
		throw new Error("Actual\n" + actual + "\n\nExpected\n" + expected);
	}
}};

Domt.prototype.check = function(expectedId) {
	var actual = this.nodes;
	if (actual.length != 1) {
		throw new Error("domt.check() only works with one target node instead of " + actual.length);
	}
	actual = actual[0];
	var id = actual.id;
	if (!actual) throw new Error("Missing node with id " + id);
	actual = actual.cloneNode(true);
	actual.removeAttribute('id');

	expectedId = expectedId || 'expected-' + id;
	var expected = document.getElementById(expectedId);
	if (!expected) {
		console.error(actual.outerHTML);
		throw new Error("Missing expected node with id " + expectedId);
	}
	expected = expected.cloneNode(true);
	expected.removeAttribute('id');

	actual = actual && actual.outerHTML;
	expected =  expected && expected.outerHTML;

	if (!actual && !expected) throw new Error("void check " + id + " " + expectedId);

	actual = changeIdNum(actual, "X");

	window.assert.equal(actual, expected);
}

window.changeIdNum = function(htmlStr, id) {
	return htmlStr.replace(/(tail="domt)(\d+)(")/g, "$1"+id+"$3").replace(/(id="domt)(\d+)(")/g, "$1"+id+"$3");
};
