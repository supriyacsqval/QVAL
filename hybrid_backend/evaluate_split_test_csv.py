import os

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from hybrid_core import (
    build_batch_table,
    build_meta_features,
    classification_metrics,
    hybrid_decision,
    load_hybrid_config,
    load_latest_artifacts,
    predict_latest_for_row,
    predict_rf_for_row,
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LATEST_DIR = os.path.join(BASE_DIR, '..', 'sid')
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'artifacts')

UNIFIED_CSV = os.path.join(BASE_DIR, 'Unified_Dataset.csv')
COMBINED_OUTPUT = os.path.join(BASE_DIR, 'combined_output.xlsx')

SPLIT_TEST_CSV = os.path.join(ARTIFACTS_DIR, 'split_test.csv')
SPLIT_TEST_GT_CSV = os.path.join(ARTIFACTS_DIR, 'split_test_with_ground_truth.csv')
SPLIT_METRICS_CSV = os.path.join(ARTIFACTS_DIR, 'split_test_metrics.csv')
SPLIT_METRICS_PNG = os.path.join(ARTIFACTS_DIR, 'split_test_metrics.png')
SPLIT_PRED_CSV = os.path.join(ARTIFACTS_DIR, 'split_test_predictions.csv')


def save_metrics_png(metrics_df: pd.DataFrame, out_path: str) -> None:
    plot_df = metrics_df[['model', 'accuracy', 'precision', 'recall', 'f1']].copy()

    fig, ax = plt.subplots(figsize=(10, 5))
    x = np.arange(len(plot_df))
    width = 0.2

    ax.bar(x - 1.5 * width, plot_df['accuracy'], width=width, label='Accuracy', color='#4C78A8')
    ax.bar(x - 0.5 * width, plot_df['precision'], width=width, label='Precision', color='#F58518')
    ax.bar(x + 0.5 * width, plot_df['recall'], width=width, label='Recall', color='#54A24B')
    ax.bar(x + 1.5 * width, plot_df['f1'], width=width, label='F1', color='#E45756')

    ax.set_xticks(x)
    ax.set_xticklabels(plot_df['model'])
    ax.set_ylim(0, 1.05)
    ax.set_ylabel('Score')
    ax.set_title('Metrics on split_test.csv (with dataset ground truth)')
    ax.legend(ncol=4, loc='upper center', bbox_to_anchor=(0.5, 1.15))

    fig.tight_layout()
    fig.savefig(out_path, dpi=180)
    plt.close(fig)


def main() -> None:
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    latest = load_latest_artifacts(LATEST_DIR)
    rf_pipeline = joblib.load(os.path.join(ARTIFACTS_DIR, 'rf_batch_pipeline.pkl'))

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

    batch_df = build_batch_table(UNIFIED_CSV, COMBINED_OUTPUT)

    _, test_df = train_test_split(
        batch_df,
        test_size=0.2,
        random_state=42,
        stratify=batch_df['target'],
    )

    # Export a test.csv-style file from split test rows.
    split_test_export = pd.DataFrame(
        {
            'UniqueID': test_df['UniqueID'].values,
            'ProductName': test_df['ProductName'].values,
            'StartTime': test_df['StartTime'].values,
            'EndTime': test_df['EndTime'].values,
            'Potency': test_df['Potency'].values,
            'PH Level': test_df['PH Level'].values,
            'Appearance': test_df['Appearance'].values,
            'Impurities': test_df['Impurities'].values,
            'Dissolution Rate - 15 Mins': test_df['Dissolution Rate - 15 Mins'].values,
            'Dissolution Rate - 30 Mins': test_df['Dissolution Rate - 30 Mins'].values,
            'Dissolution Rate - 40 Mins': test_df['Dissolution Rate - 40 Mins'].values,
            'Process Temp': test_df['Process Temp'].values,
        }
    )
    split_test_export.to_csv(SPLIT_TEST_CSV, index=False)

    split_with_gt = split_test_export.copy()
    split_with_gt['TrueTarget'] = test_df['target'].astype(int).values
    split_with_gt.to_csv(SPLIT_TEST_GT_CSV, index=False)

    # Read the test CSV back and evaluate predictions against split ground truth.
    df_test = pd.read_csv(SPLIT_TEST_CSV)
    y_true = split_with_gt['TrueTarget'].to_numpy()

    latest_pred = []
    rf_pred = []
    hybrid_pred = []
    rows = []

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

        lp = 1 if latest_res['status'] == 'R' else 0
        rp = 1 if rf_res['status'] == 'R' else 0
        hp = 1 if hybrid_res['status'] == 'R' else 0

        latest_pred.append(lp)
        rf_pred.append(rp)
        hybrid_pred.append(hp)

        rows.append(
            {
                'Batch': row['UniqueID'],
                'LatestPred': lp,
                'RFPred': rp,
                'HybridPred': hp,
                'LatestConfidence': float(latest_res['reject_confidence']),
                'RFConfidence': float(rf_res['reject_confidence']),
                'MetaConfidence': float(meta_prob) if meta_prob is not None else np.nan,
                'HybridReason': hybrid_res['reason'],
            }
        )

    latest_pred = np.array(latest_pred)
    rf_pred = np.array(rf_pred)
    hybrid_pred = np.array(hybrid_pred)

    m_latest = classification_metrics(y_true, latest_pred)
    m_rf = classification_metrics(y_true, rf_pred)
    m_hybrid = classification_metrics(y_true, hybrid_pred)

    out_df = pd.DataFrame(
        [
            {'model': 'sid', **m_latest},
            {'model': 'rf', **m_rf},
            {'model': 'hybrid', **m_hybrid},
        ]
    )
    out_df.to_csv(SPLIT_METRICS_CSV, index=False)
    save_metrics_png(out_df, SPLIT_METRICS_PNG)

    pred_df = pd.DataFrame(rows)
    pred_df.insert(1, 'TrueTarget', y_true)
    pred_df.to_csv(SPLIT_PRED_CSV, index=False)

    print('Evaluation on split_test.csv completed.')
    print('- sid    :', m_latest)
    print('- rf     :', m_rf)
    print('- hybrid :', m_hybrid)
    print('\nSaved:', SPLIT_TEST_CSV)
    print('Saved:', SPLIT_TEST_GT_CSV)
    print('Saved:', SPLIT_METRICS_CSV)
    print('Saved:', SPLIT_METRICS_PNG)
    print('Saved:', SPLIT_PRED_CSV)


if __name__ == '__main__':
    main()
