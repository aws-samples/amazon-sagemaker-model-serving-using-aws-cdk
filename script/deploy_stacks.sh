#!/bin/sh

# Configuration File Path
CONFIG_INFRA=config/app-config.json

PROFILE_NAME=$(cat $CONFIG_INFRA | jq -r '.Project.Profile') #ex> cdk-demo

echo ==--------ConfigInfo---------==
echo $CONFIG_INFRA
echo $PROFILE_NAME
echo .
echo .

echo ==--------ListStacks---------==
cdk list
echo .
echo .

echo ==--------DeployStacksStepByStep---------==
cdk deploy *-ModelArchivingStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-ModelServingStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-APIHostingStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-MonitorDashboardStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-CICDPipelineStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-APITestingStack --require-approval never --profile $PROFILE_NAME
cdk deploy *-TesterDashboardStack --require-approval never --profile $PROFILE_NAME
echo .
echo .
