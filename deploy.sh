#! /usr/bin/env bash

npm run build
cp -r ./infra/pre-build-lambda-assets/. ./build/

cd build
npm ci --omit dev

cd ../
npx cdk deploy