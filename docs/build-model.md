# Build model

This page explains what `make.build(target)` decides and in which order it
runs the recipes. Everything here follows from `Make/Library.js`
(~270 lines of Quantum Script).

## Targets, sources, recipes

Each `make.target(target, source, proc, this_, arg)` call stores one entry
under the name `target`:

| Part | Meaning |
|------|---------|
| `target` | a file name, the key of the entry; a later `target()` call with the same name replaces it |
| `source` | `null` / `undefined`, one file name, or an array (or object) of file names |
| `proc` | the recipe: a script function that creates or updates the `target` file |
| `this_`, `arg` | `this` and the argument array the recipe is called with; `arg` defaults to `[target, source]` |

Names are compared **as strings**: `"out/a.txt"`, `"./out/a.txt"` and
`"out\\a.txt"` are three different targets. Use one spelling for each file
everywhere.

A source is either a **registered target** (another entry with that name) or
a **plain file** that must already exist.

## When a target is rebuilt

For the target being checked, in this order:

| Situation | Result |
|-----------|--------|
| the name is not a registered target | `MakeError: Target not found: <name>` |
| `source` is `null` / `undefined` | **always rebuilt** |
| a plain-file source does not exist (or is a directory) | `MakeError: Source not found: <name>` |
| the target file is missing | rebuilt (a missing file is older than any existing file) |
| a source file is newer than the target | rebuilt |
| a source is a registered target that will be rebuilt | rebuilt, after that source |
| a source is a registered target whose file is missing | that source is built, then the target |
| otherwise | up to date, nothing runs |

The comparison is `Shell.compareLastWriteTime(target, source) < 0`:
modification times, links followed. Equal times count as up to date. All
sources of a target are checked (no short-circuit), so every out of date
dependency is collected even when the first one already forces a rebuild.

A target with `null` source behaves like a phony target that must still
produce a file: its recipe runs on every `build` that reaches it, and the
targets that depend on it are rebuilt each time too.

## The build tree and its levels

`build(target)` first walks the dependencies and places every target that
must be rebuilt on a **level**: the requested target on level 0, its
sources that are targets on level 1, their sources on level 2, and so on.
Then it runs the levels **from the deepest to level 0**:

```
make.target("app.exe", ["a.obj", "b.obj"], link);
make.target("a.obj", "a.cpp", compile);
make.target("b.obj", ["b.cpp", "gen.hpp"], compile);
make.target("gen.hpp", "gen.json", generate);

level 2:  gen.hpp                       (runs first)
level 1:  a.obj   b.obj                 (in parallel, after level 2 finished)
level 0:  app.exe                       (after level 1 finished)
```

- Inside one level, recipes run **in parallel**, each on its own thread,
  at most `make.threadsCount` at a time (default `Processor.getCount()`).
  The next recipe starts as soon as a slot is free.
- A level starts only when **every** recipe of the deeper level has
  finished and been checked. A level is a barrier: a fast branch waits for
  the slowest recipe of its level.
- A target that appears on several levels is built once, on the deepest
  one.
- A target shared by several dependents ("diamond": `t` ← `a`, `b`;
  `a`, `b` ← `c`) that must be rebuilt makes **every** dependent rebuild in
  the same `build`, not only the first one reached. When the dependents
  reach it on different levels, it is placed below the deepest of them, so
  it is still built before all of them.
- The main thread polls the running threads every millisecond
  (`CurrentThread.sleep(1)`); the cost is negligible next to real recipes.

## Checking each recipe

A recipe that cannot be started (`Thread.newThread` returns `null`, for
example when the recipe does not compile in the new script world) stops the
build with `MakeError: Build failed, unable to start recipe: <target>`.

When a recipe's thread ends, `build` checks, in this order:

1. **The returned value.** Truthy (`true`, a non-zero number, a non-empty
   string, an object, ...) → `MakeError: Build failed.` Falsy (`undefined`,
   `null`, `false`, `0`, `""`) → continue.
2. **The target file.** `Shell.fileExists(target)` is `false` →
   `MakeError: Build failed, target not found: <target>`.

The first failure is thrown out of `build` at once. Recipes of the same
level that are still running are not waited for: their `Thread` objects are
released, which requests termination and waits for each of them, so they
usually complete. No later level runs.

An **exception thrown inside a recipe is not reported**: the thread ends,
its returned value is `undefined`, which counts as success. The build then
fails only if the target file is missing, with `target not found`; if an
old target file is still there, the build **succeeds with a stale file**.
Catch errors in recipes and return them (see
[Writing recipes](recipes.md#reporting-errors)).

## Build everything

`build()` (no argument, or `null` / `undefined`) calls `build(name)` for
every registered target in registration order. Each call is a separate
build: targets with a `null` source run once for themselves and again for
every later target that depends on them.

## Repeated builds

A `Make` object can be built any number of times; each `build` call starts
from the current file times. Add or replace targets between builds as
needed. There is no way to remove a target other than creating a new
`Make`.

## Known limitations

| Limitation | Effect | Work around |
|------------|--------|-------------|
| Dependency cycles | not detected; the result is undefined | keep the graph acyclic |
| Directories as targets or sources | a directory is never "found" (`Shell.fileExists` is false for directories) | use a stamp file: the recipe touches `dir/.stamp` and that is the target |
| Recipe exceptions | swallowed, see above | `try` / `catch` in the recipe, return the error |
| No dry run, no "what would be built" query | — | — |
