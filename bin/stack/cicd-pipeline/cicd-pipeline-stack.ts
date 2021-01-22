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
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as iam from '@aws-cdk/aws-iam';

import { BaseStack, StackCommonProps } from '../../../lib/base/base-stack'


export class CicdPipelineStack extends BaseStack {
    private sourceOutput: codepipeline.Artifact;

    constructor(scope: cdk.Construct, props: StackCommonProps, stackConfig: any) {
        super(scope, stackConfig.Name, props, stackConfig);

        const repositoryName: string = stackConfig.RepositoryName;
        const branchName: string = stackConfig.BranchName;

        if (repositoryName.trim().length > 0
            && branchName.trim().length > 0) {
            const pipeline = new codepipeline.Pipeline(this, 'CICDPipeline', {
                pipelineName: `${this.projectPrefix}-CICD-Pipeline`,
            });

            const sourceStage = pipeline.addStage({ stageName: 'Source' });
            sourceStage.addAction(this.createSourceStageAction('CodeCommit', repositoryName, branchName));

            const buildStage = pipeline.addStage({ stageName: 'BuildDeploy' });
            buildStage.addAction(this.createBuildDeployStageAction('BuildDeploy', 'script/cicd/buildspec_cdk_deploy.yml'));
        } else {
            console.info("No CodeCommit repository, so don't create CodePipeline");
        }
    }

    private createSourceStageAction(actionName: string, repositoryName: string, branchName: string): codepipeline.IAction {
        const repo = codecommit.Repository.fromRepositoryName(
            this,
            `${this.projectPrefix}-CodeCommit-Repository`,
            repositoryName,
        );

        this.sourceOutput = new codepipeline.Artifact('SourceOutput')
        const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
            actionName: actionName,
            repository: repo,
            output: this.sourceOutput,
            branch: branchName
        })

        return sourceAction;
    }

    private createBuildDeployStageAction(actionName: string, buildSpecPath: string): codepipeline.IAction {
        const project = new codebuild.PipelineProject(this, `${actionName}-Project`, {
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
                privileged: true,
                computeType: codebuild.ComputeType.MEDIUM
            },
            environmentVariables: {
                PROJECT_PREFIX: { value: `${this.projectPrefix}` },
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename(buildSpecPath),
        });

        const commonPolicy = this.getDeployCommonPolicy();
        project.addToRolePolicy(commonPolicy);
        const servicePolicy = this.getServiceSpecificPolicy();
        project.addToRolePolicy(servicePolicy);

        const buildOutput = new codepipeline.Artifact(`${actionName}BuildOutput`);

        const buildAction = new codepipeline_actions.CodeBuildAction({
            actionName: actionName,
            project,
            input: this.sourceOutput,
            outputs: [buildOutput],
        })

        return buildAction;
    }

    private getDeployCommonPolicy(): iam.PolicyStatement {
        const statement = new iam.PolicyStatement();
        statement.addActions(
            "cloudformation:*",
            "s3:*",
            "lambda:*",
            "ssm:*",
            "iam:*",
            "kms:*",
            "events:*"
        );
        statement.addResources("*");

        return statement;
    }

    private getServiceSpecificPolicy(): iam.PolicyStatement {
        const statement = new iam.PolicyStatement();
        statement.addActions(
            "ec2:*",
            "cloudwatch:*",
            "sagemaker:*",
            "ses:*",
            "sns:*",
            "application-autoscaling:*",
            "apigateway:*",
            "logs:*",
            "lambda:*",
            "elasticloadbalancingv2:*",
            "elasticloadbalancing:*"
        );
        statement.addResources("*");

        return statement;
    }
}
