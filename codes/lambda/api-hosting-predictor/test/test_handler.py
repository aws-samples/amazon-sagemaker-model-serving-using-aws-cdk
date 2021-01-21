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
import json
import logging

sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__)))+'/src')
import handler
handler.set_profile('cdk-demo')


def test_handle(event):
    return handler.handle(event, None)


if __name__ == '__main__':
    with open('./input_data.json') as f:
        inputs = json.load(f)

    for input in inputs:
        print('-------------------------------------------------------------------')
        # PreProcessing input
        request = input['request']

        # Predict input
        response = test_handle(request)

        # validate result
        print('[{}]: result==>{}'.format(input['type'], response))
        assert(input['response']['success'] == response['success'])
        assert(input['response']['label'] == response['label'])
        print('[{}]: completed==>{}'.format(input['type'], input['request']['sentence']))
