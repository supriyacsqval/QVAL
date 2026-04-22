# Hybrid Backend Technical Documentation

## 1. Purpose and Context
This project builds a quality decision system for pharmaceutical batches by combining three complementary approaches:

1. Sid folder approach: business rules plus a neural Accept/Reject model.
2. Final notebook approach: batch-level RandomForest model on pivoted process features.
3. Hybrid backend approach: layered ensemble that combines rule logic, neural confidence, RandomForest confidence, and a stacking meta-model.

The goal is to achieve stronger real-world performance than any single model, especially for high-stakes reject detection.

## 2. Main Data Sources
The hybrid backend uses two labeled sources for training:

1. [hybrid_backend/Unified_Dataset.csv](hybrid_backend/Unified_Dataset.csv)
2. [hybrid_backend/combined_output.xlsx](hybrid_backend/combined_output.xlsx)

Inference on unlabeled input is done on:

1. [sid/test.csv](sid/test.csv)

Important: [sid/test.csv](sid/test.csv) does not have ground-truth labels, so it is suitable for prediction output, not true accuracy measurement.

## 3. High-Level Architecture
### 3.1 Base Layers
1. Rule layer (from sid logic):
- Appearance non-compliance is an immediate hard reject.
- Out-of-spec measured characteristic is an immediate hard reject.

2. Sid neural layer:
- Uses saved sid preprocessing and status model artifacts.
- Produces characteristic-level reject confidence and aggregated sid reject confidence.

3. Final-style RF layer:
- RandomForest over batch-level features.
- Predicts reject probability from process and quality profile at batch level.

### 3.2 Ensemble Layer
4. Hybrid decision layer:
- Uses hard-rule gating first.
- Uses a learned stacking meta-model to combine sid and RF signals.
- Falls back to rule+threshold decision logic if meta-model is unavailable.

## 4. Code Structure and Responsibilities
1. Core logic: [hybrid_backend/hybrid_core.py](hybrid_backend/hybrid_core.py)
- Data normalization and batch-table construction.
- Sid model loading and row-level sid predictions.
- RF row prediction and probability extraction.
- Meta-feature construction for stacking.
- Hybrid decision logic with hard-fail protection.
- Metrics and config save/load utilities.

2. Training pipeline: [hybrid_backend/train_hybrid_backend.py](hybrid_backend/train_hybrid_backend.py)
- Builds merged training table from both datasets.
- Trains final-style RF base model.
- Builds stacking features from sid+RF outputs.
- Trains LogisticRegression meta-model.
- Tunes thresholds and decision parameters.
- Saves model artifacts and validation metrics.

3. Inference pipeline: [hybrid_backend/run_hybrid_inference.py](hybrid_backend/run_hybrid_inference.py)
- Loads sid artifacts, RF pipeline, hybrid config, and stacking model.
- Predicts on [sid/test.csv](sid/test.csv).
- Saves tabular predictions and PNG summary.

4. Internal holdout evaluation: [hybrid_backend/evaluate_hybrid_backend.py](hybrid_backend/evaluate_hybrid_backend.py)
- Evaluates sid vs RF vs hybrid on holdout split.
- Saves CSV metrics and PNG chart.

5. Strict external labeled evaluation: [hybrid_backend/evaluate_external_labeled.py](hybrid_backend/evaluate_external_labeled.py)
- Uses time-based external holdout from labeled merged data.
- Trains/tunes on earlier data only.
- Evaluates on future-style unseen holdout.
- Saves CSV metrics, PNG chart, and per-batch predictions.

## 5. Feature Engineering and Data Preparation
### 5.1 Row-level normalization
Training rows from both files are normalized to a common schema and valuation labels are harmonized to A/R semantics.

### 5.2 Batch-level pivot representation
The system pivots quantitative characteristics into one row per batch and computes:

1. Potency
2. PH Level
3. Impurities
4. Dissolution Rate - 15 Mins
5. Dissolution Rate - 30 Mins
6. Dissolution Rate - 40 Mins
7. Process Temp
8. Duration

Target definition:
- Batch target is reject (1) if any row valuation in batch is R.
- Otherwise accept (0).

## 6. Why This Design Was Chosen
1. Rules are deterministic safety checks.
- In pharma quality contexts, hard out-of-spec and appearance fails should not be overruled by probabilistic models.

2. Sid neural model captures fine-grained row-level behavior.
- Good at characteristic-level acceptance/rejection patterns.

3. RandomForest captures cross-feature batch interactions.
- Final notebook approach adds strong batch-level context not present in row-only logic.

4. Stacking combines strengths adaptively.
- Instead of fixed heuristics, the meta-model learns when to trust sid vs RF.

5. Fallback rule strategy improves robustness.
- If stacking artifact is unavailable, hybrid still functions safely using thresholds.

## 7. What the 198 Value Means
You asked specifically about the repeated 198 total in metrics.

Actual counts from your merged batch dataset:

1. Total batch rows after merge/dedupe: 988
2. Reject batches: 497
3. Accept batches: 491

The evaluation scripts use a 20 percent holdout split.

20 percent of 988 is approximately 197.6, which becomes 198 rows in the holdout set.

So whenever you see total=198 in metrics files, it means those scores are computed on the 20 percent holdout subset of the 988 batch-level samples.

## 8. Testing and Validation Strategy
### 8.1 Internal holdout testing
Used by [hybrid_backend/evaluate_hybrid_backend.py](hybrid_backend/evaluate_hybrid_backend.py).

Strength:
- Fast and consistent model comparison.

Limitation:
- Still from the same distribution and same overall source period.

### 8.2 External labeled testing (recommended)
Used by [hybrid_backend/evaluate_external_labeled.py](hybrid_backend/evaluate_external_labeled.py).

Method:
1. Sort batch data by StartTime.
2. Use earlier 80 percent for train/validation.
3. Use sid 20 percent as external holdout.
4. Tune on validation, then evaluate once on external holdout.

Why this is stronger:
- Reduces temporal leakage.
- Better proxy for future production performance.

## 9. Current Results
### 9.1 Internal holdout metrics
From [hybrid_backend/artifacts/validation_metrics.csv](hybrid_backend/artifacts/validation_metrics.csv):

1. sid: accuracy 0.9646, precision 0.9346, recall 1.0000, f1 0.9662
2. rf: accuracy 0.8232, precision 0.8351, recall 0.8100, f1 0.8223
3. hybrid: accuracy 1.0000, precision 1.0000, recall 1.0000, f1 1.0000

### 9.2 External labeled holdout metrics
From [hybrid_backend/artifacts/external_holdout_metrics.csv](hybrid_backend/artifacts/external_holdout_metrics.csv):

1. sid: accuracy 0.9646, precision 0.9300, recall 1.0000, f1 0.9637
2. rf: accuracy 0.8131, precision 0.8415, recall 0.7419, f1 0.7886
3. hybrid: accuracy 0.9899, precision 0.9789, recall 1.0000, f1 0.9894

Interpretation:
- Hybrid improved precision and f1 while preserving recall at 1.0 compared with sid baseline on external labeled holdout.

## 10. Key Artifacts Produced
1. RF model: [hybrid_backend/artifacts/rf_batch_pipeline.pkl](hybrid_backend/artifacts/rf_batch_pipeline.pkl)
2. Stacking model (main): [hybrid_backend/artifacts/stacking_meta_model.pkl](hybrid_backend/artifacts/stacking_meta_model.pkl)
3. Stacking model (external eval run): [hybrid_backend/artifacts/stacking_meta_model_external.pkl](hybrid_backend/artifacts/stacking_meta_model_external.pkl)
4. Hybrid config: [hybrid_backend/artifacts/hybrid_config.json](hybrid_backend/artifacts/hybrid_config.json)
5. Validation metrics CSV: [hybrid_backend/artifacts/validation_metrics.csv](hybrid_backend/artifacts/validation_metrics.csv)
6. Holdout metrics CSV: [hybrid_backend/artifacts/holdout_metrics.csv](hybrid_backend/artifacts/holdout_metrics.csv)
7. Holdout metrics PNG: [hybrid_backend/artifacts/holdout_metrics.png](hybrid_backend/artifacts/holdout_metrics.png)
8. External holdout metrics CSV: [hybrid_backend/artifacts/external_holdout_metrics.csv](hybrid_backend/artifacts/external_holdout_metrics.csv)
9. External holdout metrics PNG: [hybrid_backend/artifacts/external_holdout_metrics.png](hybrid_backend/artifacts/external_holdout_metrics.png)
10. External holdout per-batch predictions: [hybrid_backend/artifacts/external_holdout_predictions.csv](hybrid_backend/artifacts/external_holdout_predictions.csv)
11. Unlabeled test predictions: [hybrid_backend/hybrid_test_predictions.csv](hybrid_backend/hybrid_test_predictions.csv)
12. Unlabeled test summary PNG: [hybrid_backend/artifacts/hybrid_test_summary.png](hybrid_backend/artifacts/hybrid_test_summary.png)

## 11. How to Run the Full Workflow
From workspace root:

1. ./venv/Scripts/python.exe hybrid_backend/train_hybrid_backend.py
2. ./venv/Scripts/python.exe hybrid_backend/run_hybrid_inference.py
3. ./venv/Scripts/python.exe hybrid_backend/evaluate_hybrid_backend.py
4. ./venv/Scripts/python.exe hybrid_backend/evaluate_external_labeled.py

## 12. Limitations and Good Practices
1. If data generation logic changes, retrain all artifacts together.
2. Keep scikit-learn version compatible with saved preprocessor artifacts.
3. External labeled evaluation should be considered primary performance evidence.
4. For production confidence, periodically refresh external holdout with newer batches.

## 13. Summary
The current hybrid backend is not a simple threshold merge anymore. It is a layered ensemble that combines deterministic rules, sid neural behavior, final-style RF behavior, and a trained stacking combiner. This design was chosen to preserve safety-critical recall while improving precision and overall f1, and it has been validated on a stricter labeled external holdout split.
