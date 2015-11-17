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

TARGETS = boot.js runner.js preamp_runner.js
ALL_TARGETS = ${TARGETS} boot.min.js runner.min.js preamp.min.js preamp_runner.js

LIBS = 

default: ${TARGETS}

all: ${ALL_TARGETS}

boot.js: ${INTERCEPTION_DIR}/boot.js
	cat ${.ALLSRC} > ${.TARGET}
	
runner.js: ${INTERCEPTION_DIR}/runner.js
	cat ${.ALLSRC} > ${.TARGET}

preamp_runner.js: runner.js preamp.js
	cat ${.ALLSRC} > ${.TARGET}

%.min.js: %.js
	${YUICOMPRESSOR} ${.IMPSRC} > ${.TARGET}

