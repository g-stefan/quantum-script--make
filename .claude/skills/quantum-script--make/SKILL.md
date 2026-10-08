---
name: quantum-script--make
description: >-
  How to use the Quantum Script Make extension (quantum-script--make), the
  make-style incremental build engine loaded with
  Script.requireExtension("Make") and preloaded in fabricare scripts:
  new Make(), make.target(target, source, proc, this_, arg) (source null /
  file / array, arg default [target, source], array of targets),
  make.build(target) / make.build() (timestamp rebuild rules, dependency
  levels built deepest first, parallel recipes on threads, threadsCount =
  Processor.getCount()), make.copyFile(target, source),
  make.touchIfExists(file), MakeError messages (Build failed., Build failed,
  target not found, Build failed, unable to start recipe, Source not found,
  Target not found, Invalid function provided); recipe rules (run via
  Thread.newThread in an empty script world: no closures, requireExtension
  inside, falsy return = success, exceptions swallowed); known limitations
  (no directories, no cycle detection, threadsCount <= 0 hangs);
  the C++ side (registerInternalExtension, Library.js embedded by
  file-to-cs). Use when writing or reviewing Quantum Script or fabricare .js
  code that calls Make / make.target / make.build, C++ code that includes
  <XYO/QuantumScript.Extension/Make.hpp>, a fabricare.json depending on
  "quantum-script--make", or when working inside the quantum-script--make
  repository.
---

# quantum-script--make

Make-style build engine of Quantum Script (see the `quantum-script` skill
for the language and its differences from JavaScript; recipes run through
the `Thread` extension and use `Shell` file functions — their rules apply).
Purpose: **rebuild only the files that are missing or older than their
sources**, in dependency order, running independent steps in parallel.
Implemented in Quantum Script: `source/XYO/QuantumScript.Extension/Make/Library.js`
(~270 lines) — read it when in doubt.

Full documentation: `docs/` in the quantum-script--make repository
(`X:\Storage\XYO\Gitea\CPP\quantum-script--make\docs` on this machine):
README, getting-started, **build-model** (rebuild rules, levels,
parallelism, limitations), **script-api** (exact behavior), **recipes**
(thread rules, error reporting, patterns), cpp-api, reference.

## Script API

```javascript
Script.requireExtension("Make");        // also loads Thread and Shell; preloaded in fabricare scripts

var make = new Make();                  // always with new
make.threadsCount = 4;                  // parallel recipes per level; default Processor.getCount(); keep >= 1

make.target("out/a.txt", "src/a.txt", proc);              // one source
make.target("out/all.txt", ["out/a.txt", "b.txt"], proc); // sources: targets or existing files
make.target("out/stamp.txt", null, proc);                 // null source: ALWAYS rebuilt
make.target(["gen/x.cpp", "gen/x.hpp"], "x.def", proc);   // each name a target; proc gets the whole array
make.target("o.obj", "o.cpp", compile, config, ["o.obj", "o.cpp", "/O2"]);  // this_ and custom args

make.build("out/all.txt");              // returns undefined, throws MakeError on failure
make.build();                           // every target in registration order, one build each

make.copyFile(target, source);          // Shell.copyFile(source, target) -- TARGET FIRST; returns undefined
make.touchIfExists(file);               // Shell.touchIfExists; returns undefined

try { make.build(t); } catch (e) { e.message; "" + e; /* "Make: Build failed." */ e instanceof MakeError; };
```

## Rebuild rules

Target rebuilt when: source is `null`; target file missing; a source file
is newer (`Shell.compareLastWriteTime(target, source) < 0`; equal = up to
date); a source is a target being rebuilt / missing (a shared dependency
that is rebuilt rebuilds **all** its dependents in the same `build`). A
source that is not a
registered target must exist as a **file** → else `Source not found: x`.
`build(name)` of an unregistered name → `Target not found: name`.

Order: targets are placed on levels (requested target = 0, its target
sources = 1, ...); levels run **deepest first**, each level waits for the
previous one; inside a level up to `threadsCount` recipes run in parallel.

## Recipe rules (the common mistakes)

1. **Recipes run on a new thread in an empty script world**
   (`Thread.newThread(proc, this_, arg)`): closures, globals, helper
   functions and `Make` are `undefined`. Pass data via `arg` / `this_`
   (deep copied; functions inside become `undefined`; `arg` must be an
   Array) or `Script.include` inside the recipe.
2. **`Script.requireExtension("Shell")` (Console, File, JSON, ...) inside
   the recipe**, every time.
3. **Return falsy for success** (`undefined`, `0`, `false`). Truthy →
   `MakeError: Build failed.` (the returned text is NOT shown — print it in
   the recipe). `return Shell.system(cmd);` fits: exit code 0 = success.
   `return !Shell.filePutContents(t, x);` fits too.
4. **The target file must exist afterwards**, else
   `Build failed, target not found: t`.
5. **Uncaught exceptions are swallowed** (thread returns `undefined` =
   success). If an old target file exists the build "succeeds" with a stale
   file. Wrap the body in `try { ... } catch (e) { return "" + e; };` and
   remove partial outputs on failure.
6. `JSON.decode` and `Shell.fileGetContents` return `undefined` on error
   instead of throwing — test results explicitly.
7. Never `Shell.chdir` in a recipe (shared working directory); relative
   paths resolve against the process cwd.
8. Console output of parallel recipes interleaves; `threadsCount = 1` to
   debug.

## Known limitations

- Directories cannot be targets/sources (`Shell.fileExists` is false):
  use a stamp file the recipe `Shell.touch`es.
- Target names are compared as strings: `"./a"` ≠ `"a"`; use one spelling.
- No cycle detection; `threadsCount <= 0` hangs `build`.
- Null-source targets run once per `build` that reaches them, and force
  their dependents to rebuild.

## C++

```cpp
#include <XYO/QuantumScript.Extension/Make.hpp>
using namespace XYO::QuantumScript;

void initExecutive(Executive *executive) {           // also runs for every recipe thread
	Extension::Console::registerInternalExtension(executive);
	Extension::Buffer::registerInternalExtension(executive);
	Extension::Shell::registerInternalExtension(executive);
	Extension::ShellFind::registerInternalExtension(executive);
	Extension::Thread::registerInternalExtension(executive);
	Extension::Make::registerInternalExtension(executive);   // scripts still requireExtension("Make")
};
```

- No C++ class: `initExecutive` compiles the embedded `librarySource`
  (Library.js). Drive builds with `ExecutiveX::executeString` /
  `executeFile`.
- Static build: depend on `quantum-script--make.static` (exports
  `XYO_QUANTUMSCRIPT_EXTENSION_MAKE_LIBRARY`); register every extension as
  internal.

## Working in this repository

- Build: `fabricare make` (first runs `fabricare/make.prepare.js`:
  `file-to-cs` turns `Make/Library.js` into `Make/Library.Source.cpp`),
  `fabricare test` (test/test.01 and test/test.02: hosts registering
  Console, Buffer, Shell, ShellFind, Thread, Make; test.01.js only loads
  Make, test.02.js checks diamond rebuilds and that a global `k` survives
  `build`), `fabricare install`
  (see the `fabricare` skill). Dependencies (`quantum-script`, `--console`,
  `--buffer`, `--thread`, `--shell`, `--shellfind`) must be installed first.
- Edit `Library.js`, never `Library.Source.cpp` (generated).
- Quick manual test: write a script using `Make` and run it with
  `quantum-script test.js` (the installed `quantum-script--make.dll` is used;
  `fabricare install` first to test changes).
- Behavior changes: update `README.md`, `docs/script-api.md`,
  `docs/build-model.md`, `docs/reference.md` and this skill.
- Code style: tabs (width 8), `.clang-format`, CRLF, statements and blocks
  end with `};`, camelCase. SPDX header: MIT for `source/` and `docs/`,
  Unlicense for `test/`, `fabricare/` and `.claude/` (see `.reuse/dep5`).
