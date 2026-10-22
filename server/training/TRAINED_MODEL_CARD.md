# Divara local clothing classifier model card

Trained locally on 23 October 2026. This is an experimental crop classifier,
not a replacement for Qwen image grounding or a production accuracy claim.

| Item | Measured value |
|---|---|
| Model | MobileNet V3 Small, ImageNet pretrained backbone, locally trained 13-class head |
| Training data | Official labelled Fashionpedia crops, not the synthetic wardrobe catalog |
| Independent train / validation / test crops | 1254 / 306 / 390 |
| Independent source images | 1,229 / 302 / 338 |
| Device | Apple MPS |
| Head training | 60 epochs, AdamW, cross-entropy, validation-loss checkpoint selection |
| Visual fine-tuning experiment | 12 epochs; did not improve validation loss; retained the linear-head checkpoint |
| Validation 13-type accuracy | 63.40% |
| Test 13-type accuracy | 56.92% |
| Test macro F1 | 0.5645 |
| Test six-category accuracy | 67.44% |
| Uniform 13-class chance reference | 7.69% |
| Temperature | 0.9197, selected on validation data only |
| Checkpoint SHA256 | `a3f252f61e7f650a5798ac8d0baccef64e0d7d685778c022376a6d44631f3739` |

Classes: bag, belt, coat, dress, hat, jacket, scarf, shirt, shoes, shorts, skirt, tee, trousers.

The 1,254 training crops receive a second mirrored view during feature extraction;
those views are augmentations, not independent examples. Train and validation use
source-hash groups from the official training partition. The final 390 test crops
come from 338 images in Fashionpedia's separate validation partition. Exact image
hashes are checked for overlap. This does not eliminate perceptual near-duplicates.

The baseline and fine-tuning experiment use the same held-out subset for descriptive
comparison; it is not a large independent deployment study. The fine-tuning
checkpoint was selected only using validation loss and was rejected when it did
not improve it. Neither test labels nor user wardrobe photos entered optimizer
updates. Category-level results aggregate probabilities from the fine labels;
they are not separately trained labels.

## Backend use

`server/src/vision/classifier.ts` runs the checkpoint locally with the project
Python environment. Inference does not download weights. Qwen still locates
visible items and supplies colours and sleeve descriptions. The classifier stores
its prediction alongside the recognition result. A high-confidence disagreement
is withheld from automatic recommendations only when the predicted class/category
passes the stored validation-precision and support gates. The original label is
preserved for human review; no prediction is silently marked as confirmed.

This data subset does not train earrings, necklaces, bracelets, rings, sleeve
length, colours, segmentation masks, bounding-box detection, chatbot responses or
personal outfit compatibility. Those functions retain their separate inference
or rule-based implementations. At 56.9% fine-label test accuracy,
this classifier is not reliable enough to relabel arbitrary user photos without
review. On the user's example crops, several detailed predictions were wrong and
the confidence/precision gates correctly prevented automatic replacement.

## Files and reproduction

- Active checkpoint: `server/models/fashionpedia-v1/classifier.pt`
- Complete metrics and confusion matrices: `server/models/fashionpedia-v1/evaluation.json`
- Epoch losses: `server/models/fashionpedia-v1/history.json`
- Fine-tuning experiment: `server/models/fashionpedia-finetuned/`
- Dataset manifest and licenses: `server/training/data/fashionpedia/manifest.json`
- Exact Python packages: `server/training/requirements.lock.txt`

See `server/training/README.md` for reproduction commands and integration tests.
