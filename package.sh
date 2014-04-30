#!/bin/sh
BRANCH=`git branch | egrep "\\* (.*)" | cut -c 3-`
DATE=`date +%Y%m%d%H%M`
TARGET_FILENAME="$DATE-$BRANCH.xpi"

upload() {
  echo "cd jonathan/files\nput rethread.xpi gcv-nightlies/$TARGET_FILENAME" | ftp xulforum@ftp.xulforum.org
}

./build.sh
upload;
rm -f rethread.xpi;
