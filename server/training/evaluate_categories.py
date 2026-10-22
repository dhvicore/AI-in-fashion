"""Add coarse wardrobe-category metrics to an already completed training run.

Uses saved features from the selected checkpoint; never trains on test data.
"""
import json
from pathlib import Path
import sys
import torch

directory = Path(sys.argv[1])
checkpoint = torch.load(directory / 'classifier.pt', map_location='cpu', weights_only=True)
report = json.loads((directory / 'evaluation.json').read_text())
classes = checkpoint['classes']
mapping = {'shirt': 'Tops', 'tee': 'Tops', 'sweater': 'Tops', 'cardigan': 'Outerwear', 'jacket': 'Outerwear', 'coat': 'Outerwear', 'trousers': 'Bottoms', 'shorts': 'Bottoms', 'skirt': 'Bottoms', 'dress': 'Dresses', 'shoes': 'Shoes', 'bag': 'Accessories', 'hat': 'Accessories', 'scarf': 'Accessories', 'belt': 'Accessories', 'watch': 'Accessories'}
categories = sorted({mapping.get(key, 'Uncategorized') for key in classes})
assignment = torch.tensor([categories.index(mapping.get(key, 'Uncategorized')) for key in classes])
weight, bias = checkpoint['state_dict']['classifier.3.weight'], checkpoint['state_dict']['classifier.3.bias']
for split in ['validation', 'test']:
    cached = torch.load(directory / f'{split}-features.pt', map_location='cpu', weights_only=True)
    with torch.no_grad():
        probabilities = (torch.nn.functional.linear(cached['features'], weight, bias) / checkpoint['temperature']).softmax(1)
    actual = cached['labels']
    measured = (probabilities.argmax(1) == actual).float().mean().item()
    if abs(measured - report[split]['accuracy']) > .00001:
        raise RuntimeError('Feature cache does not match the selected checkpoint')
    marginal = torch.stack([probabilities[:, assignment == index].sum(1) for index in range(len(categories))], dim=1)
    expected, predicted = assignment[actual], marginal.argmax(1)
    confusion = torch.zeros(len(categories), len(categories), dtype=torch.int64)
    for truth, guess in zip(expected.tolist(), predicted.tolist()):
        confusion[truth, guess] += 1
    details = {}
    for index, key in enumerate(categories):
        positive = confusion[index, index].item()
        guessed, support = confusion[:, index].sum().item(), confusion[index].sum().item()
        details[key] = {'precision': positive / guessed if guessed else 0, 'recall': positive / support if support else 0, 'support': support}
    report[split].update({'category_accuracy': (expected == predicted).float().mean().item(), 'categories': categories, 'category_confusion_matrix': confusion.tolist(), 'per_category': details})
    print(split, 'fine accuracy', measured, 'category accuracy', report[split]['category_accuracy'])
(directory / 'evaluation.json').write_text(json.dumps(report, indent=2))
