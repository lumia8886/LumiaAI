#!/bin/bash

# Create temporary directory
mkdir -p dist

# Copy necessary files
cp manifest.json dist/
cp background.js dist/
cp chat.html dist/
cp chat.js dist/
cp chat.css dist/
cp config.js dist/
cp background.js dist/
cp wallet.js dist/
cp ico.png dist/
cp logo.png dist/
cp -r img dist/

# Create zip file
cd dist
zip -r ../LumiaAI_Chrome.zip .
cd ..

# Clean up temporary directory
rm -rf dist