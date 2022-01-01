//
// Quantum Script Extension Make
//
// Copyright (c) 2020-2022 Grigore Stefan <g_stefan@yahoo.com>
// Created by Grigore Stefan <g_stefan@yahoo.com>
//
// MIT License (MIT) <http://opensource.org/licenses/MIT>
//

Script.requireExtension("Thread");
Script.requireExtension("Shell");

function MakeError(message) {
	this.message = message;
};
MakeError.prototype = Object.create(Error.prototype);
MakeError.prototype.toString = function() {
	return "Make: " + this.message;
};

function Make() {
	.targets_ = {};
	.threadsCount = 8;

	.target = function(target, source, proc, this_, arg) {
		if(!Script.isFunction(proc)) {
			throw new MakeError("invalid function provided");
		};
		if(Script.isNil(arg)) {
			arg = [target, source];
		};
		if(Script.isArray(target) || Script.isObject(target)) {
			Script.forEach(target, function(key, value) {
				.targets_[value] = [source, proc, this_, arg, false, false, false];
			}, this);
		};
		.targets_[target] = [source, proc, this_, arg, false, false, false];
	};

	.build = function(target) {
		var buildTree = [];
		var m;
		var targetToBuild;
		var count;
		var threads;
		var done;
		var countX;

		if(Script.isNil(target)) {
			Script.forEach(.targets_, function(key) {
				.build(key);
			}, this);
			return;
		};

		Script.forEach(.targets_, function(key, value) {
			.targets_[key][4] = false;
			.targets_[key][5] = false;
		}, this);

		.buildTreeGenerate_(buildTree, target, 0);

		for(m = buildTree.length - 1; m >= 0; --m) {
			if(!buildTree[m]) {
				continue;
			};

			targetToBuild = [];
			Script.forEach(buildTree[m], function(key) {
				if(!.targets_[key][5]) {
					targetToBuild[targetToBuild.length] = key;
				};
			}, this);

			count = 0;
			threads = [];
			done = 0;

			while(count < targetToBuild.length) {
				CurrentThread.sleep(1);
				if(threads.length < .threadsCount) {
					if(count < targetToBuild.length) {
						threads[threads.length] = [Thread.newThread(.targets_[targetToBuild[count]][1], .targets_[targetToBuild[count]][2], .targets_[targetToBuild[count]][3]), targetToBuild[count]];
						++count;
						continue;
					};
				};
				break;
			};
			while(done < targetToBuild.length) {
				CurrentThread.sleep(1);
				countX = 0;
				for(k = 0; k < threads.length; ++k) {
					if(threads[k]) {
						if(threads[k][0].isTerminated()) {
							if(threads[k][0].getReturnedValue()) {
								throw(new MakeError("Build failed."));
							};
							if(!Shell.fileExists(threads[k][1])) {
								throw(new MakeError("Build failed, target not found: " + threads[k][1]));
							};
							.targets_[threads[k][1]][5] = true;
							threads[k] = null;
							++done;
							continue;
						};
						countX++;
					};
				};
				if(countX >= .threadsCount) {
					continue;
				};
				for(k = 0; k < threads.length; ++k) {
					if(!threads[k]) {
						if(count < targetToBuild.length) {
							threads[k] = [Thread.newThread(.targets_[targetToBuild[count]][1], .targets_[targetToBuild[count]][2], .targets_[targetToBuild[count]][3]), targetToBuild[count]];
							++count;
							continue;
						};
					};
				};
			};
		};
	};

	.buildTreeGenerate_ = function(buildTree, target, level) {
		if(Script.isNil(target)) {
			return true;
		};
		if(Script.isNil(buildTree[level])) {
			buildTree[level] = {};
		};
		if(.buildTreeGenerateTarget_(buildTree, target, level)) {
			buildTree[level][target] = true;
			return true;
		};
		if(!Shell.fileExists(target)) {
			buildTree[level][target] = true;
			return true;
		};
		return false;
	};

	.buildTreeGenerateTarget_ = function(buildTree, target, level) {
		if(Script.isNil(.targets_[target])) {
			throw(new MakeError("Target not found: " + target));
		};

		if(.targets_[target][4]) {
			Script.forEach(.targets_, function(key, value) {
				.targets_[key][6] = false;
			}, this);
			.buildTreeBumpTarget_(buildTree, target, level);
			return false;
		};

		.targets_[target][4] = true;

		if(Script.isNil(.targets_[target][0])) {
			buildTree[level][target] = true;
			return true;
		};

		if(Script.isArray(.targets_[target][0]) || Script.isObject(.targets_[target][0])) {
			var retV;
			retV = false;

			Script.forEach(.targets_[target][0], function(key, value) {
				if(.buildTreeGenerateTargetSource_(buildTree, target, value, level)) {
					retV = true;
				};
			}, this);
			return retV;
		};

		return .buildTreeGenerateTargetSource_(buildTree, target, .targets_[target][0], level);
	};

	.buildTreeGenerateTargetSource_ = function(buildTree, target, source, level) {
		if(Script.isNil(.targets_[target])) {
			throw(new MakeError("Target not found: " + target));
		};

		if(Script.isNil(.targets_[source])) {
			if(!Shell.fileExists(source)) {
				throw(new MakeError("Source not found: " + source));
			};
			if(Shell.compareLastWriteTime(target, source) < 0) {
				buildTree[level][target] = true;
				return true;
			};
			return false;
		};
		if(Shell.fileExists(source)) {
			if(Shell.compareLastWriteTime(target, source) < 0) {
				buildTree[level][target] = true;
				.buildTreeGenerate_(buildTree, source, level + 1);
				return true;
			};
		};
		return .buildTreeGenerate_(buildTree, source, level + 1);
	};

	.buildTreeBumpTarget_ = function(buildTree, target, level) {
		if(Script.isNil(.targets_[target])) {
			return;
		};

		if(.targets_[target][6]) {
			return;
		};

		.targets_[target][6] = true;

		if(Script.isArray(.targets_[target][0]) || Script.isObject(.targets_[target][0])) {
			Script.forEach(.targets_[target][0], function(key, value) {
				.buildTreeBumpSource_(buildTree, target, value, level + 1);
			}, this);
			return;
		};

		.buildTreeBumpSource_(buildTree, target, .targets_[target][0], level + 1);
	};

	.buildTreeBumpSource_ = function(buildTree, target, source, level) {
		Script.forEach(buildTree, function(key, value) {
			Script.forEach(value, function(keyX, valueX) {
				if(keyX == source) {
					if(Script.isNil(buildTree[level])) {
						buildTree[level] = {};
					};
					buildTree[level][source] = true;
					.buildTreeBumpTarget_(buildTree, source, level);
				};
			}, this);
		}, this);
	};

	.touchIfExists = function(file) {
		Shell.touchIfExists(file);
	};

	.copyFile = function(target, source) {
		Shell.copyFile(source, target);
	};

};

