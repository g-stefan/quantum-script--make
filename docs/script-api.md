# Script API

Everything the extension defines after `Script.requireExtension("Make")`.
Loading `Make` also loads `Thread` and `Shell` into the calling script, so
`Thread`, `CurrentThread`, `Processor` and `Shell` are available afterwards.

The extension is written in Quantum Script (`Make/Library.js`), so every
function below is an ordinary script function.

## `MakeError(message)`

The error type thrown by `Make`.

```javascript
try {
	make.build("out/app.js");
} catch (e) {
	if (e instanceof MakeError) {
		Console.writeLn(e.message);   // "Build failed."
		Console.writeLn("" + e);      // "Make: Build failed."
	};
};
```

- `message`: the text given to the constructor.
- `toString()`: `"Make: " + message`.
- `MakeError.prototype` derives from `Error.prototype`, so
  `e instanceof Error` is `true` as well; `typeof(e)` is `"Object"`.

Messages thrown by `Make`:

| Message | Thrown by | Cause |
|---------|-----------|-------|
| `Invalid function provided` | `target` | `proc` is not a function |
| `Target not found: <name>` | `build` | `build(name)` for a name never registered with `target` |
| `Source not found: <name>` | `build` | a source that is not a registered target does not exist as a file (directories do not count) |
| `Build failed.` | `build` | a recipe returned a truthy value |
| `Build failed, target not found: <name>` | `build` | a recipe ended (returned falsy, or threw) without the target file existing |
| `Build failed, unable to start recipe: <name>` | `build` | `Thread.newThread` returned `null` for the recipe of `<name>` (the recipe does not compile) |

## `Make()`

```javascript
var make = new Make();
```

Creates an empty build graph. Always use `new`: the methods are attached to
`this` by the constructor.

### `threadsCount`

Number of recipes that may run at the same time inside one level of the
build tree. Starts as `Processor.getCount()` (logical processors). A plain
property: set it before `build`.

```javascript
make.threadsCount = 1;   // one recipe at a time, deterministic output order
```

Keep it at least `1`; `0` or a negative value never starts a recipe and
`build` never returns.

### `target(target, source, proc, this_, arg)`

Registers a target. Returns `undefined`.

| Argument | Type | Meaning |
|----------|------|---------|
| `target` | String, or Array / Object of Strings | the file the recipe produces; with an array, each element is registered as a target with the same `source`, `proc`, `this_` and `arg` |
| `source` | `null` / `undefined`, String, or Array / Object of Strings | the files it depends on; `null` means "always rebuild" |
| `proc` | Function | the recipe; anything else throws `MakeError: Invalid function provided` |
| `this_` | any | `this` inside the recipe (deep copied into the recipe thread; functions inside it become `undefined`); default `undefined` |
| `arg` | Array | the arguments of the recipe; default `[target, source]` |

- Registering the same name again **replaces** the previous entry.
- Nothing is checked at registration time except `proc`: sources and
  targets are looked up when `build` runs, so targets can be registered in
  any order.
- With an array `target` and the default `arg`, the recipe receives the
  **whole array** as its first argument (`[["x1", "x2"], source]`), and it
  runs separately for each name that `build` finds out of date. A recipe
  that writes all the outputs at once is therefore usually run only once,
  because the other outputs are up to date afterwards.
- `arg` must be an array: anything else gives the recipe no arguments.
- `arg` and `this_` are copied into the recipe thread when it starts, not
  when `target` is called; changes made before `build` are seen.

```javascript
make.target("out/a.min.js", "src/a.js", minify);
make.target("out/all.js", ["out/a.min.js", "out/b.min.js"], concat);
make.target("out/version.h", null, writeVersion, null, ["out/version.h", "5.9.0"]);
make.target(["out/x.cpp", "out/x.hpp"], "x.grammar", runGenerator);
```

### `build(target)`

Builds `target` and everything it depends on that is missing or out of
date, then returns `undefined`. Throws `MakeError` on the first failure.

- `target`: a registered target name. `null` / `undefined` / no argument
  builds **every** registered target, one `build(name)` after the other,
  in registration order.
- What is rebuilt, in which order and how many recipes run in parallel is
  described in [Build model](build-model.md).
- `build` **blocks** until the build ends; it runs on the calling thread,
  the recipes on their own threads.
- It does not change any global variable of the calling script.

```javascript
make.build("out/all.js");   // only what changed
make.build();               // every target
```

### `copyFile(target, source)`

`Shell.copyFile(source, target)`: copies `source` to `target`, creating the
folder of `target` if needed. Returns `undefined` (the result of the copy
is not returned: check `Shell.fileExists(target)` if needed).

Note the order: **target first**, like `target()`, the opposite of
`Shell.copyFile`. It is a convenience for the calling script; inside a
recipe `this` is not the `Make` object, so use `Shell.copyFile` there.

### `touchIfExists(file)`

`Shell.touchIfExists(file)`: sets the modification time of `file` to now if
it exists, does nothing otherwise. Returns `undefined`.

Touching a source forces its dependents to be rebuilt on the next `build`;
touching a target marks it as up to date with respect to older sources.

## Internal members

These are implementation details, listed so they are not mistaken for API:

| Member | Meaning |
|--------|---------|
| `targets_` | Object: name → `[source, proc, this_, arg, visited, built, bumped]` |
| `buildTreeGenerate_`, `buildTreeGenerateTarget_`, `buildTreeGenerateTargetSource_` | walk the dependencies and fill the levels |
| `buildTreeBumpTarget_`, `buildTreeBumpSource_` | move dependencies of a target reached again to deeper levels |

Do not call or change them.
