//
// Quantum Script Extension Make
//
// Copyright (c) 2020-2021 Grigore Stefan <g_stefan@yahoo.com>
// Created by Grigore Stefan <g_stefan@yahoo.com>
//
// MIT License (MIT) <http://opensource.org/licenses/MIT>
//

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "quantum-script-extension-make-license.hpp"
#include "quantum-script-extension-make.hpp"
#ifndef QUANTUM_SCRIPT_EXTENSION_MAKE_NO_VERSION
#include "quantum-script-extension-make-version.hpp"
#endif

#include "quantum-script-extension-make.src"


//#define QUANTUM_SCRIPT_VM_DEBUG_RUNTIME

namespace Quantum {
	namespace Script {
		namespace Extension {
			namespace Make {

				using namespace XYO;
				using namespace Quantum::Script;

				void registerInternalExtension(Executive *executive) {
					executive->registerInternalExtension("Make", initExecutive);
				};

				void initExecutive(Executive *executive, void *extensionId) {

					String info = "Make\r\n";
					info << License::shortContent();

					executive->setExtensionName(extensionId, "Make");
					executive->setExtensionInfo(extensionId, info);
#ifndef QUANTUM_SCRIPT_EXTENSION_MAKE_NO_VERSION
					executive->setExtensionVersion(extensionId, Extension::Make::Version::versionWithBuild());
#endif
					executive->setExtensionPublic(extensionId, true);

					executive->compileStringX(extensionMakeSource);
				};

			};
		};
	};
};

#ifdef XYO_COMPILE_DYNAMIC_LIBRARY
extern "C" QUANTUM_SCRIPT_EXTENSION_MAKE_EXPORT void quantumScriptExtension(Quantum::Script::Executive *executive, void *extensionId) {
	Quantum::Script::Extension::Make::initExecutive(executive, extensionId);
};
#endif

