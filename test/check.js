function check(id, data) {
	Domt('#'+id).merge(data);
	var actual = document.getElementById(id);
	if (!actual) throw new Error("Missing node with id " + id);
	actual = actual.cloneNode(true);
	actual.removeAttribute('id');

	id = 'expected-' + id;
	var expected = document.getElementById(id);
	if (!expected) {
		console.error(actual.outerHTML);
		throw new Error("Missing expected node with id " + id);
	}
	expected = expected.cloneNode(true);
	expected.removeAttribute('id');

	actual = actual && actual.outerHTML;
	expected =  expected && expected.outerHTML;

	if (window.assert) window.assert.equal(actual, expected);
	else if (actual != expected) throw new Error("failed check\n" + actual + "\n\n" + expected);
}
