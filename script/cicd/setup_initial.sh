#!/bin/sh

# Configuration File Path
CONFIG_INFRA=config/app-config.json

echo ==--------CheckDedendencies---------==
npm install -g aws-cdk
aws --version
npm --version
cdk --version
jq --version

ACCOUNT=$(cat $CONFIG_INFRA | jq -r '.Project.Account') #ex> 123456789123
REGION=$(cat $CONFIG_INFRA | jq -r '.Project.Region') #ex> us-east-1

echo ==--------ConfigInfo---------==
echo $CONFIG_INFRA
echo $ACCOUNT
echo $REGION
cat $CONFIG_INFRA
echo .
echo .

echo ==--------InstallCDKDependencies---------==
npm install
echo .
echo .

echo ==--------BootstrapCDKEnvironment---------==
cdk bootstrap aws://$ACCOUNT/$REGION
echo .
echo .
