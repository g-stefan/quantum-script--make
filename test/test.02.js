// Created by Grigore Stefan <g_stefan@yahoo.com>
// Public domain (Unlicense) <http://unlicense.org>
// SPDX-FileCopyrightText: 2016-2026 Grigore Stefan <g_stefan@yahoo.com>
// SPDX-License-Identifier: Unlicense

Script.requireExtension("Console");
Script.requireExtension("Make");

var k = "keep";

var path = "../../temp/test.02";

function concat(target, source) {
	Script.requireExtension("Shell");
	var content = "";
	var i;
	if (Script.isArray(source)) {
		for (i = 0; i < source.length; ++i) {
			content += Shell.fileGetContents(source[i]);
		};
	} else {
		content += Shell.fileGetContents(source);
	};
	return !Shell.filePutContents(target, content);
};

function check(name, file, value) {
	var content = Shell.fileGetContents(path + "/" + file);
	if (content != value) {
		throw (new Error(name + ": " + file + " is \"" + content + "\", expected \"" + value + "\""));
	};
	Console.writeLn("[test.02] " + name + ": " + file + " ok");
};

function changeSource(file, value) {
	// let the new write time be later than the targets
	CurrentThread.sleep(1100);
	Shell.filePutContents(path + "/" + file, value);
};

Shell.removeDirRecursively(path);
Shell.mkdirRecursivelyIfNotExists(path);

// diamond: t <- [a, b]; a <- c; b <- c; c <- s
Shell.filePutContents(path + "/s", "1");

var make = new Make();
make.target(path + "/c", path + "/s", concat);
make.target(path + "/a", path + "/c", concat);
make.target(path + "/b", path + "/c", concat);
make.target(path + "/t", [ path + "/a", path + "/b" ], concat);

make.build(path + "/t");
check("diamond, first build", "t", "11");
if (k != "keep") {
	throw (new Error("global k overwritten by build: " + k));
};
Console.writeLn("[test.02] global k ok");

changeSource("s", "2");
make.build(path + "/t");
check("diamond, source changed", "a", "2");
check("diamond, source changed", "b", "2");
check("diamond, source changed", "t", "22");

// shared dependency on different levels: u <- [e, f]; e <- g; f <- h; h <- g; g <- r
Shell.filePutContents(path + "/r", "1");

make = new Make();
make.target(path + "/g", path + "/r", concat);
make.target(path + "/e", path + "/g", concat);
make.target(path + "/h", path + "/g", concat);
make.target(path + "/f", path + "/h", concat);
make.target(path + "/u", [ path + "/e", path + "/f" ], concat);

make.build(path + "/u");
check("levels, first build", "u", "11");

changeSource("r", "2");
make.build(path + "/u");
check("levels, source changed", "h", "2");
check("levels, source changed", "f", "2");
check("levels, source changed", "u", "22");

if (k != "keep") {
	throw (new Error("global k overwritten by build: " + k));
};

Shell.removeDirRecursively(path);

Console.writeLn("[test.02] ok");
