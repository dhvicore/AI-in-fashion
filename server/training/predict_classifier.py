"""Offline batch inference for the locally trained crop classifier."""
import base64
import io
import json
from pathlib import Path
import sys

import torch
from torchvision.models import mobilenet_v3_small
from torchvision import transforms
from PIL import Image, ImageOps

torch.set_num_threads(2)
checkpoint_path = Path(sys.argv[1])
checkpoint = torch.load(checkpoint_path, map_location='cpu', weights_only=True)
evaluation = json.loads(checkpoint_path.with_name('evaluation.json').read_text())
model = mobilenet_v3_small(weights=None)
model.classifier[-1] = torch.nn.Linear(model.classifier[-1].in_features, len(checkpoint['classes']))
model.load_state_dict(checkpoint['state_dict'])
model.eval()
transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize([.485, .456, .406], [.229, .224, .225])])
request = json.load(sys.stdin)
images = request['images']
if not isinstance(images, list) or not 1 <= len(images) <= 12:
    raise ValueError('Expected between one and twelve image crops')
tensors = []
for encoded in images:
    if len(encoded) > 8_000_000:
        raise ValueError('Crop too large')
    with Image.open(io.BytesIO(base64.b64decode(encoded, validate=True))) as opened:
        tensors.append(transform(ImageOps.pad(opened.convert('RGB'), (224, 224), color=(245, 245, 245))))
with torch.inference_mode():
    probabilities = (model(torch.stack(tensors)) / checkpoint.get('temperature', 1)).softmax(1)
results = []
category_map = {'shirt': 'Tops', 'tee': 'Tops', 'sweater': 'Tops', 'cardigan': 'Outerwear', 'jacket': 'Outerwear', 'coat': 'Outerwear', 'trousers': 'Bottoms', 'shorts': 'Bottoms', 'skirt': 'Bottoms', 'dress': 'Dresses', 'shoes': 'Shoes', 'bag': 'Accessories', 'hat': 'Accessories', 'scarf': 'Accessories', 'belt': 'Accessories', 'watch': 'Accessories'}
for row in probabilities:
    values, indices = row.topk(min(3, len(checkpoint['classes'])))
    alternatives = [{'garmentKey': checkpoint['classes'][index], 'confidence': value} for index, value in zip(indices.tolist(), values.tolist())]
    prediction = alternatives[0]
    # Eligibility is chosen from VALIDATION, not from the held-out test scores.
    measured = evaluation['validation']['per_class'][prediction['garmentKey']]
    category_probabilities = {}
    for index, key in enumerate(checkpoint['classes']):
        category = category_map.get(key, 'Uncategorized')
        category_probabilities[category] = category_probabilities.get(category, 0) + row[index].item()
    category = max(category_probabilities, key=category_probabilities.get)
    category_measured = evaluation['validation'].get('per_category', {}).get(category, {})
    results.append({'modelId': checkpoint['model_id'], **prediction, 'alternatives': alternatives, 'validationPrecision': measured['precision'], 'eligible': measured['precision'] >= .85 and measured['support'] >= 10 and prediction['confidence'] >= .9, 'category': category, 'categoryConfidence': category_probabilities[category], 'categoryEligible': category_measured.get('precision', 0) >= .85 and category_measured.get('support', 0) >= 20 and category_probabilities[category] >= .9})
print(json.dumps({'predictions': results}))
