var jsdom = require("jsdom");
var fs = require('fs');
var path = require('path');
var assert = require('assert');

fs.readdirSync(__dirname).filter(function(file) {
	if (path.extname(file) != ".html") return;
	var str = fs.readFileSync(path.join(__dirname, file)).toString();
	var doc = jsdom.jsdom(str, null, {features: {
		FetchExternalResources   : false,
		ProcessExternalResources : false
	}});
	var win = doc.parentWindow;
	win.console = console;
	win.describe = describe;
	win.it = it;
	win.assert = assert;

	Array.prototype.forEach.call(doc.querySelectorAll('script'), function(script) {
		if (script.type == "text/template") return;
		try {
			if (script.textContent) {
				win.run(script.textContent);
			} else if (script.src) {
				win.run(fs.readFileSync(path.join(__dirname, script.src)).toString());
			}
		} catch(e) {
			console.error("Error while trying to execute script sourced by\n" + file);
			process.exit(1);
		}
	});
});
