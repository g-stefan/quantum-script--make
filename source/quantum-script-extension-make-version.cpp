//
// Quantum Script Extension Make
//
// Copyright (c) 2020-2022 Grigore Stefan <g_stefan@yahoo.com>
// Created by Grigore Stefan <g_stefan@yahoo.com>
//
// MIT License (MIT) <http://opensource.org/licenses/MIT>
//

#include "quantum-script-extension-make-version.hpp"

namespace Quantum {
	namespace Script {
		namespace Extension {
			namespace Make {
				namespace Version {

					static const char *version_ = "2.14.0";
					static const char *build_ = "25";
					static const char *versionWithBuild_ = "2.14.0.25";
					static const char *datetime_ = "2022-04-04 01:44:55";

					const char *version() {
						return version_;
					};
					const char *build() {
						return build_;
					};
					const char *versionWithBuild() {
						return versionWithBuild_;
					};
					const char *datetime() {
						return datetime_;
					};

				};
			};
		};
	};
};
