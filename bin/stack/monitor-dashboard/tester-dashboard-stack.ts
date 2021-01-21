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
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';

import { BaseStack, StackCommonProps } from '../../../lib/base/base-stack'
import { CloudWatchDashboard } from './cloudwatch-dashboard'


export class TesterDashboardStack extends BaseStack {
    private readonly dashboard: CloudWatchDashboard;

    constructor(scope: cdk.Construct, props: StackCommonProps, stackConfig: any) {
        super(scope, stackConfig.Name, props, stackConfig);

        const dashboardName = this.stackConfig.DashboardName;
        this.dashboard = new CloudWatchDashboard(this, dashboardName, {
            projectFullName: this.projectPrefix,
            dashboardName: dashboardName,
            period: cdk.Duration.minutes(1)
        });

        const topicName = this.getParameter('testTriggerSnsTopicName');
        this.createSnsTopicWidget('TriggerSNSTopic', topicName);

        this.createResponseTimeWidget('ResponseTime', 'ApiGateway');
        this.createSuccessWidget('SuccessSum', 'ApiGateway');
        this.createFailWidget('FailSum', 'ApiGateway');
    }

    private createResponseTimeWidget(testTitle: string, testName: string) {
        const metricNameList = ['ResponseTime'];
        const testCaseList = ['tc-001', 'tc-002', 'tc-003', 'tc-004']
        const requestResultMetric: cloudwatch.IMetric[] = [];
        for (var metricName of metricNameList) {
            for (var testCase of testCaseList) {
                const metric = this.dashboard.createCustomMetric(
                    this.commonProps.appConfig.Project.Name,
                    metricName,
                    {
                        Stage: this.commonProps.appConfig.Project.Stage,
                        Type: `${testName}/${testCase}`
                    },
                    {
                        statistic: 'Average',
                        label: `${testCase}-${metricName}`,
                        unit: cloudwatch.Unit.MILLISECONDS
                    }
                );
                requestResultMetric.push(metric);
            }
        }
        const requestResultWidget = this.dashboard.createWidget(`${testTitle}-${testName}`, requestResultMetric, 24);

        this.dashboard.addWidgets(requestResultWidget);
    }

    private createSuccessWidget(testTitle: string, testName: string) {
        const metricNameList = ['StatusSuccess', 'TestSuccess'];
        const testCaseList = ['tc-001', 'tc-002', 'tc-003', 'tc-004']
        const requestResultMetric: cloudwatch.IMetric[] = [];
        for (var metricName of metricNameList) {
            for (var testCase of testCaseList) {
                const metric = this.dashboard.createCustomMetric(
                    this.commonProps.appConfig.Project.Name,
                    metricName,
                    {
                        Stage: this.commonProps.appConfig.Project.Stage,
                        Type: `${testName}/${testCase}`
                    },
                    {
                        statistic: 'Sum',
                        label: `${testCase}-${metricName}`
                    }
                );
                requestResultMetric.push(metric);
            }
        }
        const requestResultWidget = this.dashboard.createWidget(`${testTitle}-${testName}`, requestResultMetric, 24);

        this.dashboard.addWidgets(requestResultWidget);
    }

    private createFailWidget(testTitle: string, testName: string) {
        const metricNameList = ['StatusError', 'TestFail'];
        const testCaseList = ['tc-001', 'tc-002', 'tc-003', 'tc-004']
        const requestResultMetric: cloudwatch.IMetric[] = [];
        for (var metricName of metricNameList) {
            for (var testCase of testCaseList) {
                const metric = this.dashboard.createCustomMetric(
                    this.commonProps.appConfig.Project.Name,
                    metricName,
                    {
                        Stage: this.commonProps.appConfig.Project.Stage,
                        Type: `${testName}/${testCase}`
                    },
                    {
                        statistic: 'Sum',
                        label: `${testCase}-${metricName}`
                    }
                );
                requestResultMetric.push(metric);
            }
        }
        const requestResultWidget = this.dashboard.createWidget(`${testTitle}-${testName}`, requestResultMetric, 24);

        this.dashboard.addWidgets(requestResultWidget);
    }

    private createSnsTopicWidget(widgetName: string, topicName: string) {
        const publishedMetric = this.dashboard.createSnsMetric(topicName, 'NumberOfMessagesPublished', { statistic: 'Sum', unit: cloudwatch.Unit.COUNT });
        const deliveredMetric = this.dashboard.createSnsMetric(topicName, 'NumberOfNotificationsDelivered', { statistic: 'Sum', unit: cloudwatch.Unit.COUNT });
        const failedMetric = this.dashboard.createSnsMetric(topicName, 'NumberOfNotificationsFailed', { statistic: 'Sum', unit: cloudwatch.Unit.COUNT });

        const widget = this.dashboard.createWidget(widgetName, [publishedMetric, deliveredMetric, failedMetric], 24);

        this.dashboard.addWidgets(widget);
    }
}
