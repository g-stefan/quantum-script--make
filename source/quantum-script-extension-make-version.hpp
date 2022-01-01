//
// Quantum Script Extension Make
//
// Copyright (c) 2020-2022 Grigore Stefan <g_stefan@yahoo.com>
// Created by Grigore Stefan <g_stefan@yahoo.com>
//
// MIT License (MIT) <http://opensource.org/licenses/MIT>
//

#ifndef QUANTUM_SCRIPT_EXTENSION_MAKE_VERSION_HPP
#define QUANTUM_SCRIPT_EXTENSION_MAKE_VERSION_HPP

#define QUANTUM_SCRIPT_EXTENSION_MAKE_VERSION_ABCD                 2,7,0,22
#define QUANTUM_SCRIPT_EXTENSION_MAKE_VERSION_STR                 "2.7.0"
#define QUANTUM_SCRIPT_EXTENSION_MAKE_VERSION_STR_BUILD           "22"
#define QUANTUM_SCRIPT_EXTENSION_MAKE_VERSION_STR_DATETIME        "2022-01-01 21:19:41"

#ifndef XYO_RC

#ifndef QUANTUM_SCRIPT_EXTENSION_MAKE__EXPORT_HPP
#include "quantum-script-extension-make--export.hpp"
#endif

namespace Quantum {
	namespace Script {
		namespace Extension {
			namespace Make {
				namespace Version {
					QUANTUM_SCRIPT_EXTENSION_MAKE_EXPORT const char *version();
					QUANTUM_SCRIPT_EXTENSION_MAKE_EXPORT const char *build();
					QUANTUM_SCRIPT_EXTENSION_MAKE_EXPORT const char *versionWithBuild();
					QUANTUM_SCRIPT_EXTENSION_MAKE_EXPORT const char *datetime();
				};
			};
		};
	};
};

#endif
#endif

