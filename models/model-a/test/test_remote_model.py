"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
"""

import sys, os

import json
import boto3
import time

profile = 'cdk-demo'
_endpoint_name = 'TextClassificationDemo-TextClassification-Endpoint'

def set_profile(target):
    global profile
    profile = target


def get_client(service, profile):
    if profile is None:
        return boto3.client(service)
    else:
        return boto3.Session(profile_name=profile).client(service)


def get_resource(service, profile):
    if profile is None:
        return boto3.Session().resource(service)
    else:
        return boto3.Session(profile_name=profile).resource(service)


def invoke_endpoint(endpoint_name, data_dic):
    client = get_client('sagemaker-runtime', profile)

    payload = json.dumps(data_dic)

    response = client.invoke_endpoint(EndpointName=endpoint_name,
                                        ContentType='application/json',
                                        Body=payload)
    print('response', response)
    # print('response', response['Body'].read().decode('utf-8'))
    return response['Body'].read().decode('utf-8')


if __name__ == '__main__':
    with open('./input_data.json') as f:
        inputs = json.load(f)
    for input in inputs:
        print('-------------------------------------------------------------------')
        # PreProcessing input
        request = input['request']

        # Predict input
        response_str = invoke_endpoint(_endpoint_name, request)

        # validate result
        print('[{}]: result==>{}'.format(input['type'], response_str))
        assert(input['response']['success'] == json.loads(response_str)['success'])
        assert(input['response']['label'] == json.loads(response_str)['label'])
        print('[{}]: completed==>{}'.format(input['type'], input['request']['sentence']))
