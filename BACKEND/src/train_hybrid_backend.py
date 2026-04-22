import os

import joblib
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
    save_hybrid_config,
    train_rf_pipeline,
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))
LATEST_DIR = os.path.join(PROJECT_DIR, 'models', 'latest')
ARTIFACTS_DIR = os.path.join(PROJECT_DIR, 'artifacts')
DATA_DIR = os.path.join(PROJECT_DIR, 'data')
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

UNIFIED_CSV = os.path.join(DATA_DIR, 'Unified_Dataset.csv')
COMBINED_OUTPUT = os.path.join(DATA_DIR, 'combined_output.xlsx')


def main():
    print('Loading sid artifacts...')
    latest = load_latest_artifacts(LATEST_DIR)
    if not latest.get('model_loaded', False):
        print('Warning: model_status.keras could not be loaded with tensorflow/keras.')
        print('Hybrid will use sid business rules only in this environment.')
        if latest.get('model_error'):
            print('Load detail:', latest['model_error'])

    print('Building batch table from Unified_Dataset.csv + combined_output.xlsx...')
    batch_df = build_batch_table(UNIFIED_CSV, COMBINED_OUTPUT)

    rf_feature_columns = CHARACTERISTICS + ['Duration']

    train_df, val_df = train_test_split(
        batch_df,
        test_size=0.2,
        random_state=42,
        stratify=batch_df['target'],
    )

    print('Training final.ipynb-style RF model...')
    rf_pipeline = train_rf_pipeline(train_df, rf_feature_columns)

    y_true = val_df['target'].to_numpy()

    latest_pred = []
    latest_conf = []
    rf_pred = []
    rf_conf = []

    for _, row in val_df.iterrows():
        l = predict_latest_for_row(row, latest)
        r = predict_rf_for_row(row, rf_pipeline, rf_feature_columns)

        latest_pred.append(1 if l['status'] == 'R' else 0)
        latest_conf.append(l['reject_confidence'])
        rf_pred.append(1 if r['status'] == 'R' else 0)
        rf_conf.append(r['reject_confidence'])

    latest_pred = np.array(latest_pred)
    rf_pred = np.array(rf_pred)

    m_latest = classification_metrics(y_true, latest_pred)
    m_rf = classification_metrics(y_true, rf_pred)

    meta_feature_rows = []
    for i in range(len(val_df)):
        latest_row = {
            'status': 'R' if latest_pred[i] == 1 else 'A',
            'reject_confidence': float(latest_conf[i]),
            'hard_fail': bool(latest_conf[i] == 1.0 and latest_pred[i] == 1),
        }
        rf_row = {
            'status': 'R' if rf_pred[i] == 1 else 'A',
            'reject_confidence': float(rf_conf[i]),
        }
        meta_feature_rows.append(build_meta_features(latest_row, rf_row))

    meta_df = pd.DataFrame(meta_feature_rows)
    meta_model = LogisticRegression(
        class_weight='balanced',
        random_state=42,
        max_iter=2000,
    )
    meta_model.fit(meta_df, y_true)

    meta_reject_prob = meta_model.predict_proba(meta_df)[:, 1]

    best_threshold = 0.80
    best_decision_params = {
        'latest_keep_threshold': 0.75,
        'rf_accept_override_threshold': 0.25,
    }
    best_meta_threshold = 0.5
    best_metrics = None
    best_pred = None
    best_score = -1.0
    best_diff_count = -1

    threshold_grid = np.round(np.arange(0.58, 0.91, 0.02), 2)
    latest_keep_grid = np.round(np.arange(0.55, 0.91, 0.05), 2)
    rf_accept_override_grid = np.round(np.arange(0.10, 0.41, 0.05), 2)
    meta_threshold_grid = np.round(np.arange(0.35, 0.76, 0.02), 2)

    # 1) Tune meta stacking threshold first.
    for meta_th in meta_threshold_grid:
        hyb_pred = []
        for i in range(len(val_df)):
            l = {
                'status': 'R' if latest_pred[i] == 1 else 'A',
                'reject_confidence': float(latest_conf[i]),
                'hard_fail': bool(latest_conf[i] == 1.0 and latest_pred[i] == 1),
            }
            r = {
                'status': 'R' if rf_pred[i] == 1 else 'A',
                'reject_confidence': float(rf_conf[i]),
            }
            h = hybrid_decision(
                l,
                r,
                rf_threshold=best_threshold,
                decision_params=best_decision_params,
                meta_reject_prob=float(meta_reject_prob[i]),
                meta_threshold=float(meta_th),
                use_meta_stacking=True,
            )
            hyb_pred.append(1 if h['status'] == 'R' else 0)

        hyb_pred = np.array(hyb_pred)
        m_h = classification_metrics(y_true, hyb_pred)

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

        recall_floor_ok = m_h['recall'] >= max(0.0, m_latest['recall'] - 0.01)
        precision_floor_ok = m_h['precision'] >= max(0.0, m_latest['precision'] - 0.02)
        if not (recall_floor_ok and precision_floor_ok):
            continue

        if best_metrics is None or score > best_score or (
            score == best_score and diff_count > best_diff_count
        ):
            best_meta_threshold = float(meta_th)
            best_metrics = m_h
            best_pred = hyb_pred
            best_score = score
            best_diff_count = diff_count

    # 2) Tune fallback rule-based hybrid in case meta is unavailable.
    fallback_best_metrics = None
    fallback_best_pred = None
    fallback_best_score = -1.0
    fallback_best_diff_count = -1

    for th in threshold_grid:
        for latest_keep in latest_keep_grid:
            for rf_accept_override in rf_accept_override_grid:
                if rf_accept_override >= th:
                    continue

                decision_params = {
                    'latest_keep_threshold': float(latest_keep),
                    'rf_accept_override_threshold': float(rf_accept_override),
                }

                hyb_pred = []
                for i, (_, row) in enumerate(val_df.iterrows()):
                    l = {
                        'status': 'R' if latest_pred[i] == 1 else 'A',
                        'reject_confidence': float(latest_conf[i]),
                        'hard_fail': bool(latest_conf[i] == 1.0 and latest_pred[i] == 1),
                    }
                    r = {
                        'status': 'R' if rf_pred[i] == 1 else 'A',
                        'reject_confidence': float(rf_conf[i]),
                    }
                    h = hybrid_decision(l, r, float(th), decision_params)
                    hyb_pred.append(1 if h['status'] == 'R' else 0)

                hyb_pred = np.array(hyb_pred)
                m_h = classification_metrics(y_true, hyb_pred)

                precision_delta = m_h['precision'] - m_latest['precision']
                recall_delta = m_h['recall'] - m_latest['recall']
                f1_delta = m_h['f1'] - m_latest['f1']
                diff_count = int((hyb_pred != latest_pred).sum())

                score = (
                    (1.50 * m_h['f1'])
                    + (0.30 * m_h['precision'])
                    + (0.20 * m_h['recall'])
                    + (0.50 * max(0.0, precision_delta))
                    + (0.35 * max(0.0, recall_delta))
                    + (0.20 * max(0.0, f1_delta))
                    - (0.40 * max(0.0, -precision_delta))
                    - (0.50 * max(0.0, -recall_delta))
                    - (0.30 * max(0.0, -f1_delta))
                )

                # Prefer candidates that are not trivially identical to latest unless they are clearly superior.
                if diff_count == 0:
                    score -= 0.20

                recall_floor_ok = m_h['recall'] >= max(0.0, m_latest['recall'] - 0.01)
                precision_floor_ok = m_h['precision'] >= max(0.0, m_latest['precision'] - 0.02)

                if not (recall_floor_ok and precision_floor_ok):
                    continue

                if fallback_best_metrics is None:
                    best_threshold = float(th)
                    best_decision_params = decision_params
                    fallback_best_metrics = m_h
                    fallback_best_pred = hyb_pred
                    fallback_best_score = score
                    fallback_best_diff_count = diff_count
                    continue

                is_better = False
                if score > fallback_best_score:
                    is_better = True
                elif score == fallback_best_score and m_h['f1'] > fallback_best_metrics['f1']:
                    is_better = True
                elif score == fallback_best_score and m_h['f1'] == fallback_best_metrics['f1'] and m_h['precision'] > fallback_best_metrics['precision']:
                    is_better = True
                elif score == fallback_best_score and m_h['f1'] == fallback_best_metrics['f1'] and m_h['precision'] == fallback_best_metrics['precision'] and diff_count > fallback_best_diff_count:
                    is_better = True

                if is_better:
                    best_threshold = float(th)
                    best_decision_params = decision_params
                    fallback_best_metrics = m_h
                    fallback_best_pred = hyb_pred
                    fallback_best_score = score
                    fallback_best_diff_count = diff_count

    if best_metrics is None:
        best_metrics = fallback_best_metrics
        best_pred = fallback_best_pred
        best_score = fallback_best_score
        best_diff_count = fallback_best_diff_count

    if best_metrics is None:
        best_metrics = classification_metrics(y_true, best_pred)

    print('\nValidation metrics')
    print('- sid    :', m_latest)
    print('- rf     :', m_rf)
    print('- hybrid :', best_metrics, '| meta_threshold =', best_meta_threshold, '| fallback_threshold =', best_threshold, '| decision_params =', best_decision_params)
    print('- changed predictions vs latest:', int((best_pred != latest_pred).sum()))

    joblib.dump(rf_pipeline, os.path.join(ARTIFACTS_DIR, 'rf_batch_pipeline.pkl'))
    joblib.dump(meta_model, os.path.join(ARTIFACTS_DIR, 'stacking_meta_model.pkl'))
    save_hybrid_config(
        os.path.join(ARTIFACTS_DIR, 'hybrid_config.json'),
        rf_threshold=best_threshold,
        rf_feature_columns=rf_feature_columns,
        decision_params={
            **best_decision_params,
            'meta_threshold': float(best_meta_threshold),
            'use_meta_stacking': 1.0,
        },
    )

    report_df = pd.DataFrame(
        [
            {'model': 'sid', **m_latest},
            {'model': 'rf', **m_rf},
            {'model': 'hybrid', **best_metrics},
        ]
    )
    report_path = os.path.join(ARTIFACTS_DIR, 'validation_metrics.csv')
    report_df.to_csv(report_path, index=False)

    print('\nSaved artifacts:')
    print('-', os.path.join(ARTIFACTS_DIR, 'rf_batch_pipeline.pkl'))
    print('-', os.path.join(ARTIFACTS_DIR, 'stacking_meta_model.pkl'))
    print('-', os.path.join(ARTIFACTS_DIR, 'hybrid_config.json'))
    print('-', report_path)


if __name__ == '__main__':
    main()
