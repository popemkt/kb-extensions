# Binary Orbits

**Binary Orbits by popemkt**: a page-head backdrop for [kb](https://github.com/popemkt/kb).
Two bodies circle their common centre of mass on a Keplerian ellipse, tilted
back behind the page's title. Each one trails a stream of stars along the path
it has just swept. Around them, a disc of stars streams through the two spiral
arms the pair drives. On a dark page the stars add light (`glow`). On a light
page they become coloured stipple (`ink`). The palette follows the page unless
a knob chooses one.

Inspired by React Bits Pro's [Binary Orbits](https://pro.reactbits.dev/docs/components/binary-orbits).
It is a clean-room re-creation of the visual idea, made from watching the public
demo. No code, shaders or assets were taken from React Bits Pro.

| | |
| --- | --- |
| Description | A page-head backdrop: two bodies in a binary orbit, trailing streams of stars through a tilted disc |
| Author | popemkt ([github.com/popemkt](https://github.com/popemkt)) |
| Homepage | https://github.com/popemkt/kb-extensions/tree/main/extensions/binary-orbits |
| License | MIT (`LICENSE`) |
| Backdrop id | `binary-orbits.binary-orbits` |
| Default strength | `soft` |
| Budget | `BACKDROP_BUDGETS.gpu`: 6 ms of GPU time per frame, metered with kb's frame meter |

## Capabilities

- **Network:** none. It fetches nothing and opens no connection.
- **Storage:** none. It reads and writes no `localStorage`, cookies, IndexedDB or files.
- **kb data:** none. Its server half only declares the backdrop and its knobs.
  Its page half reads only what kb hands every backdrop (`BackdropProps`). It
  uses the knobs, strength, opacity and budget, the pointer over its own frame,
  and the owner's activity *counts* (writes, arrivals, turns, editing). It also
  uses the shown node's id, only to notice that the page changed. It never
  reads a node's content.
- **Page power:** once you trust it, its page half runs with the page's full
  power, as every trusted kb extension's does. kb's SDK types describe what a
  backdrop is for, but they do not confine it (kb gap `01M6WVFMGB5PP2AANF0E5R921V`).
  Read the source before you trust it: about 900 lines in `binary-orbits.page.tsx`
  and `binary-orbits/`.
- **One DOM read beyond its props:** it watches the `dark` class on
  `<html>`. The palette needs the page's colour scheme, and the SDK does not
  hand that to a backdrop yet.

## Knobs

Set them in Backdrop Studio, or with `kb set` on the backdrop's node.

| Knob | Id | Range | Default |
| --- | --- | --- | --- |
| Orbit speed | `speed` | 0–3 | 1 |
| Separation | `separation` | 0.2–1 | 0.55 |
| Eccentricity | `eccentricity` | 0–0.8 | 0.35 |
| Trail length | `trail` | 0–1 | 0.6 |
| Glow | `glow` | 0–2 | 0.8 |
| First body | `primary` | colour | `#6f8dff` |
| Second body | `companion` | colour | `#ffad66` |
| Palette | `palette` | Follow the page · Glow (dark pages) · Ink (light pages) | Follow the page |
| Star field density | `stars` | 0–1 | 0.5 |
| Follow the pointer | `follow` | on/off | on |
| Seed | `seed` | a whole number pins the star layout; empty draws one each load | empty |

## Interactions

- **Pointer:** while the pointer is over the head, the orbit plane leans
  gently toward it (about 9° of tilt and 14° of yaw at most), and the far
  stars drift a few pixels the other way. It eases back when the pointer
  leaves. Turn it off with `follow`.
- **Activity:** each write to the graph, a change arriving from elsewhere, an
  agent's finished turn, or moving to another page speeds the orbit up. The
  boost fades over a few seconds. While you are editing text, the orbit runs
  slightly faster.
- **Reduced motion:** it draws one still frame, always the same composition.

kb's backdrop contract hands a backdrop its pointer and activity, but does not
yet let it declare which of them it uses. This list is that declaration until
the contract can carry it.

## Cost

Everything a frame needs is computed in the vertex shader from a few constants
per star and one orbit clock. A frame sets about 35 uniforms and makes
six draw calls: one full-frame haze triangle and five point batches, up to
33,600 points. On the frame meter's verdict it lowers its pixel ratio and the
share of stars it draws, down to quality 0.4. It draws only while the frame is
on screen and the tab is visible.

## Files

- `binary-orbits.ts`: the server half, which is only the declaration.
- `binary-orbits.page.tsx`: the page half, which contributes the backdrop.
- `binary-orbits/key.ts`: the backdrop's key and knobs, which both halves name.
- `binary-orbits/scene.tsx`: the scene component, with its loop, pointer, activity and meter.
- `binary-orbits/gl.ts`: the WebGL2 renderer and its shaders.
- `binary-orbits/orbit.ts`: Kepler's equation, the PRNG and colour parsing.
