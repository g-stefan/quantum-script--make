# Quantum Script Extension Make

Quantum Script extension
- A make-style incremental build engine for scripts: declare targets
(files to produce), their sources and a recipe function, then build only
what is missing or older than its sources.
- Dependency tree: sources that are themselves targets are built first,
deepest level first.
- Parallel recipes: independent targets run on their own threads, up to
the number of logical processors (`threadsCount`).
- Checked results: a recipe that returns a truthy value, or does not
produce its target, stops the build with a `MakeError`.
- Available in fabricare build scripts without loading it.

```javascript
Script.requireExtension("Make");

MakeError(message);
var make = new Make();
make.threadsCount;
make.target(target,source,proc,this_,arg);
make.build(target);
make.touchIfExists(file);
make.copyFile(target,source);
```

Built on `quantum-script`, `quantum-script--thread` and
`quantum-script--shell`, part of the XYO C++ SDK.

## Documentation

- [Overview](docs/README.md) - purpose and design
- [Getting started](docs/getting-started.md) - build, a first build script, fabricare scripts, register in a C++ host, static builds
- [Build model](docs/build-model.md) - when a target is rebuilt, dependency levels, parallel execution, known limitations
- [Script API](docs/script-api.md) - every function: exact behavior, edge cases
- [Writing recipes](docs/recipes.md) - thread rules, reporting errors, patterns
- [C++ API](docs/cpp-api.md) - `registerInternalExtension`, the embedded script, extensions a host must register
- [API reference](docs/reference.md)

A Claude Code skill for this extension is in
[.claude/skills/quantum-script--make](.claude/skills/quantum-script--make/SKILL.md).

## License

Copyright (c) 2016-2026 Grigore Stefan
Licensed under the [MIT](LICENSE) license.
