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
