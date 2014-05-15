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

Starting with a template and a call to Domin:

  <div class="list">
    <ul>
      <li repeat="items" class="red" bind-class="color" bind-text="text">first item</li>
    </ul>
  </div>

  <script type="text/javascript">
    Domt('.list').merge({
      items: [
        {color: "blue", text: "the sea"},
        {color: null, text: "the void"}
      ]
    });
  </script>

We get:

  <div class="list">
    <ul>
      <li class="blue">the sea</li>
      <li>the void</li>
      <script type="text/template" repeat="items">
        <li class="red" bind-class="color" bind-text="text">first item</li>
      </script>
    </ul>
  </div>

Calling it a second time is possible and will just add the items again:

  <div class="list">
    <ul>
      <li class="blue">the sea</li>
      <li>the void</li>
      <li class="blue">the sea</li>
      <li>the void</li>
      <script type="text/template" repeat="items">
        <li class="red" bind-class="color" bind-text="text">first item</li>
      </script>
    </ul>
  </div>


Which DOM nodes are processed ?
-------------------------------

The only processed nodes are the ones where one of these two attributes
is set:

* bind = "path"
  tells from which object binded variables are the keys
  applies only to the node on which it is declared (not its children).

* repeat = "path"
  repeats the node (and its content) by iterating over the given scope.
  If variable is undefined, do nothing.
  If variable is null or has no keys, the list of nodes is empty.
  If variable is a function, it is called with parameters:
  scope.varname(node, scope, varname)
  and the result is merged like a variable.


Operations on instances
-----------------------

The actual data merging is controled by these attributes:

* bind-<attribute>
  where attribute is the name of the attribute to process.

* bind-text
  node.innerText = <value>

* bind-html
  node.innerHTML = <value>

If one of these attributes is set and has a value, the value is a path
from the current scope.
If one of these attributes is set and has no value, the actual content
of the target (be it innerHTML or an attribute) is parsed and only
[path.to.data] expressions are replaced.

If a value is :
- undefined - no replacement is done
- null - target (attribute, childNodes) is removed, or expression is replaced by an empty string
- a function - the value returned by value(node, scope, path) is processed again

When merged, a node looses its bind and repeat attributes.
All these attributes can be namespaced.

Given this html

  <section>
    <header>People meeting <span bind="person" bind-text="name" class="meeters age[age]">Joe</span> today</header>
    <ul class="list">
      <li repeat="friends" bind-text="value">first item<span bind="friends">([key])</span></li>
      <li class="willbeignored">second item</li>
    </ul>
  </section>

And some data

  var obj = {
    person: {name: "John Doe", age: 20},
    friends: ["Luke", "Samantha"]
  };

This will save the node as a template and replace it by the merged nodes

  Domin.ns = 'do';
  var inst = Domin('ul.list');
  inst.merge(obj);

Generating this piece of html

  <section>
    <header>People meeting <span>John Doe</span> today</header>
    <ul class="list">
      <li>Luke</li>
      <li>Samantha</li>
    </ul>
  </section>



Filter
------

Domin is simple yet flexible enough to do just that !

  inst.ns().merge(obj, function(node, scope, varname, key) {
    return node.innerHTML.replace(...);
  });

The filter can call inst.find(scope, varpath)
