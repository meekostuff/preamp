# either symlink to interception directory or update the path here
INTERCEPTION_DIR = interception

### include mk/gnu.bsdvars.mk
# Some BSD compatibility declarations

.ALLSRC = $^
.ARCHIVE = $!
.IMPSRC = $<
.MEMBER = $%
.OODATE = $?
.PREFIX = $*
.TARGET = $@
.CURDIR = ${CURDIR}

### /include

YUICOMPRESSOR = yuicompressor

.SUFFIXES:
.SUFFIXES: js md html

TARGETS = boot.js interception_runner.js runner.js
ALL_TARGETS = ${TARGETS} boot.min.js interception_runner.min.js preamp.min.js runner.min.js

LIBS = 

default: ${TARGETS}

all: ${ALL_TARGETS}

boot.js: ${INTERCEPTION_DIR}/boot.js
	cat ${.ALLSRC} > ${.TARGET}
	
interception_runner.js: ${INTERCEPTION_DIR}/runner.js
	cat ${.ALLSRC} > ${.TARGET}

runner.js: interception_runner.js preamp.js
	cat ${.ALLSRC} > ${.TARGET}

%.min.js: %.js
	${YUICOMPRESSOR} ${.IMPSRC} > ${.TARGET}

