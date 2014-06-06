domt -- simple DOM Templating tool
=====================================

Merge plain javascript objects into DOM.

Support following workflow :

* add attributes to static html document
* merge data using DOM
* serialize document
* reload document later and merge new data using DOM

And stick with these constraints :

* light (4.8KB minified)
* simple
* thorough test suites
* force separation between logic (js), template (html), and data (obj)
* cross browsers - a legacy.js file is provided for < IE9
* extensible


Quick start
-----------

Starting with a template and a call to Domt:

  <div id="test" bind-class="class">
    <ul>
      <li repeat="items" class="red" bind-class="items.color" bind-text="items.text">first item</li>
    </ul>
  </div>

  <script type="text/javascript">
    Domt('#test').merge({
      "class": "list",
      items: [
        {color: "blue", text: "the sea"},
        {color: null, text: "the void"}
      ]
    });
  </script>

We get:

  <div id="test" class="list" bind-class="class">
    <ul>
      <script repeat-tail="true" type="text/template"></script>
      <li class="blue">the sea</li>
      <li>the void</li>
      <script type="text/template" repeat="items">
        <li class="red" bind-class="items.color" bind-text="items.text">first item</li>
      </script>
    </ul>
  </div>

The API is chainable and calling it a second time is possible:

  Domt('#test').merge({
    "class": "list"
  }).merge({
    items: [
      {color: "blue", text: "the sea"},
      {color: null, text: "the void"}
    ]
  });

One can create another instance of Domt to update a previously merged node:

  Domt('#test').merge({
    "class": null
  }).merge({
    items: [
      {color: "red", text: "another one"}
    ]
  });

The second call with remove attribute "class" from #test, and append a
list item named "another one".

It is also possible to empty the repeated lists:

  Domt('#test').empty().merge({
    items: [
      {color: "red", text: "another one"}
    ]
  });


Which DOM nodes are processed ?
-------------------------------

* the target given as argument of Domt(target)

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

* bind-<attributeName>
  where attribute is the name of the attribute to process.

* bind-text
  node.innerHTML = <escaped_text(value)>

* bind-html
  node.innerHTML = <value>

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

A node is repeated in natural order. To invert that order, just add an
empty "repeat-invert" attribute like this:

  <ul>
    <li repeat="items" repeat-invert bind-text="items.text">first item</li>
  </ul>

Note that if node contains other nodes that are targets of Domt,
the usage of bind-html or bind-text on that parent node is not defined.
It is strongly advised to avoid that situation:

  <p bind-text>
    [data.text]
    <a bind-href="data.href">link</a>
  </p>

Instead, wrap the first text node in a span:

  <p>
    <span bind-text>[data.text]</span>
    <a bind-href="data.href">link</a>
  </p>


Global settings
---------------

Domt.ns object is used to set the prefixes used for the attribute names,
or change delimiters, like this:

  Domt.ns.expr = '{{*}}';

Domt.filters stores filters prototype (shared by all domt.filters instances).
To add per-instance filters, use either

  Domt(parent, {
    myFilter: function(str) {
      return '<b>' + this.text(str) + '</b>';
    }
  })

or

  var inst = Domt(parent);
  inst.filters.myFilter = function(str) {...};

In a filter function, `this` refers to `instance.filters` so it is easy
to call other filters.


Data getters
------------

As mentioned above, merging a function will call it with parameters
(obj, paths). This cannot be used to modify the DOM, only the data.


Filters
-------

Filters are called before merging the value in the target.
A filter is a simple function returning a string.

  Domt.filters.myfilter = function(val) {
    return "my" + val;
  };

In the above example, data|myfilter always return something defined,
meaning the merge will happen even if val === undefined.

Some filters are already availables:

* upper, lower: change string case
* br: replace newlines by <br>
* text: escape html, the combination text|br is useful
* esc: encodeURIComponent
* unesc: decodeURIComponent
* json: JSON.stringify(val)
* : returns null if value is undefined
* no: returns empty string if value is null-ish, otherwise returns null

Note that escaping xml entities is usually not needed because we use the
DOM methods and they do the conversions for us.

Filters can accept objects as well, see test/replacement.html.


Tables
------

It is possible to merge columns, then merge rows, to achieve merging
table data with arbitrary columns.
There's an example of this in
test/repeat.html#should repeat within repeat

