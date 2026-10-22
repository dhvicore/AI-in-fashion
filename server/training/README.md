# Recognition, labels and training

Divara uses pretrained Ollama/Qwen for visible-item grounding and a locally trained
MobileNet V3 Small crop classifier as a secondary label check. A supervised run
completed on 23 October 2026 using 1,950 labelled Fashionpedia crops: 1,254 train,
306 validation and 390 test. Fine-label test accuracy is 56.92%; six-category test
accuracy is 67.44%. These results are experimental, not production-ready
recognition accuracy. See [the model card](TRAINED_MODEL_CARD.md).

The dummy catalog remains metadata. No custom Qwen/chat model, jewellery model,
segmentation model or learned outfit-compatibility model has been trained.

## Working local pipeline

1. Upload JPG, PNG or WebP, or capture through the device camera.
2. The original image is saved and a durable SQLite analysis job is queued.
3. The local model returns database garment types, colours, sleeve information,
   estimated confidence and normalized bounding boxes. Images are oriented and
   resized before inference; schema validation rejects invalid output.
4. Each valid bounding box produces an individual crop, linked to the original
   photo and saved wardrobe piece. An unavailable location retains the source
   photo and is marked uncropped. These are rectangular crops, not pixel masks
   or background removal.
5. Wardrobe and outfit cards retain the existing animated SVG illustrations.
   Strapless and sleeveless labels use separate silhouettes with no sleeves.
   Original photos and crops are available in the review/edit controls.
6. Correct labels in My Closet → Review piece details, or explicitly confirm them.
   Low-confidence predictions (below 0.55) are excluded from recommendations
   until confirmed. Model confidence is an uncalibrated estimate.
7. The assistant uses the local conversational model for general questions and
   complex requests. Checked tools select actual wardrobe IDs, apply explicit
   constraints, preserve other pieces during replacements, and compute scores.
   Exact commands use those tools directly. Model failures are shown explicitly.
8. Outfits can include clean saved accessories and jewellery. Ranking uses
   compatibility and a weighted probability distribution among suitable outfits.
   The returned selection probability is a draw probability, not measured fashion
   accuracy. Compatibility scores remain versioned editorial rules.

Recognition jobs survive leaving the page. On API startup, interrupted running
jobs return to queued. Identical image content shares saved inference per account;
imports are idempotent. Failed jobs can be retried. Upload images and crops require
an authenticated owner. The local queue is designed for **one API process**;
multiple workers/replicas need external queue locking and shared object storage.

## Build a reviewed dataset

Confirm the image labels in My Closet. Predictions are never silently used as
human ground truth. Only confirmed, non-deleted pieces with real individual crops
are exported. All crops from one original image share a split, preventing leakage.
Source bounding boxes remain marked `bboxVerified: false`; these labels are not a
segmentation or bounding-box training dataset.

From `server/`:

```sh
npm run training:export -- --user-email YOUR_ACCOUNT_EMAIL --out /absolute/new/dataset-directory
```

This reads only the named account, copies its confirmed crops and writes
`manifest.json`. The output directory must not already exist. The authenticated
`GET /api/training/export` endpoint returns the same manifest without copying files.

## Optional real classifier training

`train_classifier.py` trains a MobileNet V3 Small classification head on labelled
crop categories and can fine-tune the last visual blocks. Checkpoints are chosen
by validation loss; final test examples do not enter fitting or selection. It does not fine-tune the VLM, locate garments, learn outfit taste,
or replace the running recognizer. Requires a separate Python environment with
`torch`, `torchvision` and `Pillow`. No Python packages or weights are downloaded
by the app or exporter.

At least two garment types are required, with at least ten training and three
validation examples **from distinct source photos for each type**. Collect varied
lighting, backgrounds and clothing examples, then inspect the split counts. This
minimum is an execution gate, not a claim that the dataset is sufficient for
real-world accuracy.

```sh
python training/train_classifier.py /absolute/dataset-directory \
  --output /absolute/new/model-directory --epochs 10 --allow-download
```

The explicit `--allow-download` flag permits torchvision's pretrained backbone
weights download. Alternatively provide `--weights /path/to/local/backbone.pth`.
The script writes `classifier.pt` and `evaluation.json` with held-out accuracy,
macro F1, class confusion and source-photo counts. The current active checkpoint is used as a secondary review check with validation
precision gates. It does not overwrite Qwen labels. Future training outputs are
not automatically promoted; compare representative held-out photos first.

## Verification

```sh
npm run test:assistant
npm run test:pipeline
node --import tsx --test src/vision/analyze.test.ts
# Optional: uses the installed model, no downloads, isolated test database.
node --import tsx scripts/check-live-models.mjs /absolute/outfit-image.png
```

The pipeline suite uses a mock model to verify API/storage behavior. The live
suite verifies real inference, wardrobe saving and general conversation separately.
A successful smoke test is not an accuracy benchmark or a production readiness
certification. Back up SQLite and uploads before deploying; use TLS and a proper
persistent service for the API and Ollama.

Implementation references: [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs),
[Qwen3-VL model and fine-tuning resources](https://github.com/QwenLM/Qwen3-VL),
[torchvision MobileNet V3 Small](https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.mobilenet_v3_small.html).

## Reproduce the completed Fashionpedia training run

The dataset source is https://github.com/cvdfoundation/fashionpedia. Downloads are
public images and annotations; source image licenses remain attached to the
manifest. The preparation script uses range requests to fetch selected members
from the official ZIP instead of downloading the entire 3.3 GB image archive.

From the project root, install the pinned environment, download the official train
and validation annotation JSON files to the paths below, then run:

```sh
python3 -m venv .venv-training
.venv-training/bin/python -m pip install -r server/training/requirements.lock.txt
.venv-training/bin/python server/training/prepare_fashionpedia.py \
  server/training/data/fashionpedia --per-class 120 --test-per-class 30 --workers 8
.venv-training/bin/python server/training/train_classifier.py \
  server/training/data/fashionpedia --output server/models/new-candidate \
  --epochs 60 --fine-tune-epochs 12 --allow-download --device auto
```

Required annotation files are `annotations-train.json` and `annotations-val.json`,
from the official `instances_attributes_train2020.json` and
`instances_attributes_val2020.json` download links. Keep the existing manifest to
reproduce this exact run. `--fine-tune-epochs 0` reproduces the original head-only
baseline. The checked-in code and package lock are small; downloaded images, the
Python environment and generated checkpoints are intentionally Git-ignored but
remain on disk. Back them up separately.

Runtime overrides: `LOCAL_CLASSIFIER_ENABLED=false` disables the secondary check;
`LOCAL_CLASSIFIER_MODEL` and `LOCAL_CLASSIFIER_PYTHON` can specify absolute paths.
The authenticated `/api/health/models` endpoint reports whether the trained model
is available, its supported classes and test results.
