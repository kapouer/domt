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

