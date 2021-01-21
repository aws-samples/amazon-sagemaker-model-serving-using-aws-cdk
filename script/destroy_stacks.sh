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

echo ==--------DestroyStacksStepByStep---------==
cdk destroy *-TesterDashboardStack --force --profile $PROFILE_NAME
cdk destroy *-APITestingStack --force --profile $PROFILE_NAME
cdk destroy *-CICDPipelineStack --force --profile $PROFILE_NAME
cdk destroy *-MonitorDashboardStack --force --profile $PROFILE_NAME
cdk destroy *-APIHostingStack --force --profile $PROFILE_NAME
cdk destroy *-ModelServingStack --force --profile $PROFILE_NAME
cdk destroy *-ModelArchivingStack --force --profile $PROFILE_NAME
echo .
echo .
