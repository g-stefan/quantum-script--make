# API reference

## Script

Available after `Script.requireExtension("Make")` (which also loads `Thread`
and `Shell`). Already loaded in fabricare scripts.

### Globals

| Symbol | Returns | Notes |
|--------|---------|-------|
| `new Make()` | Make | empty build graph |
| `new MakeError(message)` | MakeError | `message`; `toString()` is `"Make: " + message`; derives from `Error` |

### `Make` members

| Member | Returns | Behavior |
|--------|---------|----------|
| `make.threadsCount` | Number | recipes run at the same time per level; default `Processor.getCount()`; keep `>= 1` |
| `make.target(target, source, proc, this_, arg)` | `undefined` | registers `target` (String, or Array of names sharing the entry); `source`: `null`, String or Array; `proc` must be a function; `arg` defaults to `[target, source]` |
| `make.build(target)` | `undefined` | rebuilds `target` and its out of date dependencies, deepest level first, levels in parallel; no argument: every target in turn; throws `MakeError` |
| `make.copyFile(target, source)` | `undefined` | `Shell.copyFile(source, target)` — **target first** |
| `make.touchIfExists(file)` | `undefined` | `Shell.touchIfExists(file)` |

### Rebuild rules

| Condition | Target |
|-----------|--------|
| `source` is `null` / `undefined` | always rebuilt |
| target file missing | rebuilt |
| a source file is newer (`Shell.compareLastWriteTime(target, source) < 0`) | rebuilt |
| a source is a target being rebuilt (or whose file is missing) | rebuilt after it |
| otherwise | up to date |

### Recipe contract

| Item | Rule |
|------|------|
| Runs | `Thread.newThread(proc, this_, arg)`: new thread, empty script world, no closures |
| Extensions | `Script.requireExtension(...)` inside the recipe |
| `this_`, `arg` | deep copied; functions become `undefined`; `arg` must be an Array |
| Success | returns falsy **and** the target file exists |
| Failure | returns truthy → `Build failed.`; no target file → `Build failed, target not found: <t>`; not started → `Build failed, unable to start recipe: <t>` |
| Uncaught exception | ignored (returned value `undefined`): catch it and return it |

### Errors (`MakeError`)

| Message | Cause |
|---------|-------|
| `Invalid function provided` | `target()` with a `proc` that is not a function |
| `Target not found: <name>` | `build(name)` for an unregistered name |
| `Source not found: <name>` | a plain-file source is missing (or is a directory) |
| `Build failed.` | a recipe returned a truthy value |
| `Build failed, target not found: <name>` | a recipe ended without producing its target |
| `Build failed, unable to start recipe: <name>` | `Thread.newThread` returned `null` (the recipe does not compile) |
| `Unable to open "Make"` (engine error) | the extension library was not found and no internal one is registered |

### Known limitations

| Item | Behavior |
|------|----------|
| cycles | not detected |
| directories | cannot be targets or sources; use stamp files |
| `threadsCount <= 0` | `build` never returns |

## C++

Namespace `XYO::QuantumScript::Extension::Make`, umbrella header
`<XYO/QuantumScript.Extension/Make.hpp>`.

### Library (`Make/Library.hpp`)

| Symbol | Notes |
|--------|-------|
| `void registerInternalExtension(Executive *executive)` | register `"Make"` as an internal extension |
| `void initExecutive(Executive *executive, void *extensionId)` | extension init: name, info, version, public, compiles `librarySource` |
| `extern "C" void quantumScriptExtension(Executive *, void *)` | DLL entry point (not in static builds) |

### Metadata

| Symbol | Notes |
|--------|-------|
| `Version::version()`, `Version::build()`, `Version::versionWithBuild()`, `Version::datetime()` | from `version.json` |
| `Copyright::copyright()`, `Copyright::publisher()`, `Copyright::company()`, `Copyright::contact()` | |
| `License::license()`, `License::shortLicense()` | MIT text |

`Version`, `Copyright` and `License` exist in every XYO library: qualify them
(`Extension::Make::Version::versionWithBuild()`).

### Build configuration

| Name | Meaning |
|------|---------|
| `quantum-script--make` | fabricare project, DLL / shared library; depends on `quantum-script`, `--console`, `--buffer`, `--thread`, `--shell`, `--shellfind` |
| `quantum-script--make.static` | fabricare project, static library, static CRT; the `.static` variants of the same |
| `XYO_QUANTUMSCRIPT_EXTENSION_MAKE_EXPORT` | export / import macro |
| `XYO_QUANTUMSCRIPT_EXTENSION_MAKE_INTERNAL` | defined while building the DLL (from `QUANTUM_SCRIPT__MAKE_INTERNAL`) |
| `XYO_QUANTUMSCRIPT_EXTENSION_MAKE_LIBRARY` | static build: empty export macro, no DLL entry point |
| `fabricare/make.prepare.js` | regenerates `Make/Library.Source.cpp` from `Make/Library.js` (`file-to-cs`) |
