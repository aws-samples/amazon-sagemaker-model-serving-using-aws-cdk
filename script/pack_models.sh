#!/bin/sh

MODEL_ROOT=models/model-a
# MODEL_ROOT=models/model-b

MODEL_FILE=model.tar.gz
MODEL_DIR=model
SRC_DIR=src

echo ==--------RemoveOldModelDir---------==
if [ -f "$MODEL_ROOT/$MODEL_DIR/$MODEL_FILE" ]; then
    rm -r "$MODEL_ROOT/$MODEL_DIR/$MODEL_FILE"
fi

echo ==--------PackNewModel---------==
cd "$MODEL_ROOT"/"$SRC_DIR"
if [ -f "$MODEL_FILE" ]; then
    rm $MODEL_FILE
fi
tar -zcvf $MODEL_FILE ./*

echo ==--------MoveIntoModelDir---------==
mv $MODEL_FILE ../"$MODEL_DIR"
