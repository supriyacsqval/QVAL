import os

import joblib
import matplotlib.pyplot as plt
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
PROJECT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))
LATEST_DIR = os.path.join(PROJECT_DIR, 'models', 'latest')
ARTIFACTS_DIR = os.path.join(PROJECT_DIR, 'artifacts')
DATA_DIR = os.path.join(PROJECT_DIR, 'data')

TEST_CSV = os.path.join(DATA_DIR, 'test.csv')
OUT_CSV = os.path.join(ARTIFACTS_DIR, 'hybrid_test_predictions.csv')
OUT_PNG = os.path.join(ARTIFACTS_DIR, 'hybrid_test_summary.png')


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


def save_test_summary_png(df: pd.DataFrame, out_path: str) -> None:
    latest_counts = df['LatestStatus'].value_counts().reindex(['A', 'R'], fill_value=0)
    rf_counts = df['RFStatus'].value_counts().reindex(['A', 'R'], fill_value=0)
    hybrid_counts = df['HybridStatus'].value_counts().reindex(['A', 'R'], fill_value=0)

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))

    status_labels = ['Accept (A)', 'Reject (R)']
    x = [0, 1]
    width = 0.24

    axes[0].bar([v - width for v in x], latest_counts.values, width=width, label='Latest', color='#4C78A8')
    axes[0].bar(x, rf_counts.values, width=width, label='RF', color='#F58518')
    axes[0].bar([v + width for v in x], hybrid_counts.values, width=width, label='Hybrid', color='#54A24B')
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(status_labels)
    axes[0].set_ylabel('Batch count')
    axes[0].set_title('Status distribution on sid/test.csv')
    axes[0].legend()

    axes[1].hist(df['RFRejectConfidence'], bins=15, color='#E45756', alpha=0.8, edgecolor='white')
    axes[1].set_xlabel('RF reject confidence')
    axes[1].set_ylabel('Frequency')
    axes[1].set_title('RF confidence distribution (sid/test.csv)')

    total_rows = len(df)
    reject_rows = int((df['HybridStatus'] == 'R').sum())
    reject_rate = (reject_rows / total_rows) if total_rows else 0.0
    fig.suptitle(
        f'Hybrid test summary | total={total_rows}, hybrid_reject={reject_rows}, reject_rate={reject_rate:.2%}',
        fontsize=11,
    )

    fig.tight_layout(rect=[0, 0, 1, 0.95])
    fig.savefig(out_path, dpi=180)
    plt.close(fig)


def main():
    latest = load_latest_artifacts(LATEST_DIR)
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    rf_pipeline = joblib.load(os.path.join(ARTIFACTS_DIR, 'rf_batch_pipeline.pkl'))
    shap_explainer = None
    shap_error = ''
    try:
        import shap  # type: ignore

        shap_explainer = shap.TreeExplainer(rf_pipeline.named_steps['rf'])
    except Exception as exc:
        shap_error = str(exc)

    meta_model = None
    meta_path = os.path.join(ARTIFACTS_DIR, 'stacking_meta_model.pkl')
    if os.path.exists(meta_path):
        meta_model = joblib.load(meta_path)

    cfg = load_hybrid_config(os.path.join(ARTIFACTS_DIR, 'hybrid_config.json'))
    rf_threshold = float(cfg['rf_threshold'])
    rf_feature_columns = cfg['rf_feature_columns']
    decision_params = cfg.get('decision_params', {})
    use_meta = bool(float(decision_params.get('use_meta_stacking', 0.0))) and meta_model is not None
    meta_threshold = float(decision_params.get('meta_threshold', 0.5))

    df_test = pd.read_csv(TEST_CSV)

    results = []
    for _, row in df_test.iterrows():
        latest_res = predict_latest_for_row(row, latest)
        rf_res = predict_rf_for_row(row, rf_pipeline, rf_feature_columns)

        meta_prob = None
        if use_meta:
            meta_input = pd.DataFrame([build_meta_features(latest_res, rf_res)])
            meta_prob = float(meta_model.predict_proba(meta_input)[0][1])

        hybrid_res = hybrid_decision(
            latest_res,
            rf_res,
            rf_threshold,
            decision_params,
            meta_reject_prob=meta_prob,
            meta_threshold=meta_threshold,
            use_meta_stacking=use_meta,
        )

        shap_res = predict_shap_for_row(row, rf_pipeline, rf_feature_columns, shap_explainer=shap_explainer)

        capa_res = {
            'capa_action': None,
            'capa_characteristic': None,
            'capa_confidence': None,
            'capa_error': '' if not latest.get('capa_error') else str(latest.get('capa_error')),
            'measure_value': None,
            'measure_min': None,
            'measure_max': None,
            'measure_deviation': None,
            'measure_out_of_bounds': False,
        }
        if hybrid_res['status'] == 'R':
            capa_res = predict_capa_for_row(row, latest)

        measure_text = build_measure_text(capa_res) if hybrid_res['status'] == 'R' else 'Not rejected; no CAPA measure required.'
        analysis_text = build_analysis_text(shap_res, hybrid_res)
        decision_text = (
            f"Batch {row['UniqueID']} predicted {hybrid_res['status']} "
            f"(latest={latest_res['status']}:{float(latest_res['reject_confidence']):.3f}, "
            f"rf={rf_res['status']}:{float(rf_res['reject_confidence']):.3f})."
        )

        results.append(
            {
                'Batch': row['UniqueID'],
                'InputProduct': row.get('ProductName'),
                'InputStartTime': row.get('StartTime'),
                'InputEndTime': row.get('EndTime'),
                'LatestStatus': latest_res['status'],
                'LatestRejectConfidence': round(float(latest_res['reject_confidence']), 4),
                'RFStatus': rf_res['status'],
                'RFRejectConfidence': round(float(rf_res['reject_confidence']), 4),
                'HybridStatus': hybrid_res['status'],
                'HybridReason': hybrid_res['reason'],
                'DecisionText': decision_text,
                'RejectedMeasureText': measure_text,
                'AnalysisText': analysis_text,
                'MetaRejectConfidence': round(float(meta_prob), 4) if meta_prob is not None else None,
                'SHAPTopFeature': shap_res['shap_top_feature'],
                'SHAPTopContribution': round(float(shap_res['shap_top_contribution']), 6) if shap_res['shap_top_contribution'] is not None else None,
                'SHAPTopFeatureValue': round(float(shap_res['shap_top_feature_value']), 6) if shap_res['shap_top_feature_value'] is not None else None,
                'SHAPSummary': shap_res['shap_summary'],
                'SHAPError': shap_res['shap_error'] or shap_error,
                'CAPACharacteristic': capa_res['capa_characteristic'],
                'CAPAAction': capa_res['capa_action'],
                'CAPAConfidence': round(float(capa_res['capa_confidence']), 4) if capa_res['capa_confidence'] is not None else None,
                'CAPAError': capa_res['capa_error'],
            }
        )

    out_df = pd.DataFrame(results)
    out_df.to_csv(OUT_CSV, index=False)
    save_test_summary_png(out_df, OUT_PNG)

    print(out_df.to_string(index=False))
    print('\nSaved:', OUT_CSV)
    print('Saved:', OUT_PNG)


if __name__ == '__main__':
    main()
