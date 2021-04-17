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
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';

import { BaseStack, StackCommonProps } from '../../../lib/base/base-stack'

interface PredictLambdaProps {
    name: string
    endpointName: string;
}

export class APIHostingStack extends BaseStack {

    constructor(scope: cdk.Construct, props: StackCommonProps, stackConfig: any) {
        super(scope, stackConfig.Name, props, stackConfig);

        const gatewayName = this.stackConfig.APIGatewayName;
        const restApi = this.createAPIGateway(gatewayName);
        this.putParameter('apiGatewayName', `${this.projectPrefix}-${gatewayName}`);
        this.putParameter('apiGatewayId', restApi.restApiId);
        this.putParameter('apiEndpoint', this.getApiEndpoint(restApi));

        this.addServiceResource(
            restApi,
            this.stackConfig.ResourceName,
            this.stackConfig.ResourceMethod,
            this.stackConfig.LambdaFunctionName);
    }

    private createAPIGateway(gatewayName: string): apigateway.RestApi {
        const gateway = new apigateway.RestApi(this, gatewayName, {
            restApiName: `${this.projectPrefix}-${gatewayName}`,
            endpointTypes: [apigateway.EndpointType.REGIONAL],
            description: "This is a API-Gateway for Text Classification Service.",
            retainDeployments: true,
            deploy: true,
            deployOptions: {
                stageName: this.commonProps.appConfig.Project.Stage,
                loggingLevel: apigateway.MethodLoggingLevel.ERROR
            },
        });

        const apiKey = gateway.addApiKey('ApiKey', {
            apiKeyName: `${this.projectPrefix}-${gatewayName}-Key`,
        });

        const plan = gateway.addUsagePlan('APIUsagePlan', {
            name: `${this.projectPrefix}-${gatewayName}-Plan`,
            apiKey: apiKey
        });

        plan.addApiStage({
            stage: gateway.deploymentStage,
        });

        return gateway;
    }

    private getApiEndpoint(restApi: apigateway.RestApi): string {
        const region = this.commonProps.env?.region;
        return `${restApi.restApiId}.execute-api.${region}.amazonaws.com`;
    }

    private addServiceResource(gateway: apigateway.RestApi, resourceName: string, resourceMethod: string, functionName: string) {
        const resource = gateway.root.addResource(resourceName);

        const lambdaFunction = this.createPredictLambdaFunction({
            name: functionName,
            endpointName: this.getParameter('sageMakerEndpointName'),
        });
        this.putParameter('predictLambdaFunctionArn', lambdaFunction.functionArn);
        const lambdaInferAlias = lambdaFunction.currentVersion.addAlias(this.commonProps.appConfig.Project.Stage);

        const name = 'PredictLambdaIntegration';
        const role = new iam.Role(this, `${name}-Role`, {
            roleName: `${this.projectPrefix}-${name}-Role`,
            assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        });
        role.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/AWSLambda_FullAccess' });

        const lambdaIntegration = new apigateway.LambdaIntegration(lambdaInferAlias, {
            credentialsRole: role,
            proxy: false,
            passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
            integrationResponses: [
                {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': '$input.json("$")'
                    }
                }
            ]
        });

        resource.addMethod(resourceMethod, lambdaIntegration, {
            methodResponses: [{ statusCode: '200' }]
        });
    }

    private createPredictLambdaFunction(props: PredictLambdaProps) {
        const baseName = `${props.name}-Lambda`;
        const fullName = `${this.projectPrefix}-${baseName}`;

        const lambdaPath = 'codes/lambda/api-hosting-predictor/src';

        const role = new iam.Role(this, `${baseName}-Role`, {
            roleName: `${fullName}-Role`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });
        role.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' });
        role.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonSageMakerFullAccess' });
        role.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonKinesisFullAccess' });

        const lambdaFunction = new lambda.Function(this, baseName, {
            functionName: fullName,
            code: lambda.Code.fromAsset(lambdaPath),
            handler: 'handler.handle',
            runtime: lambda.Runtime.PYTHON_3_7,
            timeout: cdk.Duration.seconds(60 * 5),
            memorySize: 1024,
            role: role,
            environment: {
                SAGEMAKER_ENDPOINT: props.endpointName,
            },
            currentVersionOptions: {
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                retryAttempts: 1
            }
        });

        return lambdaFunction;
    }
}
