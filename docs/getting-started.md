# Getting started

## 1. Build and install

The extension is built with [fabricare](https://github.com/g-stefan/fabricare),
the build tool used by all XYO C++ projects. `quantum-script` and the
extensions it depends on (`quantum-script--console`, `--buffer`, `--thread`,
`--shell`, `--shellfind`) must be installed to the SDK first. From the
repository root:

```bash
fabricare make       # build into output/
fabricare test       # build and run test/test.01, test/test.02 (run make first)
fabricare install    # copy output/{bin,include,lib} to ~/.fabricare/<platform>
fabricare clean      # remove output/ and temp/
```

Before compiling, `fabricare/make.prepare.js` runs `file-to-cs` to turn
`Make/Library.js` into `Make/Library.Source.cpp` (the script source as a C
array). Edit `Library.js`, never the generated file.

Two libraries are produced:

| Project                       | Kind                                | Use it when                                         |
|-------------------------------|-------------------------------------|-----------------------------------------------------|
| `quantum-script--make`        | DLL / shared library (`dll-or-lib`) | scripts run by `quantum-script`, or a host using the engine DLL |
| `quantum-script--make.static` | static library, static CRT          | self-contained hosts built with `quantum-script.static` |

After `fabricare install`, `quantum-script--make.dll` (Windows) /
`libquantum-script--make.so` (Linux) sits in the SDK `bin` folder next to
`quantum-script.exe`, which is where `Script.requireExtension("Make")`
finds it.

## 2. A first build script

`build.js` turns `notes.txt` into `output/notes.upper.txt`, and bundles
two files into `output/bundle.txt`, which depends on the first output:

```javascript
Script.requireExtension("Console");
Script.requireExtension("Make");

function toUpper(target, source) {
	Script.requireExtension("Shell");             // recipes run on their own thread:
	Script.requireExtension("Console");           // load what they use
	Console.writeLn("[make] " + target);
	var text = Shell.fileGetContents(source);
	if (Script.isNil(text)) {
		return "cannot read " + source;            // truthy: the build fails
	};
	Shell.mkdirFilePath(target);
	if (!Shell.filePutContents(target, text.toUpperCaseASCII())) {
		return "cannot write " + target;
	};
};                                                 // undefined: success

function bundle(target, source) {
	Script.requireExtension("Shell");
	Script.requireExtension("Console");
	Console.writeLn("[make] " + target);
	var text = "";
	var k;
	for (k = 0; k < source.length; ++k) {
		text += Shell.fileGetContents(source[k]) + "\r\n";
	};
	return !Shell.filePutContents(target, text);
};

var make = new Make();
make.target("output/notes.upper.txt", "notes.txt", toUpper);
make.target("output/bundle.txt", ["output/notes.upper.txt", "header.txt"], bundle);

try {
	make.build("output/bundle.txt");
	Console.writeLn("done");
} catch (e) {
	Console.writeLn("" + e);                      // Make: Build failed.
	Script.setExitCode(1);
};
```

Run it with:

```bash
quantum-script build.js
```

The first run builds `output/notes.upper.txt`, then `output/bundle.txt`.
A second run prints only `done`: both targets are newer than their
sources. Edit `header.txt` and only `output/bundle.txt` is rebuilt; edit
`notes.txt` and both are.

What to notice:

- `make.build` **throws** on failure; it returns nothing on success.
- The recipe runs on a **new thread with an empty script world**: no access
  to the variables or functions of `build.js`, and only the extensions it
  requires itself. See [Writing recipes](recipes.md).
- Paths are relative to the process working directory, shared by every
  thread.

## 3. fabricare build scripts

`fabricare` registers `Make` as an internal extension and loads it before
running a project's scripts, so `Make` and `MakeError` are already defined
in `fabricare/*.js`:

```javascript
// fabricare/make.prepare.js
messageAction("make.prepare");

var make = new Make();
make.target("source/XYO/MyTool/Library.Source.cpp", "source/XYO/MyTool/Library.js", function(target, source) {
	Script.requireExtension("Shell");
	return Shell.system("file-to-cs --file-in=" + source + " --file-out=" + target + " --is-string --name=librarySource");
});
make.build("source/XYO/MyTool/Library.Source.cpp");
```

Recipes run in threads created with fabricare's own init callback, so every
extension fabricare registers is available to `Script.requireExtension` in
a recipe; fabricare's script globals (`Fabricare`, `Config`, `Project`,
`messageAction`, `exitIf`, ...) are **not**: pass the values a recipe needs
as arguments.

## 4. Register it in a C++ host

A host that embeds Quantum Script makes `Make` available as an internal
extension by registering it, **together with the extensions it loads
(`Thread`, `Shell`) and the ones those need (`Buffer`, `ShellFind`)**, in
the init callback. This is what `test/test.01.cpp` does:

```cpp
#include <XYO/QuantumScript.hpp>
#include <XYO/QuantumScript.Extension/Console.hpp>
#include <XYO/QuantumScript.Extension/Buffer.hpp>
#include <XYO/QuantumScript.Extension/Shell.hpp>
#include <XYO/QuantumScript.Extension/ShellFind.hpp>
#include <XYO/QuantumScript.Extension/Thread.hpp>
#include <XYO/QuantumScript.Extension/Make.hpp>

using namespace XYO::QuantumScript;

void initExecutive(Executive *executive) {
	Extension::Console::registerInternalExtension(executive);
	Extension::Buffer::registerInternalExtension(executive);
	Extension::Shell::registerInternalExtension(executive);
	Extension::ShellFind::registerInternalExtension(executive);
	Extension::Thread::registerInternalExtension(executive);
	Extension::Make::registerInternalExtension(executive);
};

int main(int cmdN, char *cmdS[]) {
	if (ExecutiveX::initExecutive(cmdN, cmdS, initExecutive)) {
		if (!ExecutiveX::executeFile("build.js")) {
			printf("%s\n", (ExecutiveX::getError()).value());
			printf("%s", (ExecutiveX::getStackTrace()).value());
		};
		ExecutiveX::endProcessing();
	};
	return 0;
};
```

The same `initExecutive` callback runs again for **every recipe thread**,
so register there every extension the recipes will require.

Registering only makes the extension *available*: scripts still call
`Script.requireExtension("Make")`. With the DLL build of the engine an
external `quantum-script--make.dll` found on the include path wins over the
internal one; use `Script.requireInternalExtension("Make")` to force the
internal one.

In the host's `fabricare.json`:

```json
{
	"name": "my-host",
	"make": "exe",
	"sourcePath": "XYO/MyHost",
	"dependency": [
		"quantum-script--make"
	]
}
```

## 5. Static builds

For a self-contained executable depend on the static variants and the static
CRT:

```json
{
	"name": "my-host.static",
	"make": "exe",
	"sourcePath": "XYO/MyHost",
	"dependency": [
		"quantum-script--console.static",
		"quantum-script--make.static"
	],
	"crt": "static"
}
```

`quantum-script--make.static` pulls in `quantum-script.static` and the
static `--console`, `--buffer`, `--thread`, `--shell` and `--shellfind`
libraries, and exports the define `XYO_QUANTUMSCRIPT_EXTENSION_MAKE_LIBRARY`
to its consumers, which turns `XYO_QUANTUMSCRIPT_EXTENSION_MAKE_EXPORT` into
nothing and leaves out the `quantumScriptExtension` DLL entry point. A static
host must register every extension with `registerInternalExtension`
(section 4): external DLLs cannot be loaded into a host that does not use the
engine DLL.
