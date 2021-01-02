//
// Quantum Script Extension Make
//
// Copyright (c) 2020-2021 Grigore Stefan <g_stefan@yahoo.com>
// Created by Grigore Stefan <g_stefan@yahoo.com>
//
// MIT License (MIT) <http://opensource.org/licenses/MIT>
//

#ifndef QUANTUM_SCRIPT_EXTENSION_MAKE_HPP
#define QUANTUM_SCRIPT_EXTENSION_MAKE_HPP

#ifndef QUANTUM_SCRIPT_HPP
#include "quantum-script.hpp"
#endif

#ifndef QUANTUM_SCRIPT_EXTENSION_MAKE__EXPORT_HPP
#include "quantum-script-extension-make--export.hpp"
#endif

#ifndef QUANTUM_SCRIPT_EXTENSION_MAKE_COPYRIGHT_HPP
#include "quantum-script-extension-make-copyright.hpp"
#endif

#ifndef QUANTUM_SCRIPT_EXTENSION_MAKE_LICENSE_HPP
#include "quantum-script-extension-make-license.hpp"
#endif

#ifndef QUANTUM_SCRIPT_EXTENSION_MAKE_VERSION_HPP
#include "quantum-script-extension-make-version.hpp"
#endif

namespace Quantum {
	namespace Script {
		namespace Extension {
			namespace Make {

				using namespace Quantum::Script;

				QUANTUM_SCRIPT_EXTENSION_MAKE_EXPORT void initExecutive(Executive *executive, void *extensionId);
				QUANTUM_SCRIPT_EXTENSION_MAKE_EXPORT void registerInternalExtension(Executive *executive);

			};
		};
	};
};

#endif

