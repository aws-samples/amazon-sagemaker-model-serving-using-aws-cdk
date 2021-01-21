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
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as subs from '@aws-cdk/aws-sns-subscriptions';

import { BaseStack, StackCommonProps } from '../../../lib/base/base-stack'

interface LambdaProps {
    name: string;
    apiEndpoint: string;
    role: iam.Role;
    testDurationInSec: number,
    testIntervalInSec: number,
    snsTopic: sns.Topic
}

export class APITestingStack extends BaseStack {

    constructor(scope: cdk.Construct, props: StackCommonProps, stackConfig: any) {
        super(scope, stackConfig.Name, props, stackConfig);

        const snsTopic = this.createSnsTopic(this.stackConfig.SNSTopicName);
        this.putParameter('testTriggerSnsTopicName', snsTopic.topicName);

        const role = this.createLambdaRole('TestTrigger-Lambda');
        const apiEndpoint: string = this.getParameter('apiEndpoint');
        for (let index = 0; index < this.stackConfig.TestClientCount; index++) {
            this.createLambdaFunction({
                name: `${this.stackConfig.LambdaFunctionName}${String(index + 1).padStart(3, '0')}`,
                apiEndpoint: apiEndpoint,
                role: role,
                testDurationInSec: this.stackConfig.TestDurationInSec,
                testIntervalInSec: this.stackConfig.TestIntervalInSec,
                snsTopic: snsTopic
            });
        }
    }

    private createSnsTopic(name: string): sns.Topic {
        const topic = new sns.Topic(this, name, {
            displayName: `${this.projectPrefix}-${name}-Topic`,
            topicName: `${this.projectPrefix}-${name}-Topic`,
        });

        new cdk.CfnOutput(this, 'name', {
            value: topic.topicArn
        })

        return topic;
    }

    private createLambdaRole(baseName: string): iam.Role {
        const role = new iam.Role(this, `${baseName}-Role`, {
            roleName: `${this.projectPrefix}-${baseName}-Role`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });
        role.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' });
        role.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/CloudWatchFullAccess' });
        return role;
    }

    private createLambdaFunction(props: LambdaProps): lambda.Function {
        const baseName = `${props.name}-Lambda`;
        const fullName = `${this.projectPrefix}-${baseName}`;

        const lambdaPath = 'codes/lambda/api-testing-tester/src';

        const lambdaFunction = new lambda.Function(this, baseName, {
            functionName: fullName,
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'handler.handle',
            runtime: lambda.Runtime.PYTHON_3_7,
            timeout: cdk.Duration.minutes(15), // MAX 15 minutes
            memorySize: 256,
            role: props.role,
            retryAttempts: 0,
            environment: {
                API_ENDPOINT: props.apiEndpoint,
                PROJECT_NAME: this.commonProps.appConfig.Project.Name,
                PROJECT_STAGE: this.commonProps.appConfig.Project.Stage,
            }
        });

        props.snsTopic.addSubscription(
            new subs.LambdaSubscription(lambdaFunction));

        return lambdaFunction;
    }
}
