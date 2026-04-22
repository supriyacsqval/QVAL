import os

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

from hybrid_core import (
    CHARACTERISTICS,
    build_batch_table,
    build_meta_features,
    classification_metrics,
    hybrid_decision,
    load_latest_artifacts,
    predict_latest_for_row,
    predict_rf_for_row,
    train_rf_pipeline,
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LATEST_DIR = os.path.join(BASE_DIR, '..', 'sid')
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'artifacts')

UNIFIED_CSV = os.path.join(BASE_DIR, 'Unified_Dataset.csv')
COMBINED_OUTPUT = os.path.join(BASE_DIR, 'combined_output.xlsx')

OUT_CSV = os.path.join(ARTIFACTS_DIR, 'external_holdout_metrics.csv')
OUT_PNG = os.path.join(ARTIFACTS_DIR, 'external_holdout_metrics.png')
OUT_PRED_CSV = os.path.join(ARTIFACTS_DIR, 'external_holdout_predictions.csv')


def save_external_metrics_png(metrics_df: pd.DataFrame, out_path: str) -> None:
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
    ax.set_title('External labeled holdout metrics (time split)')
    ax.legend(ncol=4, loc='upper center', bbox_to_anchor=(0.5, 1.15))

    fig.tight_layout()
    fig.savefig(out_path, dpi=180)
    plt.close(fig)


def _score_candidate(m_h: dict, m_latest: dict, hyb_pred: np.ndarray, latest_pred: np.ndarray) -> float:
    precision_delta = m_h['precision'] - m_latest['precision']
    recall_delta = m_h['recall'] - m_latest['recall']
    f1_delta = m_h['f1'] - m_latest['f1']
    diff_count = int((hyb_pred != latest_pred).sum())

    score = (
        (1.60 * m_h['f1'])
        + (0.35 * m_h['precision'])
        + (0.25 * m_h['recall'])
        + (0.55 * max(0.0, precision_delta))
        + (0.35 * max(0.0, recall_delta))
        + (0.20 * max(0.0, f1_delta))
        - (0.45 * max(0.0, -precision_delta))
        - (0.55 * max(0.0, -recall_delta))
        - (0.30 * max(0.0, -f1_delta))
    )

    if diff_count == 0:
        score -= 0.20

    return score


def main():
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    print('Loading sid artifacts...')
    latest = load_latest_artifacts(LATEST_DIR)

    print('Building full labeled batch table from Unified_Dataset.csv + combined_output.xlsx...')
    batch_df = build_batch_table(UNIFIED_CSV, COMBINED_OUTPUT)
    batch_df = batch_df.sort_values('StartTime').reset_index(drop=True)

    split_idx = int(len(batch_df) * 0.80)
    train_val_df = batch_df.iloc[:split_idx].copy()
    external_df = batch_df.iloc[split_idx:].copy()

    if len(external_df) < 50:
        raise ValueError('External holdout is too small for reliable evaluation.')

    rf_feature_columns = CHARACTERISTICS + ['Duration']

    train_df, val_df = train_test_split(
        train_val_df,
        test_size=0.25,
        random_state=42,
        stratify=train_val_df['target'],
    )

    print('Training RF base model on train split...')
    rf_pipeline = train_rf_pipeline(train_df, rf_feature_columns)

    y_val = val_df['target'].to_numpy()
    latest_pred_val = []
    latest_conf_val = []
    rf_pred_val = []
    rf_conf_val = []

    for _, row in val_df.iterrows():
        l = predict_latest_for_row(row, latest)
        r = predict_rf_for_row(row, rf_pipeline, rf_feature_columns)

        latest_pred_val.append(1 if l['status'] == 'R' else 0)
        latest_conf_val.append(float(l['reject_confidence']))
        rf_pred_val.append(1 if r['status'] == 'R' else 0)
        rf_conf_val.append(float(r['reject_confidence']))

    latest_pred_val = np.array(latest_pred_val)
    rf_pred_val = np.array(rf_pred_val)

    m_latest_val = classification_metrics(y_val, latest_pred_val)

    meta_rows_val = []
    for i in range(len(val_df)):
        meta_rows_val.append(
            build_meta_features(
                {
                    'status': 'R' if latest_pred_val[i] == 1 else 'A',
                    'reject_confidence': latest_conf_val[i],
                    'hard_fail': bool(latest_conf_val[i] == 1.0 and latest_pred_val[i] == 1),
                },
                {
                    'status': 'R' if rf_pred_val[i] == 1 else 'A',
                    'reject_confidence': rf_conf_val[i],
                },
            )
        )

    meta_df_val = pd.DataFrame(meta_rows_val)
    meta_model = LogisticRegression(class_weight='balanced', random_state=42, max_iter=2000)
    meta_model.fit(meta_df_val, y_val)
    meta_prob_val = meta_model.predict_proba(meta_df_val)[:, 1]

    best_meta_threshold = 0.5
    best_meta_score = -1e9

    for meta_th in np.round(np.arange(0.35, 0.76, 0.02), 2):
        hyb_pred = []
        for i in range(len(val_df)):
            l = {
                'status': 'R' if latest_pred_val[i] == 1 else 'A',
                'reject_confidence': latest_conf_val[i],
                'hard_fail': bool(latest_conf_val[i] == 1.0 and latest_pred_val[i] == 1),
            }
            r = {
                'status': 'R' if rf_pred_val[i] == 1 else 'A',
                'reject_confidence': rf_conf_val[i],
            }
            h = hybrid_decision(
                l,
                r,
                rf_threshold=0.74,
                decision_params={'latest_keep_threshold': 0.8, 'rf_accept_override_threshold': 0.35},
                meta_reject_prob=float(meta_prob_val[i]),
                meta_threshold=float(meta_th),
                use_meta_stacking=True,
            )
            hyb_pred.append(1 if h['status'] == 'R' else 0)

        hyb_pred = np.array(hyb_pred)
        m_h = classification_metrics(y_val, hyb_pred)
        score = _score_candidate(m_h, m_latest_val, hyb_pred, latest_pred_val)

        recall_floor_ok = m_h['recall'] >= max(0.0, m_latest_val['recall'] - 0.01)
        precision_floor_ok = m_h['precision'] >= max(0.0, m_latest_val['precision'] - 0.02)
        if not (recall_floor_ok and precision_floor_ok):
            continue

        if score > best_meta_score:
            best_meta_score = score
            best_meta_threshold = float(meta_th)

    # External holdout evaluation
    y_ext = external_df['target'].to_numpy()
    latest_pred_ext = []
    rf_pred_ext = []
    hybrid_pred_ext = []
    rows_out = []

    for _, row in external_df.iterrows():
        l = predict_latest_for_row(row, latest)
        r = predict_rf_for_row(row, rf_pipeline, rf_feature_columns)

        meta_input = pd.DataFrame([build_meta_features(l, r)])
        meta_prob = float(meta_model.predict_proba(meta_input)[0][1])

        h = hybrid_decision(
            l,
            r,
            rf_threshold=0.74,
            decision_params={'latest_keep_threshold': 0.8, 'rf_accept_override_threshold': 0.35},
            meta_reject_prob=meta_prob,
            meta_threshold=best_meta_threshold,
            use_meta_stacking=True,
        )

        lp = 1 if l['status'] == 'R' else 0
        rp = 1 if r['status'] == 'R' else 0
        hp = 1 if h['status'] == 'R' else 0

        latest_pred_ext.append(lp)
        rf_pred_ext.append(rp)
        hybrid_pred_ext.append(hp)

        rows_out.append(
            {
                'Batch': row['UniqueID'],
                'TrueTarget': int(row['target']),
                'LatestPred': lp,
                'RFPred': rp,
                'HybridPred': hp,
                'LatestConfidence': float(l['reject_confidence']),
                'RFConfidence': float(r['reject_confidence']),
                'MetaConfidence': meta_prob,
                'HybridReason': h['reason'],
            }
        )

    latest_pred_ext = np.array(latest_pred_ext)
    rf_pred_ext = np.array(rf_pred_ext)
    hybrid_pred_ext = np.array(hybrid_pred_ext)

    m_latest = classification_metrics(y_ext, latest_pred_ext)
    m_rf = classification_metrics(y_ext, rf_pred_ext)
    m_hybrid = classification_metrics(y_ext, hybrid_pred_ext)

    print('\nExternal labeled holdout metrics (time split)')
    print('- sid    :', m_latest)
    print('- rf     :', m_rf)
    print('- hybrid :', m_hybrid, '| meta_threshold =', best_meta_threshold)

    out_df = pd.DataFrame(
        [
            {'model': 'sid', **m_latest},
            {'model': 'rf', **m_rf},
            {'model': 'hybrid', **m_hybrid},
        ]
    )
    out_df.to_csv(OUT_CSV, index=False)
    save_external_metrics_png(out_df, OUT_PNG)
    pd.DataFrame(rows_out).to_csv(OUT_PRED_CSV, index=False)

    print('\nSaved:', OUT_CSV)
    print('Saved:', OUT_PNG)
    print('Saved:', OUT_PRED_CSV)

    # Persist the externally tuned stacker as optional production artifact.
    joblib.dump(meta_model, os.path.join(ARTIFACTS_DIR, 'stacking_meta_model_external.pkl'))


if __name__ == '__main__':
    main()
