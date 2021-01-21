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

import sys
import os
import json
import decimal
import uuid
import logging

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger()
logger.setLevel(logging.INFO)
log_handler = logging.StreamHandler(sys.stdout)
logger.addHandler(log_handler)

_profile = None
_sm_client = None

_endpoint_name = os.environ.get('SAGEMAKER_ENDPOINT', 'TextClassificationDemo-TextClassification-Endpoint')


def set_profile(target):
    global _profile
    _profile = target


def get_client(service, profile):
    if profile is None:
        return boto3.client(service)
    else:
        return boto3.Session(profile_name=profile).client(service)


def load_sm_client():
    global _sm_client
    if _sm_client is None:
        _sm_client = get_client('sagemaker-runtime', _profile)
    return _sm_client


def decimal_default(obj):
    if isinstance(obj, decimal.Decimal):
        return str(obj)
    raise TypeError


def predict(client, endpoint_name, request):
    logger.info("sagemaker invoke: request-> {}".format(request))

    try:
        response = client.invoke_endpoint(
            EndpointName=endpoint_name,
            ContentType='application/json',
            Body=json.dumps(request, default=decimal_default))

        response = json.loads(response['Body'].read().decode('utf-8'))
        return response
    except ClientError as e:
        logger.error('Error: sagemaker invoke ====> {}'.format(e))
        return None


def create_success_response(id, prediction):
    prediction['MessageId'] = str(id)
    return prediction


def create_error_response(id, error):
    return {
        'MessageId': str(id),
        'Error': error
    }


def handle(event, context):
    logger.info('handler handle: event-> {}'.format(event))

    message_id = str(uuid.uuid4())

    if 'sentence' in event:
        sm_client = load_sm_client()
        prediction = predict(sm_client, _endpoint_name, event)

        if prediction is not None:
            return create_success_response(message_id, prediction)
        else:
            return create_error_response(message_id, 'no response from sagemaker')
    else:
        return create_error_response(message_id, 'wrong request format')
