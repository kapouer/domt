domt -- simple DOM Templating tool
==================================

Merge plain javascript objects into DOM.

Support following workflow :

* add template attributes like bind, repeat, or [acc.sess.ors] to static
  html document
* load document, merge data into it using those attributes and fields
* unload document (serialize it)
* reload document later and merge new data

And stick with these constraints :

* light (5.8KB minified)
* simple
* thorough test suites
* force separation between logic (js), template (html), and data (obj)
* pure js and DOM, cross browsers (well, hmm, mostly)
* extensible with filters


Quick start
-----------

Starting with a template and a call to Domt:
```html
<div id="test" bind-class="class">
  <ul>
    <li repeat="items" class="red" bind-class="items.color" bind-text="items.text">first item</li>
  </ul>
</div>
```
```js
  Domt('#test').merge({
    "class": "list",
    items: [
      {color: "blue", text: "the sea"},
      {color: null, text: "the void"}
    ]
  });
```

We get:
```html
<div id="test" class="list" bind-class="class">
  <ul domt="">
    <!--<li repeat="items" class="red" bind-class="items.color" bind-text="items.text">first item</li>-->
    <li class="blue">the sea</li>
    <li>the void</li>
    <!---->
  </ul>
</div>
```

The API is chainable and calling it a second time is possible:
```js
Domt('#test').merge({
  "class": "list"
}).merge({
  items: [
    {color: "blue", text: "the sea"},
    {color: null, text: "the void"}
  ]
});
```

One can create another instance of Domt to update a previously merged node:
```js
Domt('#test').merge({
  "class": null
}).merge({
  items: [
    {color: "red", text: "another one"}
  ]
});
```

The second call with remove attribute "class" from #test, and append a
list item named "another one".

It is also possible to empty the repeated lists:
```js
Domt('#test').empty().merge({
  items: [
    {color: "red", text: "another one"}
  ]
});
```

Domt accepts a jquery object
```js
Domt($('div > .test').not('.out'))
```

Domt accepts a documentFragment
```
Domt(myTemplateNode.content).merge(data).nodes == myTemplateNode.content
```
though in this case one typically would prefer to clone the content fragment.


Attributes
----------

* bind  
  replace current context data with the data found by the accessor in the value.  
  If empty, used as a way to make sure the node will be merged.

* bind-xxx  
  will create a xxx attribute (or merge it if already present)  
  Several attributes are search by default. To add more, just do
  `Domt.query.push('xxx')` so that a node having a `bind-xxx` attribute will
  be found if the only recognizable attribute is this one.

* repeat  
  repeat-with  
  See below.

* repeat-name  
  name a repeated fragment, so that Domt.template(name) return its template.  
  The fragment must have been merged once before.
  Usage: `Domt.template('myfrag').clone().merge(data)`.


Which DOM nodes are processed ?
-------------------------------

Attributes "bind-*" that are not descendents of a node with a "repeat"
attribute are *not* processed unless they have a "bind" (empty or not)
attribute.

Example: `Domt('body').merge({myval: 'test'});` won't merge the span.
Either call Domt on that span, or add a bind attribute to it.

```
<body><div id="test"><span bind-text>[myval]</span></div></body>
```


* the target given as argument of Domt(target)
  target is either a node, a list of nodes, or a selector expression
  supported by document.querySelectorAll.
  instance.nodes keeps the actual list.

* the descendants with attribute "bind"
  in itself the node doesn't change, the "bind" attributes set the current
  base path for all accessors in the same node or its descendants.
  A "bind" attribute is always processed before a "repeat" attribute when
  they are on the same node.
  For example ```<span bind="person.date" bind-text="date.year"></span>```, or
  ```<div bind="article.items|lastTwo" repeat="items">...</div>``` where lastTwo
  is a value filter like `function(val) { return val.slice(-2); }`.

* the descendants with attributes starting with "bind-"
  The attribute value is an object accessor of the form "path.to.key",
  and it can be empty (in which case parent object is used).
  If a value is :
  - undefined or null, obj isn't changed
  - string, path is used as an accessor of obj
  - function, obj is the result of fun(obj, paths)

* the descendants with attribute "repeat"
  repeats the node (and its content) by iterating over accessed data.
  If a value is :
  - undefined or null, obj isn't changed
  - string, path is used as an accessor of obj
  - function, obj is the result of fun(obj, paths)
  Current item has two special properties: #key and #val.
  Accessed data can be iterated if it is :
  - an array
  - an object with length property and .item(i) method
  - finally the object is looped as an hash array

* the next siblings with attribute "repeat-with" of a node with attribute "repeat"
  this allows repeating several nodes at once, as a fragment.  
  When doing this, the block filter context.node argument is a fragment.


Operations on instances
-----------------------

The actual data merging is controled by these attributes:

* bind-/attributeName/
  where attribute is the name of the attribute to process.

* bind-text
  node.innerHTML = escaped_text(value)

* bind-html
  node.innerHTML = value

If a value is :
- undefined, expressions in the target are evaluated
- null, target is removed
- string, target is replaced by the value accessed in obj
- function, the value is replaced by the result of fun(obj, paths)

When merged, a repeated node looses its bind and repeat attributes (but
doesn't remove attributes added by a "bind-bind-att" trick) and
non-repeated nodes keep their bind-* attributes.

Expressions are written as "[path.to.val|optional_filter]" and are
replaced by their accessed value in the target.

A node is repeated in natural order. To invert that order, just add a block
filter like 'invert'. A custom block filter can sort items in any desired order.
```html
<ul>
  <li repeat="items|invert" bind-text="items.text">first item</li>
</ul>
```

Note that if node contains other nodes that are targets of Domt,
the usage of bind-html or bind-text on that parent node is not defined.
It is strongly advised to avoid that situation:
```html
<p bind-text>
  [data.text]
  <a bind-href="data.href">link</a>
</p>
```

Instead, wrap the first text node in a span:
```html
<p>
  <span bind-text>[data.text]</span>
  <a bind-href="data.href">link</a>
</p>
```

Global settings
---------------

Domt.ns object is used to set the prefixes used for the attribute names,
or change delimiters, like this: `Domt.ns.expr = '{{*}}';`.
It's also possible to change the "bind-" prefix and other names, just have
a look in Domt's code and tests to find out about Domt.ns.

Domt.ns.query holds a list of bind-* attributes to search for,
those special ones do not need "repeat" or "bind" to be set at all.
As for filters, query options can be passed in `Domt(node, {query: ["size"]});`,
which will search for nodes having a bind-size attribute.
Note that all attributes of a node are checked when there is one bind, repeat,
or bind-* attribute, so typically
```<input bind-name="form.#key" value="[form.#val]" />```
bothe attributes are merged correctly.

Domt.filters stores filters prototype (shared by all domt.filters instances).
To add per-instance filters, use either
```js
Domt(parent, {
  myFilter: function(str) {
    return '<b>' + this.text(str) + '</b>';
  }
});
```
or
```js
var inst = Domt(parent);
inst.filters.myFilter = function(str) {...};
```
or even
```js
var inst = Domt(parent);
inst.merge(data, {
  myBlockFilter: function(item, key, context) {...}
});
```

In a filter function, the first argument is always the data being merged,
the last argument an object giving some access to current context, see below.


Data getters
------------

As mentioned above, merging a function will call it with parameters
(obj, paths). This cannot be used to modify the DOM, only the data.


Value Filters
-------------

Value filters are called before merging the value in the target.
A value filter is a simple function returning a string.
If the a value (returned by filter or not) is undefined, the target is not merged.
If the a value (returned by filter or not) is null, it is merged as empty string
but if it's an attribute it doesn't create it (use empty string for that).

```js
Domt.filters.myfilter = function(val, context) {
  // this will always merge something since it casts undefined to string
  return "my" + val;
};
```

Where context contains {
  node: the node where the value is being merged,
  att: the name of the target attribute (it cannot be "text" or "html"), if any,
  path: array of path components,
  index: current index in array of path,
  name: the last name of the path before this filter was called,
  scope: the root object being accessed by path,
  filters: the available filters
}

Value filters are not called if the first key in the accessor matches undefined
data. Any other case (> first key, null or empty data) will call the filter.

Some filters are already availables:

* upper : toUpperCase
* lower : toLowerCase
* br    : replace newlines by <br>, to be used with in bind-html.
* text  : escape html, the combination text|br is useful
* esc   : encodeURIComponent
* unesc : decodeURIComponent
* json  : JSON.stringify
* int   : parseInt or ""
* float : parseFloat or ""
* att   : return attribute name if current value evaluates to true
* drop  : remove target attribute if current value evaluates to true - does not
  modify val.
* always: return true
* never : return false
* !     : return !val
* ?     : return val.toString() if it's not empty, else return null or undefined or ""
* log   : log value and context path, name, index

More filters could be written, but they would typically depend on features
like Element.classList or jQuery - they're not fit to be in domt.

Note that escaping xml entities is usually not needed because we use the
DOM methods and they do the conversions for us.

Filters can accept objects as well, see test/replacement.html.


Block Filters
-------------

While value filters are declarable when merging values, a *block* filter can
be declared on the repeated accessor
```html
<ul>
<li repeat="items|myBlockFilter" class="[items|valueFilter]">[items.text]</li>
</ul>
```

Block filters are called after the current data has been merged into the
cloned node and before the cloned node is inserted into the list.

```js
Domt.filters.myBlockFilter = function(row, key, context) {
  if (row.selected) node.selected = true;
  // node can be inserted manually, sibling holds the node before which it would
  // be inserted by default
  context.tail.parentNode.insertBefore(context.node, context.tail); // default insert
  // can be replaced by
  if (row.invalid) {
    // prevent context.node from being inserted into the list
    return false;
  } else {
    var oldnode = document.getElementById(row.nodeid);
    oldnode.parentNode.replaceChild(context.node, oldnode);
   }
};
```

Where context contains {
  node: the documentFragment (or the only child node of it) being merged,
  parent: the parent where the node will be inserted by default,
  path: array of path components,
  index: current index in array of path,
  name: the last name of the path before this filter was called,
  scope: the root object being accessed by path,
  filters: the available filters,
  head: the comment node bounding the start of the list,
  tail: the comment node bounding the end of the list
}

A block filter can control how context.node is going to be inserted:
- by returning a fragment, it replaces the previous fragment
- by returning a new node, it replaces context.node (if there was only one
  node in the fragment)
- by returning false, it prevents context.node from being inserted  
  and it stops further block filters from being called
- by inserting context.node itself somewhere else

Some filters are already available:

* invert: insert nodes in reverse order


Tables
------

It is possible to merge columns, then merge rows, to achieve merging
table data with arbitrary columns.
There's an example of this in
test/repeat.html#should repeat within repeat


Utilities
---------

* Domt.each(obj, iter)  
  obj can be an array, an object, a NodeList, a jQuery object  
  iter is a function with signature (item, index) called on each element of obj.

* Domt.template(name|selector|node)  
  where name is defined by repeat-name.  
  returns an instance of a template, upon which the following methods are useful

* Domt.createFragment(<document>)  
  creates a fragment from given document or from a new context as far as possible

* Domt.import(node, <document>)  
  import a node in a document or fall back to cloneNode

* domt.import(<document>)  
  import current nodes of Domt instance into the given document

* template.head, template.tail, template.fragment  
  the nodes defining a template

* template.attach(selector|element|comment)  
  attach a template to a node.  
  If it is a comment node, it is used as the new head of the fragment.  
  If an element is passed, append a comment node to it and work with it.  
  See test/fragment.html for usages.

* template.clone(selector|element|comment)  
  return a new template with cloned head, fragment and tail  
  See test/fragment.html for usage.

* template.merge(...)  
  alias of `Domt(template).merge(...)`

Access to templates is usefull when they are defined in a place and merged
in another place.
It is possible to merge them outside the DOM, in a DocumentFragment like
```
var inst = Domt.template('myfrag').clone().merge(data);
document.body.appendChild(inst.nodes);
```
or attach them like
`Domt.template('myfrag').clone('#thatid').merge(data)`


Best practices
--------------

# Use bind-data-*

Avoid `<div data-test="[test|json]">` and use
`<div bind-data-test="test|json">` instead - avoiding the risk
of having $(div).data('test') returning "[test|json]", in case
the data wasn't merged.

