# rating

A field type, **stars**: a field of it is drawn as five stars, and a press
on one sets it. It is the sample for a field type a family declares (kb's
DESIGN.md → Field types).

**How it works.** The declaration lists the type under kb's field types
(`FIELD_TYPE_OPTIONS`), and its option chooses the built-in type it stores
as, `number`. So kb's store, `kb set` and queries read a rating as a number,
and nothing in kb changes to hold one. It seeds one field of the type,
`rating`, which holds one value; pick "stars" as the type of any field of
your own and it is drawn the same way.

- The page half contributes the type's value kind (`provideValueKind`): a
  star as its glyph, five stars as its surface, and how a rating reads as
  text and back.
- The server half contributes a commit guard: every write to a field of
  stars must be a whole number from 1 to 5, whichever surface makes it.
  `kb set <node> rating 9` is refused, as the page would refuse it.

Switched off, a field of stars draws as a number, and its values stay.

**What it reaches.** No network, storage or secrets. It seeds the stars
type and the `rating` field, and writes nothing on its own: the ratings you
set are written through kb's own `node.update`, under the same guards as
any write. Its guard reads each write's fields to find the ratings in it.
Its page half runs with the page's power, so its manifest declares the
`full` page tier.

**Author** popemkt. **License** MIT.
