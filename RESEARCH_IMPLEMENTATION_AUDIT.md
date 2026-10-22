# Divara research paper and backend implementation audit

Audited on 23 October 2026 against the supplied research document at
`/Users/dhvani/Desktop/docs_ai_research paper.docx` and the current project code.
The document describes a local prototype and explicitly states that no new model
was trained in that study. The new supervised run documented here is an extension,
not a result that can be retroactively attributed to the original paper.

## Concepts the paper actually implements

| Paper concept | Current implementation | Status and evidence |
|---|---|---|
| Intelligent-agent interpretation and PEAS | Image input, wardrobe state, profile/context, availability, recommendations and explanations | Implemented as an application architecture, not a separate general-purpose agent framework. |
| Heuristic candidate selection | Bounded category pools, outfit enumeration, compatibility/colour/ownership ranking, recent-use penalty | Implemented in `server/src/scoring/recommend.ts`. It is not A*. |
| Knowledge representation | Versioned database taxonomy, aliases, colour normalization, style/occasion/weather facts | Implemented in `server/src/scoring/knowledge.ts` and `score.ts`. |
| Constraint satisfaction | Clean-item domains; top+bottom or one-piece alternatives; occasion/weather restrictions and complete-base checks | Implemented through bounded enumeration/filtering. No AC-3 or intelligent backtracking is claimed. |
| Deep-learning inference | Installed Qwen3-VL via local Ollama, structured output validation | Implemented. The foundation model was pretrained by its publisher. |
| Expert-system reasoning | Versioned rubric, component scores, corrections and source attribution | Implemented in `evaluate`; conditional backend rules, not a generic theorem prover. |
| Probabilistic selection | Exponential weights over a near-best shortlist, seeded weighted draw | Implemented. Selection probability is not recognition confidence or human preference probability. |
| Canonicalization and reproducibility | Account-scoped image hashes; sorted garment/context/version fingerprints; cached assessments | Implemented. Exact byte hashes do not detect all visually equivalent re-encodings. |
| History-based diversity | Stored assessments exclude earlier main-clothing signatures and penalize recent overlap | Implemented in the recommender. This audit also connected chat assessments/history to persistence across fresh chats. |

The paper's equations for score weights, hue compatibility, candidate rank,
exponential weighting and fingerprint construction correspond to the backend
functions. Transformer attention is background explaining the pretrained Qwen
family; Divara does not implement or train a transformer attention stack itself.

## Methods mentioned as related work or explicitly excluded

These are **not implemented**, and the supplied paper does not claim otherwise:

- DeepFashion training/retrieval benchmarks.
- Bi-LSTM learned outfit compatibility and type-aware embedding training.
- Learned personal taste from interaction ratings or a Fashionpedia-Taste study.
- A*, AC-3, generic forward/backward chaining, resolution, decision trees or K-means.
- A separately trained unrestricted language model.
- A custom-trained instance segmentation network or pixel-level background removal.

Fashionpedia is now used for the additional supervised classifier experiment,
but this is not a full reproduction of Fashionpedia's detection/attribute models.
The chatbot uses a pretrained local language model plus checked wardrobe tools.
It cannot guarantee a correct answer to every possible question or live internet
knowledge. Its model has not been fine-tuned on conversation examples.

## Requested backend flows

| Requested behaviour | Current status |
|---|---|
| Upload photo or capture through camera | Supported JPEG/PNG/WebP; readable image validation and resizing; original source saved. |
| Save photo even before recognition finishes | Implemented; durable background jobs report queued/running/completed/failed. |
| Separate detected wardrobe items | Supported rectangular crops from model bounding boxes, each linked to the source photo. Missing/invalid locations retain the original image for review. This is not pixel segmentation. |
| Save and reuse uploaded clothes | Implemented as account-owned database pieces, with laundry/deletion checks. |
| Use only the wardrobe plus dummy pieces | Implemented. This audit fixed a mismatch: My Closet now fetches the same 92 canonical samples used by the backend rather than a separate 85-item frontend generator. |
| Change one piece and preserve the rest | Implemented with targeted slot/type/colour checks and conversation state. |
| Resolve “change it to red” | Implemented for the last discussed piece; missing matches keep the outfit and explain why. |
| Suggest jewellery and accessories | Supported through wardrobe taxonomy and accessory selection. The new classifier does not train jewellery labels. |
| Keep illustrated/animated clothing UI | Preserved; photos/crops remain in review controls. Sleeveless and strapless labels have separate silhouettes without sleeves. |
| Natural conversation | Installed local model handles general questions and structured wardrobe actions; failures are explicit and checked tools remain available. |
| Persist chat outfit scores and selection history | Implemented during this audit; fingerprints reuse saved scores and later recommendations consult past compatible-context looks. |
| Train a local model | Completed real supervised crop-classifier training and a visual-layer fine-tuning experiment; results below. |

The app's trend percentages remain demonstration content, not a live trend-data
service. Weather-aware rules use the selected weather context, not a verified
live forecast. Personal compatibility weights remain heuristics, not learned
preferences. These limitations should not be described as trained capabilities.

## Completed local supervised training

- Dataset: official Fashionpedia labels and real images; 1,950 selected garment crops.
- Independent train / validation / test crops: 1,254 / 306 / 390.
- Source images: 1,229 / 302 / 338; source-hash groups do not overlap.
- Thirteen garment types; original-image licensing/source identifiers are retained.
- Architecture: ImageNet-pretrained MobileNet V3 Small, locally trained head.
- Optimization: 60 head-training epochs; validation-loss checkpoint selection.
- Additional experiment: 12 epochs fine-tuning final visual blocks and projection.
  It did not improve validation loss; the better head-trained checkpoint was kept.
- Held-out thirteen-type accuracy: **56.92%**; macro F1: **0.5645**.
- Held-out six-category accuracy: **67.44%**.
- Uniform thirteen-class chance reference: 7.69%.

These are crop-classification measurements, not end-to-end outfit recognition
accuracy, IoU, detection mAP, jewellery accuracy or styling accuracy. The model
makes mistakes on the user's example; its precision/confidence gates correctly
prevented automatic label replacement in that check. It is installed as a
secondary review signal, not an authoritative replacement for Qwen.

The training script performs real loss calculation, backpropagation, optimizer
updates, checkpoint saving and independent evaluation. The foundation model,
chatbot and outfit scoring weights were not retrained by this classification run.
No user wardrobe images were used as supervised training examples: there are no
human-confirmed local labels yet. Future confirmed crops can supplement training.

Files:

- `server/models/fashionpedia-v1/classifier.pt`: active local checkpoint.
- `server/models/fashionpedia-v1/evaluation.json`: metrics and confusion matrices.
- `server/models/fashionpedia-finetuned/`: retained fine-tuning experiment.
- `server/training/TRAINED_MODEL_CARD.md`: model scope, provenance and limitations.
- `server/training/README.md`: preparation, training and inference instructions.
- `server/training/requirements.lock.txt`: actual Python package versions.

Generated weights, downloaded data and the virtual environment are intentionally
Git-ignored and exist locally. Back them up with the project deployment.

## Verification and remaining limits

The current audit passed isolated regressions for accounts/uploads, analysis
ownership, duplicate consistency, photo-to-wardrobe persistence, calendar and
recovery, context scoring and recommendation rules. The original chatbot
replacement tests, the expanded history/catalog tests and the full background-job
pipeline are checked separately. The real installed Qwen flow was exercised in
the preceding implementation work; the new classifier's real batch inference was
also exercised on user-supplied example crops. A fresh real Qwen request then
returned three located pieces and invoked the trained classifier for all three
in about 41 seconds. Its saved integration evidence is
`output/research-audit/vision-classifier-integration.json`.

This is a working local backend with the tested features, not a claim that every
input is recognised correctly or that deployment is commercially validated.
The local queue is single-process. A public deployment still needs operational
work appropriate to its environment (persistent services/storage, TLS, backup,
capacity testing and monitoring). Broader real-photo evaluation and more reviewed
training data are needed before relying on automatic labels without review.
