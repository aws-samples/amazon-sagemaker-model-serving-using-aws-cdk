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

sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__)))+'/src/code')
import inference as sm

def test_simulation():
    # Prepare model
    model_path = './../src'
    model_dict = sm.model_fn(model_path)

    with open('./input_data.json') as f:
        inputs = json.load(f)
    for input in inputs:
        print('-------------------------------------------------------------------')
        # PreProcessing input
        request_str = json.dumps(input['request'])
        sentence = sm.input_fn(request_str, 'application/json')

        # Predict input
        prediction_output = sm.predict_fn(sentence, model_dict)

        # PostProcessing output
        response_str, _ = sm.output_fn(prediction_output, 'application/json')

        # validate result
        print('[{}]: result==>{}'.format(input['type'], response_str))
        assert(input['response']['success'] == json.loads(response_str)['success'])
        assert(input['response']['label'] == json.loads(response_str)['label'])
        print('[{}]: completed==>{}'.format(input['type'], input['request']['sentence']))


if __name__ == '__main__':
    test_simulation()
