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
* cross browsers - a legacy.js file is provided for < IE9
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
  <ul>
    <script tail="domt1" type="text/template" repeat="items">
      <li class="red" bind-class="items.color" bind-text="items.text">first item</li>
    </script>
    <li class="blue">the sea</li>
    <li>the void</li>
    <script id="domt1"></script>
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


Which DOM nodes are processed ?
-------------------------------

* the target given as argument of Domt(target)
  target is either a node, a list of nodes, or a selector expression
  supported by document.querySelectorAll.
  instance.nodes keeps the actual list.

* the descendants with attribute "bind"
  in itself the node doesn't change, the "bind" attributes set the current
  base path for all accessors in the same node or its descendants.

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
or change delimiters, like this: `Domt.ns.expr = '{{*}}';`

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

```js
Domt.filters.myfilter = function(val, context) {
  return "my" + val;
};
```

Where context contains {
  node: the node where the value is being merged,
  path: array of path components,
  index: current index in array of path,
  name: the last name of the path before this filter was called,
  scope: the root object being accessed by path,
  filters: the available filters
}

In the above example, data|myfilter always return something defined,
meaning the merge will happen even if val === undefined.

Value filters are not called if the first key in the accessor matches undefined
data. Any other case (> first key, null or empty data) will call the filter.

Some filters are already availables:

* upper, lower: change string case
* br: replace newlines by <br>
* text: escape html, the combination text|br is useful
* esc: encodeURIComponent
* unesc: decodeURIComponent
* json: JSON.stringify(val)
* : (filter name is empty string "") returns null if value is undefined
* no: returns empty string if value is null-ish, otherwise returns null

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
  node: the node where the value is being merged,
  parent: the parent where the node will be inserted by default,
  path: array of path components,
  index: current index in array of path,
  name: the last name of the path before this filter was called,
  scope: the root object being accessed by path,
  filters: the available filters,
  head: the script node bounding the start of the list,
  tail: the script node bounding the end of the list
}

A block filter can control how context.node is going to be inserted:
- by returning a new node, it replaces context.node
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

* Domt.each(obj, iter);  
  obj can be an array, an object, a NodeList, a jQuery object  
  iter is a function with signature (item, index) called on each element of obj.

