"""Train a real MobileNet V3 crop classifier and evaluate a held-out test set.

This trains a classification head on pretrained visual features, not the VLM,
a bounding-box detector, a segmentation network, or a learned outfit scorer.
"""
import argparse
import collections
from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import time


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('dataset', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--epochs', type=int, default=60)
    parser.add_argument('--fine-tune-epochs', type=int, default=12)
    parser.add_argument('--allow-download', action='store_true')
    parser.add_argument('--weights', type=Path)
    parser.add_argument('--device', choices=['auto', 'cpu', 'mps'], default='auto')
    options = parser.parse_args()
    manifest_path = options.dataset / 'manifest.json'
    if not manifest_path.is_file():
        raise SystemExit('Export a confirmed-label dataset or prepare Fashionpedia first; manifest.json is missing.')
    manifest = json.loads(manifest_path.read_text())
    rows = manifest['examples']
    counts = collections.Counter((r['garmentKey'], r['split']) for r in rows)
    classes = sorted({r['garmentKey'] for r in rows})
    if len(classes) < 2 or any(counts[k, 'train'] < 10 or counts[k, 'validation'] < 3 for k in classes):
        raise SystemExit('Need at least 2 types, each with 10 training and 3 validation crops. Counts: ' + str(dict(counts)))
    groups = {split: {r['group'] for r in rows if r['split'] == split} for split in ['train', 'validation', 'test']}
    if groups['train'] & groups['validation'] or groups['train'] & groups['test'] or groups['validation'] & groups['test']:
        raise SystemExit('Source-photo leakage detected. Rebuild the dataset.')
    if not options.weights and not options.allow_download:
        raise SystemExit('Supply --weights with local pretrained backbone weights, or --allow-download.')
    if options.output.exists() and any(options.output.iterdir()):
        raise SystemExit('Output already exists. Use a new model directory.')
    options.output.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault('TORCH_HOME', str(options.dataset / 'torch-cache'))
    # python.org macOS builds may lack a configured CA bundle. Use certifi's
    # trusted roots while retaining HTTPS certificate verification.
    try:
        import certifi
        os.environ.setdefault('SSL_CERT_FILE', certifi.where())
    except ImportError:
        pass

    import torch
    from torch import nn
    from torch.utils.data import Dataset, DataLoader
    from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
    from torchvision import transforms
    from PIL import Image, ImageOps

    started = time.time()
    torch.manual_seed(42)
    torch.set_num_threads(4)
    device = 'mps' if options.device != 'cpu' and torch.backends.mps.is_available() else 'cpu'
    if options.device == 'mps' and device != 'mps':
        raise SystemExit('MPS is unavailable; use --device cpu or auto.')
    transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize([.485, .456, .406], [.229, .224, .225])])

    class Crops(Dataset):
        def __init__(self, split):
            self.rows = [r for r in rows if r['split'] == split]
            self.augment = split == 'train'
        def __len__(self):
            return len(self.rows) * (2 if self.augment else 1)
        def __getitem__(self, index):
            row = self.rows[index % len(self.rows)]
            image_path = (options.dataset / row['image']).resolve()
            if not image_path.is_relative_to(options.dataset.resolve()):
                raise ValueError('Image outside dataset directory')
            with Image.open(image_path) as opened:
                image = ImageOps.pad(opened.convert('RGB'), (224, 224), color=(245, 245, 245))
                if self.augment and index >= len(self.rows):
                    image = ImageOps.mirror(image)
                return transform(image), classes.index(row['garmentKey'])

    class AugmentedCrops(Crops):
        def __getitem__(self, index):
            row = self.rows[index % len(self.rows)]
            with Image.open(options.dataset / row['image']) as opened:
                image = ImageOps.pad(opened.convert('RGB'), (224, 224), color=(245, 245, 245))
                image = transforms.RandomHorizontalFlip()(image)
                image = transforms.RandomAffine(5, translate=(.04, .04), scale=(.92, 1.08), fill=245)(image)
                image = transforms.ColorJitter(brightness=.1, contrast=.1, saturation=.1)(image)
                return transform(image), classes.index(row['garmentKey'])

    model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT if options.allow_download and not options.weights else None)
    if options.weights:
        model.load_state_dict(torch.load(options.weights, map_location='cpu', weights_only=True))
    model.eval().to(device)
    for parameter in model.parameters():
        parameter.requires_grad = False
    projection = model.classifier[:-1]

    def extract(split):
        dataset = Crops(split)
        if not len(dataset):
            return None
        cache = options.output / f'{split}-features.pt'
        features, labels = [], []
        loader = DataLoader(dataset, batch_size=32, shuffle=False, num_workers=0)
        with torch.inference_mode():
            for index, (images, targets) in enumerate(loader):
                feature = projection(model.avgpool(model.features(images.to(device))).flatten(1))
                features.append(feature.cpu().clone())
                labels.append(targets)
                if index % 15 == 0:
                    print(f'{split}: extracted batch {index + 1}/{len(loader)} on {device}', flush=True)
        result = (torch.cat(features), torch.cat(labels))
        torch.save({'features': result[0], 'labels': result[1]}, cache)
        return result

    print(f'Training {len(classes)} classes; device={device}; source={manifest.get("source", "confirmed user labels")}', flush=True)
    train_x, train_y = extract('train')
    val_x, val_y = extract('validation')
    test = extract('test')
    head = nn.Linear(train_x.shape[1], len(classes))
    optimizer = torch.optim.AdamW(head.parameters(), lr=.003, weight_decay=.01)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=options.epochs)
    best_loss = float('inf')
    best_weights = None
    history = []
    for epoch in range(options.epochs):
        head.train()
        permutation = torch.randperm(len(train_y))
        losses = []
        for start in range(0, len(train_y), 64):
            selected = permutation[start:start + 64]
            optimizer.zero_grad()
            loss = nn.functional.cross_entropy(head(train_x[selected]), train_y[selected], label_smoothing=.05)
            loss.backward()
            optimizer.step()
            losses.append(loss.item())
        scheduler.step()
        head.eval()
        with torch.no_grad():
            logits = head(val_x)
            loss = nn.functional.cross_entropy(logits, val_y).item()
            accuracy = (logits.argmax(1) == val_y).float().mean().item()
        history.append({'epoch': epoch + 1, 'train_loss': sum(losses) / len(losses), 'validation_loss': loss, 'validation_accuracy': accuracy})
        if loss < best_loss:
            best_loss = loss
            best_weights = deepcopy(head.state_dict())
        if epoch % 10 == 0 or epoch == options.epochs - 1:
            print(f'Epoch {epoch + 1}: validation accuracy {accuracy:.3f}, loss {loss:.3f}', flush=True)
    head.load_state_dict(best_weights)
    head.eval()
    model.classifier[-1] = head.to(device)
    model.eval()
    selected_stage = 'linear-head'
    best_model = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
    if options.fine_tune_epochs:
        for parameter in model.features[-5:].parameters():
            parameter.requires_grad = True
        for parameter in model.classifier.parameters():
            parameter.requires_grad = True
        fine_optimizer = torch.optim.AdamW([
            {'params': [p for p in model.features.parameters() if p.requires_grad], 'lr': .0001},
            {'params': model.classifier.parameters(), 'lr': .0003},
        ], weight_decay=.01)
        training_loader = DataLoader(AugmentedCrops('train'), batch_size=32, shuffle=True, num_workers=0)
        validation_loader = DataLoader(Crops('validation'), batch_size=32, shuffle=False, num_workers=0)
        fine_history = []
        for epoch in range(options.fine_tune_epochs):
            model.train()
            # Small independent-photo dataset: keep pretrained running statistics.
            for layer in model.modules():
                if isinstance(layer, torch.nn.BatchNorm2d):
                    layer.eval()
            running = 0
            for images, targets in training_loader:
                fine_optimizer.zero_grad()
                loss = nn.functional.cross_entropy(model(images.to(device)), targets.to(device), label_smoothing=.05)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), 5)
                fine_optimizer.step()
                running += loss.item()
            model.eval()
            logits, labels = [], []
            with torch.inference_mode():
                for images, targets in validation_loader:
                    logits.append(model(images.to(device)).cpu())
                    labels.append(targets)
            val_scores, actual = torch.cat(logits), torch.cat(labels)
            loss = nn.functional.cross_entropy(val_scores, actual).item()
            accuracy = (val_scores.argmax(1) == actual).float().mean().item()
            fine_history.append({'epoch': epoch + 1, 'training_loss': running / len(training_loader), 'validation_loss': loss, 'validation_accuracy': accuracy})
            print(f'Fine-tune epoch {epoch + 1}: validation accuracy {accuracy:.3f}, loss {loss:.3f}', flush=True)
            if loss < best_loss:
                best_loss = loss
                best_model = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
                selected_stage = f'fine-tune-epoch-{epoch + 1}'
        (options.output / 'fine-tune-history.json').write_text(json.dumps(fine_history, indent=2))
        model.load_state_dict(best_model)
        model.eval()
        # Recompute features with the selected backbone; test data never enters
        # gradient updates, checkpoint selection, or temperature calibration.
        val_x, val_y = extract('validation')
        test = extract('test')
    head = model.classifier[-1].cpu()
    with torch.no_grad():
        val_logits = head(val_x)
    # Choose temperature using validation ONLY. Never fit on held-out test labels.
    temperatures = torch.logspace(-.4, .8, 100)
    temperature = float(min(temperatures, key=lambda t: nn.functional.cross_entropy(val_logits / t, val_y).item()))

    def measure(features, targets):
        with torch.no_grad():
            probabilities = (head(features) / temperature).softmax(1)
        confidence, predicted = probabilities.max(1)
        confusion = torch.zeros(len(classes), len(classes), dtype=torch.int64)
        for actual, guess in zip(targets.tolist(), predicted.tolist()):
            confusion[actual, guess] += 1
        per_class = {}
        for index, key in enumerate(classes):
            true_positive = confusion[index, index].item()
            actual_count = confusion[index].sum().item()
            predicted_count = confusion[:, index].sum().item()
            precision = true_positive / predicted_count if predicted_count else 0
            recall = true_positive / actual_count if actual_count else 0
            f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
            per_class[key] = {'precision': precision, 'recall': recall, 'f1': f1, 'support': actual_count}
        ece = 0
        for left in torch.arange(0, 1, .1):
            selected = (confidence > left) & (confidence <= left + .1)
            if selected.any():
                ece += selected.float().mean().item() * abs(confidence[selected].mean().item() - (predicted[selected] == targets[selected]).float().mean().item())
        category_map = {'shirt': 'Tops', 'tee': 'Tops', 'sweater': 'Tops', 'cardigan': 'Outerwear', 'jacket': 'Outerwear', 'coat': 'Outerwear', 'trousers': 'Bottoms', 'shorts': 'Bottoms', 'skirt': 'Bottoms', 'dress': 'Dresses', 'shoes': 'Shoes', 'bag': 'Accessories', 'hat': 'Accessories', 'scarf': 'Accessories', 'belt': 'Accessories', 'watch': 'Accessories'}
        categories = sorted({category_map.get(key, 'Uncategorized') for key in classes})
        assignment = torch.tensor([categories.index(category_map.get(key, 'Uncategorized')) for key in classes])
        category_probabilities = torch.stack([probabilities[:, assignment == index].sum(1) for index in range(len(categories))], dim=1)
        category_actual = assignment[targets]
        category_predicted = category_probabilities.argmax(1)
        category_confusion = torch.zeros(len(categories), len(categories), dtype=torch.int64)
        for actual, guess in zip(category_actual.tolist(), category_predicted.tolist()):
            category_confusion[actual, guess] += 1
        category_details = {}
        for index, key in enumerate(categories):
            positive = category_confusion[index, index].item()
            guessed = category_confusion[:, index].sum().item()
            support = category_confusion[index].sum().item()
            category_details[key] = {'precision': positive / guessed if guessed else 0, 'recall': positive / support if support else 0, 'support': support}
        return {'accuracy': (predicted == targets).float().mean().item(), 'macro_f1': sum(r['f1'] for r in per_class.values()) / len(classes), 'ece': ece, 'confusion_matrix': confusion.tolist(), 'per_class': per_class, 'examples': len(targets), 'category_accuracy': (category_actual == category_predicted).float().mean().item(), 'category_confusion_matrix': category_confusion.tolist(), 'categories': categories, 'per_category': category_details}

    validation = measure(val_x, val_y)
    test_result = measure(*test) if test else None
    # The serving model uses exactly the same frozen backbone and learned head.
    model.cpu()
    model.classifier[-1] = head
    model.eval()
    model_id = 'fashionpedia-mobilenet-v3-small-v1' if 'fashionpedia' in manifest.get('version', '') else 'divara-reviewed-crops-v1'
    checkpoint = {'state_dict': model.state_dict(), 'classes': classes, 'architecture': 'mobilenet_v3_small', 'model_id': model_id, 'temperature': temperature, 'preprocessing': 'letterbox-224-imagenet-normalization'}
    torch.save(checkpoint, options.output / 'classifier.pt')
    checksum = hashlib.sha256((options.output / 'classifier.pt').read_bytes()).hexdigest()
    report = {'model_id': model_id, 'architecture': 'MobileNet V3 Small with locally trained classification head and optional visual-layer fine-tuning', 'classes': classes, 'seed': 42, 'epochs': options.epochs, 'fine_tune_epochs': options.fine_tune_epochs, 'selected_stage': selected_stage, 'device': device, 'temperature': temperature, 'seconds': time.time() - started, 'train_examples': counts.total() - sum(count for (key, split), count in counts.items() if split != 'train'), 'validation': validation, 'test': test_result, 'chance_accuracy': 1 / len(classes), 'source_photo_groups': {k: len(v) for k, v in groups.items()}, 'manifest_sha256': hashlib.sha256(manifest_path.read_bytes()).hexdigest(), 'checkpoint_sha256': checksum, 'source': manifest.get('source', 'human-confirmed account crop labels'), 'scope': 'garment crop classification only; not detection, segmentation, jewellery recognition, chatbot training or fashion-compatibility accuracy'}
    (options.output / 'evaluation.json').write_text(json.dumps(report, indent=2))
    (options.output / 'history.json').write_text(json.dumps(history, indent=2))
    (options.output / 'manifest-summary.json').write_text(json.dumps({'counts': {f'{key}/{split}': count for (key, split), count in counts.items()}, 'classes': classes}, indent=2))
    print(json.dumps({k: v for k, v in report.items() if k not in ['validation', 'test']}), flush=True)
    print('Validation accuracy:', validation['accuracy'], 'Test accuracy:', test_result['accuracy'] if test_result else 'no test split', flush=True)


if __name__ == '__main__':
    main()
