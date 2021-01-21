/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as cdk from '@aws-cdk/core';
import 'source-map-support/register';

import { loadConfig } from '../lib/utils/config-loaders';
import { StackCommonProps } from '../lib/base/base-stack';

import { ModelArchivingStack } from './stack/model-serving/model-archiving-stack';
import { ModelServingStack } from './stack/model-serving/model-serving-stack';
import { APIHostingStack } from './stack/api-hosting/api-hosting-stack';
import { MonitorDashboardStack } from './stack/monitor-dashboard/monitor-dashboard-stack';
import { CicdPipelineStack } from './stack/cicd-pipeline/cicd-pipeline-stack';
import { APITestingStack } from './stack/api-testing/api-testing-stack';
import { TesterDashboardStack } from './stack/monitor-dashboard/tester-dashboard-stack';


let appConfig: any = loadConfig('config/app-config.json');
const stackCommonProps: StackCommonProps = { 
    projectPrefix: `${appConfig.Project.Name}${appConfig.Project.Stage}`, 
    appConfig: appConfig,
    env: {
        account: appConfig.Project.Account,
        region: appConfig.Project.Region
    }
};

const cdkApp = new cdk.App();

new ModelArchivingStack(cdkApp, stackCommonProps, appConfig.Stack.ModelArchiving);

new ModelServingStack(cdkApp, stackCommonProps, appConfig.Stack.ModelServing);

new APIHostingStack(cdkApp, stackCommonProps, appConfig.Stack.APIHosting);

new MonitorDashboardStack(cdkApp, stackCommonProps, appConfig.Stack.MonitorDashboard);

new CicdPipelineStack(cdkApp, stackCommonProps, appConfig.Stack.CICDPipeline);

new APITestingStack(cdkApp, stackCommonProps, appConfig.Stack.APITesting);

new TesterDashboardStack(cdkApp, stackCommonProps, appConfig.Stack.TesterDashboard);
