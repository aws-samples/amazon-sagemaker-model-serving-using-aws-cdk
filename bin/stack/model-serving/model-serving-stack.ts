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
import * as sagemaker from '@aws-cdk/aws-sagemaker';
import * as applicationautoscaling from '@aws-cdk/aws-applicationautoscaling';

import { BaseStack, StackCommonProps } from '../../../lib/base/base-stack'

interface ModelProps {
    modelName: string;
    role: iam.IRole;
    modelBucketName: string;
    modelS3Key: string;
    modelDockerImage: string;
}

interface VariantConfigProps {
    variantName: string;
    variantWeight: number;
    instanceCount: number;
    instanceType: string;
    modelName: string;
}

interface EndpointConfigProps {
    endpointConfigName: string;
    role: iam.IRole;

    variantConfigPropsList: VariantConfigProps[];

    dataLoggingBucketName: string;
    dataLoggingEnable: boolean;
    dataLoggingS3Key: string;
    dataLoggingPercentage: number;
}

interface EndpointProps {
    endpointName: string;
    endpointConfigName: string;
}

interface ScalingProps {
    endpointName: string;
    variantName: string;
    minCapacity: number;
    maxCapacity: number;
    targetValue: number;
}

export class ModelServingStack extends BaseStack {

    constructor(scope: cdk.Construct, props: StackCommonProps, stackConfig: any) {
        super(scope, stackConfig.Name, props, stackConfig);

        const role: iam.IRole = this.createIamRole(`ModelEndpoint-Role`);

        const modelBucketName: string = this.getParameter('modelArchivingBucketName');
        let modelConfigList: VariantConfigProps[] = [];
        const modelList: any[] = stackConfig.ModelList;
        for (let model of modelList) {
            const modelName = this.createModel({
                modelName: model.ModelName,
                modelDockerImage: model.ModelDockerImage,
                modelS3Key: model.ModelS3Key,
                modelBucketName: modelBucketName,
                role: role
            });

            modelConfigList.push({
                modelName: modelName,
                variantName: model.VariantName,
                instanceCount: model.InstanceCount,
                instanceType: model.InstanceType,
                variantWeight: model.VariantWeight
            });
        }

        const loggingBucketName = this.createS3Bucket(stackConfig.BucketBaseName).bucketName;
        const endpointConfigName = this.createEndpointConfig({
            endpointConfigName: stackConfig.EndpointConfigName,
            variantConfigPropsList: modelConfigList,
            dataLoggingBucketName: loggingBucketName,
            dataLoggingEnable: stackConfig.DataLoggingEnable,
            dataLoggingS3Key: stackConfig.DataLoggingS3Key,
            dataLoggingPercentage: stackConfig.DataLoggingPercentage,
            role: role
        });

        let endpointName = ' ';
        if (stackConfig.Deploy) {
            endpointName = this.deployEndpoint({
                endpointName: stackConfig.EndpointName,
                endpointConfigName: endpointConfigName
            });
        }

        this.putParameter('sageMakerEndpointName', endpointName);

        for (let model of modelList) {
            if (model.AutoScalingEnable) {
                this.scaleEndpoint({
                    endpointName: endpointName,
                    variantName: model.VariantName,
                    minCapacity: model.AutoScalingMinCapacity,
                    maxCapacity: model.AutoScalingMaxCapacity,
                    targetValue: model.AutoScalingTargetInvocation
                });
            }
        }
    }

    private createModel(props: ModelProps): string {
        const model = new sagemaker.CfnModel(this, `${props.modelName}-Model`, {
            modelName: `${this.projectPrefix}-${props.modelName}-Model`,
            executionRoleArn: props.role.roleArn,
            containers: [
                {
                    image: props.modelDockerImage,
                    modelDataUrl: `s3://${props.modelBucketName}/${props.modelS3Key}/model.tar.gz`,
                    environment: {
                    }
                }
            ]
        });

        return model.attrModelName;
    }

    private createEndpointConfig(props: EndpointConfigProps): string {
        const endpointConfig = new sagemaker.CfnEndpointConfig(this, `${props.endpointConfigName}-Config`, {
            endpointConfigName: `${this.projectPrefix}-${props.endpointConfigName}-Config`,
            productionVariants: props.variantConfigPropsList.map(modelConfig => {
                return {
                    modelName: modelConfig.modelName,
                    variantName: modelConfig.variantName,
                    initialVariantWeight: modelConfig.variantWeight,
                    initialInstanceCount: modelConfig.instanceCount,
                    instanceType: modelConfig.instanceType
                }
            }),
            dataCaptureConfig: {
                captureOptions: [{ captureMode: 'Input' }, { captureMode: 'Output' }],
                enableCapture: props.dataLoggingEnable,
                destinationS3Uri: `s3://${props.dataLoggingBucketName}/${props.dataLoggingS3Key}`,
                initialSamplingPercentage: props.dataLoggingPercentage
            }
        });

        return endpointConfig.attrEndpointConfigName;
    }

    private deployEndpoint(props: EndpointProps): string {
        const endpointName = `${this.projectPrefix}-${props.endpointName}-Endpoint`;
        const endpoint = new sagemaker.CfnEndpoint(this, `${props.endpointName}-Endpoint`, {
            endpointName: endpointName,
            endpointConfigName: props.endpointConfigName
        });

        return endpointName;
    }

    private createIamRole(roleBaseName: string): iam.IRole {
        const role = new iam.Role(this, roleBaseName, {
            roleName: `${this.projectPrefix}-${roleBaseName}`,
            assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
            managedPolicies: [
                { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonSageMakerFullAccess' }
            ],
        });

        role.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' });

        return role;
    }

    private scaleEndpoint(props: ScalingProps) {
        const baseName = `${props.endpointName}-${props.variantName}`;

        const target = new applicationautoscaling.ScalableTarget(this, `${baseName}-ScalableTarget`, {
            serviceNamespace: applicationautoscaling.ServiceNamespace.SAGEMAKER,
            minCapacity: props.minCapacity,
            maxCapacity: props.maxCapacity,
            resourceId: `endpoint/${props.endpointName}/variant/${props.variantName}`,
            scalableDimension: 'sagemaker:variant:DesiredInstanceCount',
        });

        target.scaleToTrackMetric('INVOCATIONS_PER_INSTANCE', {
            policyName: `${baseName}-SageMakerAutoScalingPolicy`,
            targetValue: props.targetValue,
            scaleInCooldown: cdk.Duration.minutes(2),
            scaleOutCooldown: cdk.Duration.minutes(2),
            predefinedMetric: applicationautoscaling.PredefinedMetric.SAGEMAKER_VARIANT_INVOCATIONS_PER_INSTANCE,
        });
    }
}
