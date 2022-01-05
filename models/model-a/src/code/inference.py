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

import torch
from torchtext.data.utils import get_tokenizer
from torchtext.data.utils import ngrams_iterator

import os
import json
import logging

import threading
print('[INFO] load-thread id: {}'.format(threading.currentThread().getName()))
print('[INFO] load-process id: {}'.format(os.getpid()))
print('[INFO] load-SAGEMAKER_MODEL_SERVER_WORKERS: {}'.format(os.environ.get('SAGEMAKER_MODEL_SERVER_WORKERS', 'nonon')))

logger = logging.getLogger(__name__)

_model_file_name = 'model.pth'
_vocab_file_name = 'vocab.pth'
_ngrams = int(os.environ.get('ENV_NGRAMS', '2'))

_content_type_json = 'application/json'

_tokenizer = get_tokenizer("basic_english")


def model_fn(model_dir):
    print('[INFO] model_fn-thread id: {}'.format(threading.currentThread().getName()))
    print('[INFO] model_fn-process id: {}'.format(os.getpid()))
    logger.info('model_fn: Loading the model-{}'.format(model_dir))

    file_list = os.listdir(model_dir)
    logger.info("model_fn: model_dir list-{}".format(file_list))

    model = torch.load(os.path.join(model_dir, _model_file_name))
    dictionary = torch.load(os.path.join(model_dir, _vocab_file_name))

    return {'model': model, 'dictionary': dictionary}


def input_fn(serialized_input_data, content_type=_content_type_json):
    logger.info('input_fn: Deserializing the input data.')

    if content_type == _content_type_json:
        input_data = json.loads(serialized_input_data)
        if 'sentence' not in input_data:
            raise Exception('Requested input data did not contain sentence')
        
        sentence = input_data['sentence']
        return sentence
    
    raise Exception('Requested unsupported ContentType in content_type: ' + content_type)


def predict_fn(sentence, model_dict):
    logger.info('predict_fn: Predicting for {}.'.format(sentence))
    
    model = model_dict['model']
    dictionary = model_dict['dictionary']

    with torch.no_grad():
        sentence_tensor = torch.tensor([dictionary[token]
                            for token in ngrams_iterator(_tokenizer(sentence), _ngrams)])
        output = model(sentence_tensor, torch.tensor([0]))
        label = output.argmax(1).item() + 1
        logger.info('predict_fn: Prediction result is {}.'.format(label))
        return label
        

def output_fn(predicted_label, accept=_content_type_json):
    logger.info('output_fn: Serializing the generated output.')

    if accept == _content_type_json:
        response = {
            'success': 'true',
            'label': predicted_label
        }
        return json.dumps(response), accept
    
    raise Exception('output_fn: Requested unsupported ContentType in Accept: ' + accept)
