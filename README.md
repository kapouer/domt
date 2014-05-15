domt -- simple DOM Templating tool
=====================================

Merge plain javascript objects into DOM.

Support following workflow :

* add attributes to static html document
* merge data using DOM (optionally, from data attributes)
* serialize document (optionally, with data attributes)
* reload document later and merge new data using DOM

And stick with these constraints :

* light
* simple
* keep logic in javascript (using filters and plugins)
* cross browser, no shims
* configurable


Quick start
-----------

Starting with a template and a call to Domt:

  <div id="test" bind-class="class">
    <ul>
      <li repeat="items" class="red" bind-class="color" bind-text="text">first item</li>
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
      <li class="blue">the sea</li>
      <li>the void</li>
      <script type="text/template" repeat="items">
        <li class="red" bind-class="color" bind-text="text">first item</li>
      </script>
    </ul>
  </div>

The API is chainable, also calling it a second time is possible:

  Domt('#test').merge({
    "class": "list"
  }).merge({
    items: [
      {color: "blue", text: "the sea"},
      {color: null, text: "the void"}
    ]
  });
  Domt('#test').merge({
    "class": null
  }).merge({
    items: [
      {color: "red", text: "another one"}
    ]
  });

The second call with remove attribute "class" from #test, and append a
list item named "another one".


Which DOM nodes are processed ?
-------------------------------

The only processed nodes are the ones where one of these two attributes
is set:

* bind = "accessor"
  tells from which object binded variables are the keys
  applies only to the node on which it is declared (not its children).
  Can be empty (in which case parent object is used).
  If a value is :
  - undefined or null, obj isn't changed
  - string, path is used as an accessor of obj
  - function, obj is the result of fun(obj, paths)

* repeat = "accessor"
  repeats the node (and its content) by iterating over the given accessor.
  If a value is :
  - undefined or null, obj isn't changed
  - string, path is used as an accessor of obj
  - function, obj is the result of fun(obj, paths)


Operations on instances
-----------------------

The actual data merging is controled by these attributes:

* bind-<attributeName>
  where attribute is the name of the attribute to process.

* bind-text
  node.innerText = <value>

* bind-html
  node.innerHTML = <value>

If a value is :
- undefined, expressions in the target are evaluated
- null, target is removed
- string, target is replaced by the value accessed in obj
- function, the value is replaced by the result of fun(obj, paths)

When merged, a repeated node looses its bind and repeat attributes,
and non-repeated nodes keep their bind-* attributes.

Expressions are written as "{{path.to.val|optional_filter}}" and are
replaced by their accessed value in the target.


Global settings
---------------

Domt.ns object is used to set the prefixes used for the attribute names.

Domt.filters stores filter functions by name.


Filters
-------

Filters are called before merging the value in the target.
A filter is a simple function returning a string.

  Domt.filters.myfilter = function(val) {
    return "my" + val;
  };
