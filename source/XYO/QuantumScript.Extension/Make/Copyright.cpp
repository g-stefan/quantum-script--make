// Quantum Script Extension Make
// Copyright (c) 2016-2025 Grigore Stefan <g_stefan@yahoo.com>
// MIT License (MIT) <http://opensource.org/licenses/MIT>
// SPDX-FileCopyrightText: 2016-2025 Grigore Stefan <g_stefan@yahoo.com>
// SPDX-License-Identifier: MIT

#include <XYO/QuantumScript.Extension/Make/Copyright.hpp>
#include <XYO/QuantumScript.Extension/Make/Copyright.rh>

namespace XYO::QuantumScript::Extension::Make::Copyright {

	static const char *copyright_ = XYO_QUANTUMSCRIPT_EXTENSION_MAKE_COPYRIGHT;
	static const char *publisher_ = XYO_QUANTUMSCRIPT_EXTENSION_MAKE_PUBLISHER;
	static const char *company_ = XYO_QUANTUMSCRIPT_EXTENSION_MAKE_COMPANY;
	static const char *contact_ = XYO_QUANTUMSCRIPT_EXTENSION_MAKE_CONTACT;

	const char *copyright() {
		return copyright_;
	};

	const char *publisher() {
		return publisher_;
	};

	const char *company() {
		return company_;
	};

	const char *contact() {
		return contact_;
	};

};
