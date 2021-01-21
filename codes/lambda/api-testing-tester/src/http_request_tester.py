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

import os
import sys
import time
import enum
import datetime
import random
import json
import threading
import http.client
import logging

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()


class Boto3Loader(object):
    
    def __init__(self, profile=None):
        self.profile = profile


    def set_profile(self, profile):
        self.profile = profile


    def get_client(self, service):
        if self.profile is None:
            return boto3.client(service)
        else:
            return boto3.Session(profile_name=self.profile).client(service)


    def get_resource(self, service):
        if self.profile is None:
            return boto3.Session().resource(service)
        else:
            return boto3.Session(profile_name=self.profile).resource(service)


class Key(enum.Enum):
    TestName  = 'TestName'
    ProfileName  = 'ProfileName'
    ProjectName  = 'ProjectName'
    ProjectStage = 'ProjectStage'
    Endpoint     = 'Endpoint'
    ApiKey       = 'ApiKey'
    Interval     = 'Interval'
    Duration     = 'Duration'


class MetricType(enum.Enum):
    ResponseTime = 'ResponseTime'
    StatusSuccess = 'StatusSuccess'
    StatusError = 'StatusError'
    TestSuccess = 'TestSuccess'
    TestFail = 'TestFail'


class HttpRequestTester:

    def __init__(self, **kwarg):
        profile_name  = kwarg[Key.ProfileName.value]
        boto3_loader = Boto3Loader(profile_name)
        self.cloudwatch = boto3_loader.get_client('cloudwatch')

        self.test_name  = kwarg[Key.TestName.value]
        self.project_name  = kwarg[Key.ProjectName.value]
        self.project_stage = kwarg[Key.ProjectStage.value]

        self.endpoint     = kwarg[Key.Endpoint.value]
        self.interval = kwarg[Key.Interval.value]
        self.duration = kwarg[Key.Duration.value]


    def put_metric(self, metric_type, data_value, namespace, project_stage, type):
        try:
            if metric_type == MetricType.ResponseTime:
                self.cloudwatch.put_metric_data(
                    MetricData=[
                        {
                            'MetricName': metric_type.value,
                            'Dimensions': [
                                {
                                    'Name': 'Stage',
                                    'Value': project_stage
                                },
                                {
                                    'Name': 'Type',
                                    'Value': type
                                },
                            ],
                            'Unit': 'Milliseconds',
                            'Value': data_value
                        },
                    ],
                    Namespace=namespace
                )
            else:
                self.cloudwatch.put_metric_data(
                    MetricData=[
                        {
                            'MetricName': metric_type.value,
                            'Dimensions': [
                                {
                                    'Name': 'Stage',
                                    'Value': project_stage
                                },
                                {
                                    'Name': 'Type',
                                    'Value': type
                                },
                            ],
                            'Unit': 'Count',
                            'Value': data_value
                        },
                    ],
                    Namespace=namespace
                )
        except ClientError:
            logger.info('Fail: put metric - {}'.format(ClientError))


    def load_test_list(self, data_file):
        with open(data_file) as f:
            list = json.load(f)

        return list


    def request_post(self, type, endpoint, url, key, token, body):
        headers = {
                'content-type': 'application/json',
            }
        if key is not None:
            headers['x-api-key'] = key
        if token is not None:
            headers['Authentication'] = token

        payload = json.dumps(body)

        logger.info('request_post: request - endpoint - {}'.format(endpoint))
        before = time.time()
        conn = http.client.HTTPSConnection(endpoint)
        conn.request("POST", url, payload, headers)
        after = time.time()

        response = conn.getresponse()
        body_str = response.read().decode("utf-8")
        logger.info('request_post: response - status_code - {}'.format(response.status))

        if response.status is not 200:
            response_body = None
            self.put_metric(MetricType.StatusError, 1.0, self.project_name, self.project_stage, type)
        else:
            response_body = json.loads(body_str)
            logger.info('request_post: response - body - {}'.format(response_body))
            self.put_metric(MetricType.StatusSuccess, 1.0, self.project_name, self.project_stage, type)
        
        logger.info('request_post: response time - {}'.format(after - before))
        self.put_metric(MetricType.ResponseTime, (after * 1000 - before * 1000), self.project_name, self.project_stage, type)
        return response.status, response_body


    def execute_tests(self, test_list):
        for data in test_list:
            body = data['request']
            type = '{}/{}'.format(self.test_name, data['type'])
            resource = '/{}/{}'.format(self.project_stage, data['resource'])
            
            status, response = self.request_post(type, self.endpoint, resource, None, None, body)
            if response is not None:
                expected_keys = data['response'].keys()
                result_keys = response.keys()
                success = True
                for expected_key in expected_keys:
                    if expected_key in result_keys:
                        if not response[expected_key] == data['response'][expected_key]:
                            success = False
                            logger.error('start_request_with_timer: response compare - {} != {}'.format(response[expected_key], data['response'][expected_key]))
                            break    
                    else:
                        success = False
                        logger.error('start_request_with_timer: response empty')
                        break
                
                if success == True:
                    self.put_metric(MetricType.TestSuccess, 1.0, self.project_name, self.project_stage, type)
                else:
                    self.put_metric(MetricType.TestFail, 1.0, self.project_name, self.project_stage, type)
            time.sleep(data['interval'])


    def start_loop(self, test_list):
        start_time = time.time()

        while True:
            self.execute_tests(test_list)
            if (time.time() - start_time) >= self.duration:
                break

            time.sleep(self.interval)

        
