#!/bin/sh
# Public domain
# http://unlicense.org/
# Created by Grigore Stefan <g_stefan@yahoo.com>

ACTION=$1
if [ "$ACTION" = "" ]; then
	ACTION=make
fi

echo "-> $ACTION quantum-script-extension-make"

cmdX(){
	if ! "$@" ; then
		echo "Error: $ACTION"
		exit 1
	fi
}

cmdX file-to-cs --touch=source/quantum-script-extension-make.cpp --file-in=source/quantum-script-extension-make.js --file-out=source/quantum-script-extension-make.src --is-string --name=extensionMakeSource
cmdX xyo-cc --mode=$ACTION @util/quantum-script-extension-make.static.compile
cmdX xyo-cc --mode=$ACTION @util/quantum-script-extension-make.dynamic.compile
