import argparse
import json
import os

import joblib
import pandas as pd

from hybrid_core import (
    build_meta_features,
    hybrid_decision,
    load_hybrid_config,
    load_latest_artifacts,
    predict_capa_for_row,
    predict_latest_for_row,
    predict_rf_for_row,
    predict_shap_for_row,
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LATEST_DIR = os.path.join(BASE_DIR, '..', 'sid')
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'artifacts')
DEFAULT_INPUT_CSV = os.path.join(LATEST_DIR, 'test.csv')


def build_measure_text(capa_res: dict) -> str:
    characteristic = capa_res.get('capa_characteristic')
    value = capa_res.get('measure_value')
    min_val = capa_res.get('measure_min')
    max_val = capa_res.get('measure_max')
    deviation = capa_res.get('measure_deviation')
    out_of_bounds = bool(capa_res.get('measure_out_of_bounds', False))

    if not characteristic:
        return 'No dominant rejected measure identified.'

    status = 'outside limits' if out_of_bounds else 'near limit'
    return (
        f"{characteristic}: value={value:.2f}, limits=[{min_val:.2f}, {max_val:.2f}], "
        f"deviation={deviation:+.2f} ({status})"
    )


def build_analysis_text(shap_res: dict, hybrid_res: dict) -> str:
    if shap_res.get('shap_error'):
        return f"Hybrid reason={hybrid_res['reason']}; SHAP unavailable ({shap_res['shap_error']})."

    top_feature = shap_res.get('shap_top_feature')
    top_contrib = shap_res.get('shap_top_contribution')
    top_value = shap_res.get('shap_top_feature_value')
    summary = shap_res.get('shap_summary') or ''
    if top_feature is None:
        return f"Hybrid reason={hybrid_res['reason']}; no SHAP feature contribution available."

    return (
        f"Hybrid reason={hybrid_res['reason']}; top SHAP feature {top_feature} "
        f"(value={top_value:.2f}, contribution={top_contrib:+.4f}). Top factors: {summary}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description='Predict one batch and print textual decision, measure, and analysis.')
    parser.add_argument('--batch', required=True, help='Batch ID (matches UniqueID column in input CSV).')
    parser.add_argument('--input-csv', default=DEFAULT_INPUT_CSV, help='Input CSV path (default: sid/test.csv).')
    args = parser.parse_args()

    df = pd.read_csv(args.input_csv)
    filtered = df[df['UniqueID'].astype(str) == str(args.batch)]
    if filtered.empty:
        raise ValueError(f"Batch '{args.batch}' not found in {args.input_csv}")

    row = filtered.iloc[0]

    latest = load_latest_artifacts(LATEST_DIR)
    rf_pipeline = joblib.load(os.path.join(ARTIFACTS_DIR, 'rf_batch_pipeline.pkl'))

    cfg = load_hybrid_config(os.path.join(ARTIFACTS_DIR, 'hybrid_config.json'))
    rf_threshold = float(cfg['rf_threshold'])
    rf_feature_columns = cfg['rf_feature_columns']
    decision_params = cfg.get('decision_params', {})

    meta_model = None
    meta_path = os.path.join(ARTIFACTS_DIR, 'stacking_meta_model.pkl')
    if os.path.exists(meta_path):
        meta_model = joblib.load(meta_path)

    try:
        import shap  # type: ignore

        shap_explainer = shap.TreeExplainer(rf_pipeline.named_steps['rf'])
    except Exception:
        shap_explainer = None

    latest_res = predict_latest_for_row(row, latest)
    rf_res = predict_rf_for_row(row, rf_pipeline, rf_feature_columns)

    meta_prob = None
    use_meta = bool(float(decision_params.get('use_meta_stacking', 0.0))) and meta_model is not None
    if use_meta:
        meta_input = pd.DataFrame([build_meta_features(latest_res, rf_res)])
        meta_prob = float(meta_model.predict_proba(meta_input)[0][1])

    hybrid_res = hybrid_decision(
        latest_res,
        rf_res,
        rf_threshold,
        decision_params,
        meta_reject_prob=meta_prob,
        meta_threshold=float(decision_params.get('meta_threshold', 0.5)),
        use_meta_stacking=use_meta,
    )

    shap_res = predict_shap_for_row(row, rf_pipeline, rf_feature_columns, shap_explainer=shap_explainer)

    capa_res = {
        'capa_action': None,
        'capa_characteristic': None,
        'capa_confidence': None,
        'capa_error': '',
        'measure_value': None,
        'measure_min': None,
        'measure_max': None,
        'measure_deviation': None,
        'measure_out_of_bounds': False,
    }
    if hybrid_res['status'] == 'R':
        capa_res = predict_capa_for_row(row, latest)

    decision_text = (
        f"Batch {row['UniqueID']} predicted {hybrid_res['status']} "
        f"(latest={latest_res['status']}:{float(latest_res['reject_confidence']):.3f}, "
        f"rf={rf_res['status']}:{float(rf_res['reject_confidence']):.3f})."
    )

    report = {
        'batch': row['UniqueID'],
        'product': row.get('ProductName'),
        'start_time': row.get('StartTime'),
        'end_time': row.get('EndTime'),
        'status': hybrid_res['status'],
        'decision_reason': hybrid_res['reason'],
        'decision_text': decision_text,
        'rejected_measure_text': build_measure_text(capa_res) if hybrid_res['status'] == 'R' else 'Not rejected; no CAPA measure required.',
        'capa_action': capa_res.get('capa_action'),
        'analysis_text': build_analysis_text(shap_res, hybrid_res),
    }

    print(json.dumps(report, indent=2, default=str))


if __name__ == '__main__':
    main()
