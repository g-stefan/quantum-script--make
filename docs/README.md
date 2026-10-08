# Quantum Script Extension Make — Documentation

`quantum-script--make` is the **make-style build engine of Quantum Script**.
Loaded with `Script.requireExtension("Make")`, it adds a `Make` type to
scripts: you declare **targets** (files to produce), the **sources** each
target depends on, and a **recipe** (a script function) that produces the
target. `build(target)` then rebuilds only what is missing or out of date,
in dependency order, running independent recipes **in parallel threads**.

It is the same idea as GNU `make`, but the makefile is a Quantum Script
program and the recipes are script functions:

```javascript
Script.requireExtension("Make");

var make = new Make();
make.target("output/app.js", ["src/a.js", "src/b.js"], function(target, source) {
	Script.requireExtension("Shell");
	var text = "";
	var k;
	for (k = 0; k < source.length; ++k) {
		text += Shell.fileGetContents(source[k]);
	};
	Shell.mkdirFilePath(target);
	return !Shell.filePutContents(target, text);   // falsy = success
});
make.build("output/app.js");
```

- **Targets and sources are file names.** A target is rebuilt when its file
  is missing, when a source file is newer (`Shell.compareLastWriteTime`), or
  when a source is itself a target that gets rebuilt.
- **Dependency tree.** A source that is also a registered target is built
  first. Targets at the same depth of the tree are independent and run
  together.
- **Parallel recipes.** Each recipe runs on its own thread through the
  `Thread` extension, up to `make.threadsCount` at a time (default: the
  number of logical processors).
- **Checked results.** A recipe that returns a truthy value fails the build;
  a recipe that finishes without creating its target fails it too. Failures
  are thrown as `MakeError`.

```
scripts: fabricare build scripts, quantum-script .js tools
quantum-script--make      <-- this extension: Make, MakeError (written in Quantum Script)
quantum-script--thread    (Thread.newThread, CurrentThread.sleep, Processor.getCount)
quantum-script--shell     (fileExists, compareLastWriteTime, copyFile, touchIfExists)
quantum-script            (Executive, ExecutiveX)
xyo-system, xyo-multithreading, xyo-encoding, xyo-data-structures, xyo-managed-memory, xyo-platform
```

## Why it exists

| Need | What `Make` gives |
|------|-------------------|
| Regenerate files only when their inputs changed (generated sources, bundles, resources, object files) | timestamp comparison of each target against its sources |
| Chains of generated files (`a.js` → `a.Source.cpp` → `a.obj`) | sources that are themselves targets are built first, recursively |
| Use every core for independent steps | recipes of one tree level run on parallel threads |
| A build description that is code, not a separate language | targets, sources and recipes are ordinary script values; loops and conditions build the graph |
| Stop on the first failed step, with a readable message | `MakeError`: `Make: Build failed.`, `Make: Source not found: x`, ... |

## Concepts at a glance

| Need | Use | Notes |
|------|-----|-------|
| Load the extension | `Script.requireExtension("Make");` | loads `Thread` and `Shell` too; already loaded in fabricare scripts |
| A build graph | `var make = new Make();` | always with `new` |
| Declare a target | `make.target(target, source, proc)` | `source`: a file name, an array of names, or `null` |
| Several outputs of one recipe | `make.target([t1, t2], source, proc)` | each name becomes a target with the same recipe |
| Custom recipe arguments | `make.target(t, s, proc, this_, [a, b])` | default arguments: `[target, source]` |
| Build one target | `make.build("out/file")` | only what is out of date |
| Build everything | `make.build()` | every registered target, one after the other |
| Limit parallelism | `make.threadsCount = 1;` | sequential build |
| Recipe success / failure | return `undefined` / `0` / `false` / return anything truthy | the target file must exist afterwards |
| Catch build errors | `try { make.build(t); } catch (e) { e.message; }` | `e instanceof MakeError`, `"" + e` is `"Make: ..."` |
| Copy / touch helpers | `make.copyFile(target, source)`, `make.touchIfExists(file)` | note the **target first** order of `copyFile` |

## Contents

| Document | What it covers |
|----------|----------------|
| [Getting started](getting-started.md) | Build and install, a first build script, running it, fabricare scripts, registering the extension in a C++ host |
| [Build model](build-model.md) | When a target is rebuilt, how the dependency tree and its levels are formed, parallel execution, known limitations |
| [Script API](script-api.md) | `Make`, `target`, `build`, `threadsCount`, `copyFile`, `touchIfExists`, `MakeError`: exact behavior and edge cases |
| [Writing recipes](recipes.md) | The thread rules for recipe functions, reporting errors, patterns: concatenate, generate, compile, copy, multiple outputs |
| [C++ API](cpp-api.md) | `registerInternalExtension`, `initExecutive`, the embedded script source, extensions a host must register |
| [API reference](reference.md) | Every script and C++ symbol on one page |

Quantum Script itself (the language, `Script.requireExtension`, embedding)
is documented in the `quantum-script` repository, `docs/`; threads in the
`quantum-script--thread` repository, `docs/`; file functions in the
`quantum-script--shell` repository, `docs/`.

## Source map

```
source/XYO/QuantumScript.Extension/Make.hpp             umbrella header, include this from C++
source/XYO/QuantumScript.Extension/Make.Amalgam.cpp     the whole extension in one translation unit
source/XYO/QuantumScript.Extension/Make/
    Library.js                                          the implementation: MakeError and Make, in Quantum Script
    Library.Source.cpp                                  Library.js as a C array (generated, do not edit)
    Library[.hpp/.cpp]                                  initExecutive (compiles librarySource), registerInternalExtension
    Dependency.hpp                                      <XYO/QuantumScript.hpp>, export macro
    Copyright / License / Version                       library metadata
fabricare/make.prepare.js                               regenerates Library.Source.cpp from Library.js with file-to-cs
test/test.01.cpp                                        C++ host registering Console, Buffer, Shell, ShellFind, Thread, Make
test/test.01.js                                         loads Console and Make
test/test.02.cpp                                        same host as test.01
test/test.02.js                                         diamond rebuilds, a global `k` survives build
```

## AI assistant skill

A Claude Code skill describing how to use this extension lives in
[`.claude/skills/quantum-script--make/`](../.claude/skills/quantum-script--make/SKILL.md).
It is picked up automatically inside this repository; copy the folder to
`~/.claude/skills/` to have it available in the projects that use `Make`
(fabricare scripts, Quantum Script tools).
