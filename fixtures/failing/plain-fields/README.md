# Field-editor recovery fixture

This alternate source for `plain-fields` deliberately throws while drawing a
field. The e2e installs it into a scratch local scope over the working sample,
trusts only its test profile, and checks that kb falls back to the bundled
editor and names `plain-fields` in a toast. It is a test fixture, outside the
marketplace's `extensions/` catalog.
