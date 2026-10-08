# Writing recipes

A recipe is the function given to `make.target(target, source, proc)`. It
must create or update the `target` file and tell `Make` whether it
succeeded.

## The contract

| Rule | Why |
|------|-----|
| Create or update the target file | after the recipe, `build` checks `Shell.fileExists(target)` |
| Return a **falsy** value on success (`undefined`, `0`, `false`, `null`, `""`) | any truthy value fails the build with `Build failed.` |
| Return a **truthy** value on failure (an error text, an exit code, `true`) | — |
| Catch your own exceptions | an uncaught exception counts as success when an old target file exists |
| Load every extension you use, inside the recipe | the recipe runs in a new, empty script world |
| Use only `this` and the arguments, no outer variables | closures and globals are not carried into the thread |

The return convention matches exit codes, so a recipe that runs one tool
can just return `Shell.system(...)`: `0` is success, anything else fails
the build.

## Recipes run on threads

`build` starts each recipe with `Thread.newThread(proc, this_, arg)`. The
function is compiled again, from its source text, in a fresh executive on
a new thread (see the `quantum-script--thread` repository,
`docs/thread-model.md`). In practice:

- **No closures, no globals.** Variables and functions of the build script
  are `undefined` inside the recipe, including `Make`, helper functions and
  configuration objects. Pass data through `arg` / `this_`, or
  `Script.include` a shared file inside the recipe.
- **Load extensions in the recipe.** `Console`, `Shell`, `File`, `JSON`,
  ... are available only after `Script.requireExtension` in the recipe
  itself. In a C++ host they must be registered in the init callback; in
  fabricare and `quantum-script` they are.
- **Arguments are copied.** `this_` and `arg` are deep copied into the
  thread; functions inside them become `undefined`. Changing them in the
  recipe does not change the caller's values.
- **The returned value is copied back**, then tested for truthiness.
- **One working directory for all threads.** Relative paths resolve
  against the process working directory. Never `Shell.chdir` in a recipe:
  it changes the directory of every running recipe and of the build
  script. Build absolute paths, or pass a base folder as an argument.
- **Output interleaves.** Recipes of one level run at the same time, so
  their `Console.writeLn` lines mix. Write one line per recipe, or set
  `make.threadsCount = 1` while debugging.

## Reporting errors

Wrap the body and return the error text:

```javascript
function generate(target, source) {
	try {
		Script.requireExtension("Shell");
		Script.requireExtension("JSON");
		var data = JSON.decode(Shell.fileGetContents(source));
		if (!Script.isObject(data)) {
			return "invalid " + source;            // JSON.decode does not throw
		};
		Shell.mkdirFilePath(target);
		if (!Shell.filePutContents(target, "#define VERSION \"" + data.version + "\"\r\n")) {
			return "cannot write " + target;
		};
	} catch (e) {
		return "" + e;
	};
};
```

`build` does not show the returned text: it throws
`MakeError: Build failed.` To see why, print the error in the recipe
before returning it:

```javascript
	} catch (e) {
		Script.requireExtension("Console");
		Console.writeLn("[make] " + target + ": " + e);
		return true;
	};
```

When a recipe may leave a partial file behind, remove it on failure
(`Shell.removeFile(target)`), otherwise the next `build` sees a target
newer than its sources and skips it.

## Patterns

### Run a tool

```javascript
make.target("output/Library.Source.cpp", "source/Library.js", function(target, source) {
	Script.requireExtension("Shell");
	Shell.mkdirFilePath(target);
	return Shell.system("file-to-cs --file-in=" + source + " --file-out=" + target + " --is-string --name=librarySource");
});
```

### Many targets from a list

The build graph is code: register targets in a loop.

```javascript
Script.requireExtension("Shell");
Script.requireExtension("Make");

function compile(target, source, options) {
	Script.requireExtension("Shell");
	Shell.mkdirFilePath(target);
	return Shell.system("cl /nologo /c " + options + " /Fo" + target + " " + source);
};

function link(target, source) {
	Script.requireExtension("Shell");
	return Shell.system("link /nologo /OUT:" + target + " " + source.join(" "));
};

var make = new Make();
var files = Shell.getFileList("source/*.cpp");
var objects = [];
var k;
for (k = 0; k < files.length; ++k) {
	var obj = "temp/" + Shell.getFileBasename(Shell.getFileName(files[k])) + ".obj";
	make.target(obj, files[k], compile, null, [obj, files[k], "/O2 /EHsc"]);
	objects[objects.length] = obj;
};
make.target("output/app.exe", objects, link);
make.build("output/app.exe");
```

All the objects are on the same level, so they compile in parallel; the
link waits for all of them. Note that `compile` receives a third argument
because `arg` was given explicitly.

### Configuration through `this`

```javascript
var config = {outputPath: "output", define: "NDEBUG"};

make.target("output/config.h", "config.json", function(target, source) {
	Script.requireExtension("Shell");
	return !Shell.filePutContents(target, "#define " + this.define + "\r\n");
}, config);
```

`this` is a copy of `config` taken when the recipe starts; methods of
`config` are not available inside the recipe.

### A recipe with several outputs

```javascript
make.target(["gen/parser.cpp", "gen/parser.hpp"], "parser.grammar", function(targets, source) {
	Script.requireExtension("Shell");
	return Shell.system("my-generator " + source + " gen/parser");   // writes both files
});
make.target("temp/parser.obj", ["gen/parser.cpp", "gen/parser.hpp"], compile, null,
	["temp/parser.obj", "gen/parser.cpp", ""]);
```

With the default `arg`, the first argument is the array of all outputs.
Both names may land on the same level, so the recipe can run twice at the
same time when both are out of date; a tool that is not safe to run twice
in parallel should get a single "main" target, with the other outputs as
sources of the targets that use them.

### Directories: stamp files

A directory cannot be a target or a source. Use a file that the recipe
touches:

```javascript
make.target("output/www/.stamp", ["site/index.html", "site/style.css"], function(target, source) {
	Script.requireExtension("Shell");
	if (!Shell.copyDirRecursively("site", "output/www")) {
		return "copy failed";
	};
	return !Shell.touch(target);
});
```

### Always regenerate

A `null` source runs the recipe on every `build` that reaches the target,
and every target that depends on it is rebuilt as well. Keep such targets
at the top of the graph (a version stamp read by nothing else, a final
packaging step), or give them a real source so they run only when needed.

### Forcing a rebuild

- Touch a source: `make.touchIfExists("src/a.js")` (or `Shell.touch`).
- Delete the target: `Shell.removeFile("out/a.min.js")`.
- Build everything from scratch: remove the output folder before `build`.
