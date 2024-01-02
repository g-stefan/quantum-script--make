// Quantum Script Extension Make
// Copyright (c) 2016-2024 Grigore Stefan <g_stefan@yahoo.com>
// MIT License (MIT) <http://opensource.org/licenses/MIT>
// SPDX-FileCopyrightText: 2016-2024 Grigore Stefan <g_stefan@yahoo.com>
// SPDX-License-Identifier: MIT

#include <XYO/QuantumScript.Extension/Make/Library.hpp>
#include <XYO/QuantumScript.Extension/Make/Copyright.hpp>
#include <XYO/QuantumScript.Extension/Make/License.hpp>
#include <XYO/QuantumScript.Extension/Make/Version.hpp>

#include <XYO/QuantumScript.Extension/Make/Library.Source.cpp>

namespace XYO::QuantumScript::Extension::Make {

	void registerInternalExtension(Executive *executive) {
		executive->registerInternalExtension("Make", initExecutive);
	};

	void initExecutive(Executive *executive, void *extensionId) {

		String info = "Make\r\n";
		info << License::shortLicense().c_str();

		executive->setExtensionName(extensionId, "Make");
		executive->setExtensionInfo(extensionId, info);
		executive->setExtensionVersion(extensionId, Extension::Make::Version::versionWithBuild());
		executive->setExtensionPublic(extensionId, true);

		executive->compileStringX(librarySource);
	};

};

#ifdef XYO_COMPILE_DYNAMIC_LIBRARY
extern "C" XYO_QUANTUMSCRIPT_EXTENSION_MAKE_EXPORT void quantumScriptExtension(XYO::QuantumScript::Executive *executive, void *extensionId) {
	XYO::QuantumScript::Extension::Make::initExecutive(executive, extensionId);
};
#endif
