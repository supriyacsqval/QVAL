# Hybrid Backend

This folder keeps a separate hybrid backend pipeline that combines:

- rule + characteristic-level neural reject decisions (high precision)
- final.ipynb logic: batch-level RandomForest on pivoted features (high recall)

Training uses both row-level sources together:

- `Unified_Dataset.csv`
- `combined_output.xlsx`

No files outside hybrid_backend are modified by this implementation.

## Dependency note

- Full hybrid mode uses the saved row-level neural model artifacts from the source quality pipeline and needs `tensorflow` or `keras` installed.
- If unavailable, scripts automatically fall back to rule-based and RF-only behavior and still run the hybrid logic.

## Python 3.13.3 setup

Use your project virtual environment and install with `pip` from that interpreter.

1. Activate venv from workspace root:
	- PowerShell: `./venv/Scripts/Activate.ps1`
2. Upgrade pip:
	- `python -m pip install --upgrade pip`
3. Install dependencies:
	- `python -m pip install -r hybrid_backend/requirements.txt`

If you prefer full path (without activation):

- `c:/Users/Supriya/OneDrive/Desktop/test/venv/Scripts/python.exe -m pip install --upgrade pip`
- `c:/Users/Supriya/OneDrive/Desktop/test/venv/Scripts/python.exe -m pip install -r hybrid_backend/requirements.txt`

## Recommended Python version for SHAP

For full SHAP support on Windows, Python 3.11 is recommended.

1. Create venv:
	- `py -3.11 -m venv .venv311`
2. Install:
	- `.\\.venv311\\Scripts\\python.exe -m pip install -r hybrid_backend/requirements.txt`
3. Run inference:
	- `.\\.venv311\\Scripts\\python.exe hybrid_backend/run_hybrid_inference.py`

## Files

- `hybrid_core.py`: shared hybrid logic
- `quality_store.py`: local SQLite-backed history and trend summaries
- `api_server.py`: Flask API for manual input, CSV upload, and trend retrieval
- `train_hybrid_backend.py`: trains final-style RF model and tunes hybrid threshold
- `run_hybrid_inference.py`: runs hybrid predictions on `test .csv`
- `evaluate_hybrid_backend.py`: reports holdout metrics for the batch hybrid pipeline
- `predict_batch_text.py`: predicts one batch by ID and prints textual decision, rejected measure, CAPA action, and SHAP analysis

## Run order

1. `python hybrid_backend/train_hybrid_backend.py`
2. `python hybrid_backend/run_hybrid_inference.py`
3. `python hybrid_backend/evaluate_hybrid_backend.py`

The trainer automatically merges both datasets, normalizes valuation labels (`A/R`, `PASS/FAIL`, etc.), removes duplicate rows, then tunes the hybrid threshold for stronger precision/recall balance.

## Outputs

Created under `hybrid_backend/artifacts`:

- `rf_batch_pipeline.pkl`
- `hybrid_config.json`
- `validation_metrics.csv`
- `holdout_metrics.csv`
- `holdout_metrics.png`
- `hybrid_test_summary.png`

Inference output:

- `hybrid_backend/hybrid_test_predictions.csv`

`run_hybrid_inference.py` always tests on `test .csv`, saves a PNG summary chart, and now adds SHAP explanation columns plus CAPA recommendation columns to the combined output.

## API Endpoints

Run the API server with:

`python hybrid_backend/api_server.py`

Available endpoints:

- `GET /api/health` returns model/store readiness.
- `GET /api/options` returns product and characteristic choices.
- `GET /api/trend?product=...&characteristic=...` returns SQLite-backed trend summaries.
- `POST /api/predict` accepts manual JSON input for one characteristic check.
- `POST /api/batch/predict` accepts a CSV upload or JSON `rows` list and returns structured batch-level predictions, SHAP, and CAPA data.
