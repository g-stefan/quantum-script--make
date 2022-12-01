// Quantum Script Extension Make
// Copyright (c) 2022 Grigore Stefan <g_stefan@yahoo.com>
// MIT License (MIT) <http://opensource.org/licenses/MIT>
// SPDX-FileCopyrightText: 2022 Grigore Stefan <g_stefan@yahoo.com>
// SPDX-License-Identifier: MIT

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
	this.targets_ = {};
	this.threadsCount = 8;

	this.target = function(target, source, proc, this_, arg) {
		if(!Script.isFunction(proc)) {
			throw new MakeError("Invalid function provided");
		};
		if(Script.isNil(arg)) {
			arg = [target, source];
		};
		if(Script.isArray(target) || Script.isObject(target)) {
			Script.forEach(target, function(key, value) {
				this.targets_[value] = [source, proc, this_, arg, false, false, false];
			}, this);
		};
		this.targets_[target] = [source, proc, this_, arg, false, false, false];
	};

	this.build = function(target) {
		var buildTree = [];
		var m;
		var targetToBuild;
		var count;
		var threads;
		var done;
		var countX;

		if(Script.isNil(target)) {
			Script.forEach(this.targets_, function(key) {
				this.build(key);
			}, this);
			return;
		};

		Script.forEach(this.targets_, function(key, value) {
			this.targets_[key][4] = false;
			this.targets_[key][5] = false;
		}, this);

		this.buildTreeGenerate_(buildTree, target, 0);

		for(m = buildTree.length - 1; m >= 0; --m) {
			if(!buildTree[m]) {
				continue;
			};

			targetToBuild = [];
			Script.forEach(buildTree[m], function(key) {
				if(!this.targets_[key][5]) {
					targetToBuild[targetToBuild.length] = key;
				};
			}, this);

			count = 0;
			threads = [];
			done = 0;

			while(count < targetToBuild.length) {
				CurrentThread.sleep(1);
				if(threads.length < this.threadsCount) {
					if(count < targetToBuild.length) {
						threads[threads.length] = [Thread.newThread(this.targets_[targetToBuild[count]][1], this.targets_[targetToBuild[count]][2], this.targets_[targetToBuild[count]][3]), targetToBuild[count]];
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
							this.targets_[threads[k][1]][5] = true;
							threads[k] = null;
							++done;
							continue;
						};
						countX++;
					};
				};
				if(countX >= this.threadsCount) {
					continue;
				};
				for(k = 0; k < threads.length; ++k) {
					if(!threads[k]) {
						if(count < targetToBuild.length) {
							threads[k] = [Thread.newThread(this.targets_[targetToBuild[count]][1], this.targets_[targetToBuild[count]][2], this.targets_[targetToBuild[count]][3]), targetToBuild[count]];
							++count;
							continue;
						};
					};
				};
			};
		};
	};

	this.buildTreeGenerate_ = function(buildTree, target, level) {
		if(Script.isNil(target)) {
			return true;
		};
		if(Script.isNil(buildTree[level])) {
			buildTree[level] = {};
		};
		if(this.buildTreeGenerateTarget_(buildTree, target, level)) {
			buildTree[level][target] = true;
			return true;
		};
		if(!Shell.fileExists(target)) {
			buildTree[level][target] = true;
			return true;
		};
		return false;
	};

	this.buildTreeGenerateTarget_ = function(buildTree, target, level) {
		if(Script.isNil(this.targets_[target])) {
			throw(new MakeError("Target not found: " + target));
		};

		if(this.targets_[target][4]) {
			Script.forEach(this.targets_, function(key, value) {
				this.targets_[key][6] = false;
			}, this);
			this.buildTreeBumpTarget_(buildTree, target, level);
			return false;
		};

		this.targets_[target][4] = true;

		if(Script.isNil(this.targets_[target][0])) {
			buildTree[level][target] = true;
			return true;
		};

		if(Script.isArray(this.targets_[target][0]) || Script.isObject(this.targets_[target][0])) {
			var retV;
			retV = false;

			Script.forEach(this.targets_[target][0], function(key, value) {
				if(this.buildTreeGenerateTargetSource_(buildTree, target, value, level)) {
					retV = true;
				};
			}, this);
			return retV;
		};

		return this.buildTreeGenerateTargetSource_(buildTree, target, this.targets_[target][0], level);
	};

	this.buildTreeGenerateTargetSource_ = function(buildTree, target, source, level) {
		if(Script.isNil(this.targets_[target])) {
			throw(new MakeError("Target not found: " + target));
		};

		if(Script.isNil(this.targets_[source])) {
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
				this.buildTreeGenerate_(buildTree, source, level + 1);
				return true;
			};
		};
		return this.buildTreeGenerate_(buildTree, source, level + 1);
	};

	this.buildTreeBumpTarget_ = function(buildTree, target, level) {
		if(Script.isNil(this.targets_[target])) {
			return;
		};

		if(this.targets_[target][6]) {
			return;
		};

		this.targets_[target][6] = true;

		if(Script.isArray(this.targets_[target][0]) || Script.isObject(this.targets_[target][0])) {
			Script.forEach(this.targets_[target][0], function(key, value) {
				this.buildTreeBumpSource_(buildTree, target, value, level + 1);
			}, this);
			return;
		};

		this.buildTreeBumpSource_(buildTree, target, this.targets_[target][0], level + 1);
	};

	this.buildTreeBumpSource_ = function(buildTree, target, source, level) {
		Script.forEach(buildTree, function(key, value) {
			Script.forEach(value, function(keyX, valueX) {
				if(keyX == source) {
					if(Script.isNil(buildTree[level])) {
						buildTree[level] = {};
					};
					buildTree[level][source] = true;
					this.buildTreeBumpTarget_(buildTree, source, level);
				};
			}, this);
		}, this);
	};

	this.touchIfExists = function(file) {
		Shell.touchIfExists(file);
	};

	this.copyFile = function(target, source) {
		Shell.copyFile(source, target);
	};

};

