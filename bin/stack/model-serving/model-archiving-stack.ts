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
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';

import { BaseStack, StackCommonProps } from '../../../lib/base/base-stack'


interface ModelUploadProps {
    modelBucket: s3.IBucket;
    modelS3Key: string;
    modelLocalPath: string;
}

export class ModelArchivingStack extends BaseStack {

    constructor(scope: cdk.Construct, props: StackCommonProps, stackConfig: any) {
        super(scope, stackConfig.Name, props, stackConfig);

        const modelBucket = this.createS3Bucket(this.stackConfig.BucketBaseName);
        this.putParameter('modelArchivingBucketName', modelBucket.bucketName);

        const modelList: any[] = stackConfig.ModelList;
        for (var model of modelList) {
            this.uploadModelToBucket({
                modelBucket: modelBucket,
                modelS3Key: model.ModelS3Key,
                modelLocalPath: model.ModelLocalPath,
            });
        }
    }

    private uploadModelToBucket(props: ModelUploadProps) {
        if (props.modelLocalPath != undefined
            && props.modelLocalPath.trim().length > 0) {
            new s3deploy.BucketDeployment(this, `${props.modelS3Key}-UploadModel`, {
                destinationBucket: props.modelBucket,
                destinationKeyPrefix: props.modelS3Key,
                sources: [s3deploy.Source.asset(props.modelLocalPath)],
                memoryLimit: 1024
            });
        }
    }
}
