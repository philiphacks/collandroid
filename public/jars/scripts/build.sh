#!/bin/bash
# Metadepth - Android code generation bash script

start_time=$(date +%s)

APP_NAME=$1
METADEPTH_DIR=/Users/philip/projects/collandroid/public/jars/collaborative
METADEPTH_COMMANDS_FILE=$2
ANDROID_SDK_ROOT=/Developer/SDKs/android-sdk-mac_x86/

rm -r $METADEPTH_DIR/output/$APP_NAME
mkdir $METADEPTH_DIR/output/$APP_NAME
mkdir $METADEPTH_DIR/output/$APP_NAME/src
mkdir $METADEPTH_DIR/output/$APP_NAME/src/be
mkdir $METADEPTH_DIR/output/$APP_NAME/src/be/pds
mkdir $METADEPTH_DIR/output/$APP_NAME/bin
mkdir $METADEPTH_DIR/output/$APP_NAME/gen
mkdir $METADEPTH_DIR/output/$APP_NAME/assets

echo ""
echo "=============="
echo "BUILD SETTINGS"
echo "=============="
echo ""
echo "Metadepth directory: $METADEPTH_DIR"
echo "Metadepth commands file: $METADEPTH_COMMANDS_FILE"
echo "Android SDK directory: $ANDROID_SDK_ROOT"
echo ""

echo ""
echo "=========================="
echo "Generating Android sources"
echo "=========================="
echo ""
java -jar metaDepth.jar < scripts/$METADEPTH_COMMANDS_FILE
cp $METADEPTH_DIR/templates/resources/default.properties $METADEPTH_DIR/output/$APP_NAME
cp -r $METADEPTH_DIR/templates/resources/res $METADEPTH_DIR/output/$APP_NAME
mkdir $METADEPTH_DIR/output/$APP_NAME/src/be/pds/thesis
#cp -r $METADEPTH_DIR/templates/java/net $METADEPTH_DIR/output/$APP_NAME/src/
cp -r $METADEPTH_DIR/templates/java/*.java $METADEPTH_DIR/output/$APP_NAME/src/be/pds/thesis

echo ""
echo "========================="
echo "Building Android binaries"
echo "========================="
echo ""
cat $METADEPTH_DIR/output/$APP_NAME/.classpath
cd $ANDROID_SDK_ROOT/platform-tools
./aapt package -M $METADEPTH_DIR/output/$APP_NAME/AndroidManifest.xml -S $METADEPTH_DIR/output/$APP_NAME/res/ -I ../platforms/android-8/android.jar -J $METADEPTH_DIR/output/$APP_NAME/gen -F $METADEPTH_DIR/output/$APP_NAME/bin/$APP_NAME.apk -f -v
javac -verbose -cp $METADEPTH_DIR/libraries/dropbox-android-sdk-1.2.3.jar:$METADEPTH_DIR/libraries/httpmime-4.0.3.jar:$METADEPTH_DIR/libraries/json_simple-1.1.jar:$METADEPTH_DIR/libraries/gson-2.1.jar:$METADEPTH_DIR/libraries/WebSocket.jar -bootclasspath $ANDROID_SDK_ROOT/platforms/android-8/android.jar -d $METADEPTH_DIR/output/$APP_NAME/bin $METADEPTH_DIR/output/$APP_NAME/gen/* $METADEPTH_DIR/output/$APP_NAME/src/be/pds/thesis/* $METADEPTH_DIR/output/$APP_NAME/src/be/pds/$APP_NAME/*
./dx --dex --output=$METADEPTH_DIR/output/$APP_NAME/bin/classes.dex $METADEPTH_DIR/output/$APP_NAME/bin $METADEPTH_DIR/libraries/dropbox-android-sdk-1.2.3.jar $METADEPTH_DIR/libraries/httpmime-4.0.3.jar $METADEPTH_DIR/libraries/json_simple-1.1.jar $METADEPTH_DIR/libraries/gson-2.1.jar $METADEPTH_DIR/libraries/WebSocket.jar
cd $ANDROID_SDK_ROOT/tools
./apkbuilder $METADEPTH_DIR/output/$APP_NAME/bin/unsigned.apk -v -u -z $METADEPTH_DIR/output/$APP_NAME/bin/$APP_NAME.apk -f $METADEPTH_DIR/output/$APP_NAME/bin/classes.dex -rf $METADEPTH_DIR/libraries
rm $METADEPTH_DIR/output/$APP_NAME/bin/$APP_NAME.apk
/usr/bin/jarsigner -keystore $METADEPTH_DIR/templates/resources/debug.keystore -storepass android -keypass android -signedjar $METADEPTH_DIR/output/$APP_NAME/bin/signed.apk $METADEPTH_DIR/output/$APP_NAME/bin/unsigned.apk androiddebug
rm $METADEPTH_DIR/output/$APP_NAME/bin/unsigned.apk

finish_time=$(date +%s)
echo ""
echo "============================"
echo "BUILD SUCCESSFUL ($((finish_time - start_time)) seconds)"
echo "============================"
