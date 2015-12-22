1.4.0
=====

(Possibly) breaking changes on filters.

1.4.1
=====

Somewhat breaking compatibility after having fixed a long-standing bug:
- repeated accessor was being merged (and its filters called)

2.0.0
=====

Breaks block filters arguments, breaks serialized HTML, drop support for
repeat-invert attribute (replaced by block filter).

2.1.0
=====

Expose Domt.each(arrayLike, function(item, index) {})

3.0.0
=====

Signatures of filters have changed.
Value filters are function(val, info)
Block filters are function(val, key, info)

info contains node, scope, path, filters (and for block filters head, tail).

3.1.0
=====

If a block filter returns false, it stops further block filters from being called.
(and it still prevents default insertion).

3.2.0
=====

All attributes are processed, those having [accessor|filter] pattern in their
value are promoted to bind-* attributes.

3.3.0
=====

Value filters applying to first-level undefined data are not called.

3.5.0
=====

Filters receive context.path as the array of accessors, and context.index as
the current index in the array.
This breaks software using context.path but it's unlikely it was ever useful as
it was badly implemented and untested.

3.5.1
=====

Like 3.5.0, but properly tested and with the addition of context.name.

3.6.0
=====

Domt(thing) can be called before document is ready, for thing won't be
used until `merge` or `empty` methods are called.

4.0.0
=====

### Breaking changes
* bind now replaces by {lastkey: val} instead of just the value, otherwise it
  was confusing to have an empty accessor.
* no and "" filters have been removed in favor of !, ?, att and drop.

### Non-breaking changes
* bind is documented to be processed before repeat if both attributes are on
the same node - this is the same behavior as before.


5.0.0
=====

### Serialization is done in comment nodes
* comment nodes are used in place of script nodes, it solves the problem with
  stylesheets and selectors like :first-child.
* it's also easier to define a template directly inside a comment node

### Setting an id upon a repeated node triggers a warning

Use bind-id.
This avoids having same id repeated over and over by mistake.

### Domt cannot be initialized directly on a repeated node

Initialize it on the parent node.

### A template can be loaded first and placed somewhere else to be merged

This allows reusing templates through the web page, using Domt.template()
and template.attach().

### A repeated node can be extended to repeat its following siblings

Internally, Domt now manages repeated nodes in document fragments.

### Domt can be initialized on a document fragment or a template

and Domt(fragment).nodes is still a fragment.  
Note that
```
Domt(Domt.template(node)).nodes == Domt(Domt.template(node).template).nodes
```

### template.clone() clones fragment that can be given to a new Domt instance

this is useful when doing off screen templating and by-hand merging.


5.1.0
=====

### repeated fragments can be named using repeat-name attribute
and accessed later with Domt.template(name)

### merge method added to template instance
is an alias of Domt(template).merge, so one can do offline merge
```
var inst = Domt.template('myfrag').clone().merge(data);
document.body.appendChild(inst.nodes);
```
or attached merge
`Domt.template('myfrag').clone('#thatid').merge(data)`

### expose template head, tail, fragment


5.2.0
=====

Expose Domt.createFragment, Domt.import.
Better foreign document management - better support for web components,
meaning templates being merged off-document won't have their component
initialized until domt.import() is called before insertion in main
document.

5.2.2
=====

Compatibility with webcomponents.js 0.7.18

5.3.0
=====

* bind-text="data" is now an alias of bind-html="data|text",
  typically allowing bind-text="data|br" to work as expected.
* innerHTML is now evaluated for replacements like attributes,
  <span bind-html>list.name</span> works like <span bind-html="list.name>.
  Before, brackets were needed in text content but not always in attributes.

