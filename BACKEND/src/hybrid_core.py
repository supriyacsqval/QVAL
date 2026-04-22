import json
import os
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.pipeline import Pipeline


CHARACTERISTICS = [
    'Potency',
    'PH Level',
    'Impurities',
    'Dissolution Rate - 15 Mins',
    'Dissolution Rate - 30 Mins',
    'Dissolution Rate - 40 Mins',
    'Process Temp',
]


DEFAULT_RF_PARAMS = {
    'n_estimators': 300,
    'max_depth': 12,
    'min_samples_leaf': 2,
    'class_weight': {0: 1, 1: 1.5},
    'random_state': 42,
}


def duration_minutes(start_time, end_time) -> float:
    start_dt = pd.to_datetime(start_time)
    end_dt = pd.to_datetime(end_time)
    duration = (end_dt - start_dt).total_seconds() / 60.0
    if duration < 0:
        duration += 1440.0
    return float(duration)


def load_latest_artifacts(latest_dir: str) -> Dict[str, object]:
    model_status = None
    model_loaded = False
    model_error = ''
    preprocessor_capa = None
    le_capa = None
    model_capa = None
    capa_loaded = False
    capa_error = ''

    try:
        from tensorflow.keras.models import load_model  # type: ignore

        model_status = load_model(os.path.join(latest_dir, 'model_status.keras'))
        model_loaded = True
    except Exception as tf_exc:
        try:
            from keras.models import load_model  # type: ignore

            model_status = load_model(os.path.join(latest_dir, 'model_status.keras'))
            model_loaded = True
        except Exception as k_exc:
            model_error = f'tensorflow/keras unavailable: {tf_exc}; {k_exc}'

    try:
        from tensorflow.keras.models import load_model  # type: ignore

        preprocessor_capa = joblib.load(os.path.join(latest_dir, 'preprocessor_capa.pkl'))
        le_capa = joblib.load(os.path.join(latest_dir, 'le_capa.pkl'))
        model_capa = load_model(os.path.join(latest_dir, 'model_capa.keras'))
        capa_loaded = True
    except Exception as capa_exc:
        capa_error = str(capa_exc)

    return {
        'reference_lookup': joblib.load(os.path.join(latest_dir, 'reference_lookup.pkl')),
        'preprocessor_status': joblib.load(os.path.join(latest_dir, 'preprocessor_status.pkl')),
        'le_status': joblib.load(os.path.join(latest_dir, 'le_status.pkl')),
        'model_status': model_status,
        'model_loaded': model_loaded,
        'model_error': model_error,
        'preprocessor_capa': preprocessor_capa,
        'le_capa': le_capa,
        'model_capa': model_capa,
        'capa_loaded': capa_loaded,
        'capa_error': capa_error,
    }


def _read_source_file(path: str) -> pd.DataFrame:
    if path.lower().endswith('.xlsx'):
        return pd.read_excel(path)
    return pd.read_csv(path)


def _normalize_valuation(value: object) -> str:
    if pd.isna(value):
        return 'A'

    text = str(value).strip().upper()
    if text in {'R', 'REJECT', 'REJECTED', 'FAIL', 'FAILED', '1'}:
        return 'R'
    if text in {'A', 'ACCEPT', 'ACCEPTED', 'PASS', 'PASSED', '0'}:
        return 'A'
    return 'R' if 'R' in text or 'FAIL' in text else 'A'


def _normalize_row_level_df(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()

    required_cols = {
        'Batch': np.nan,
        'ProductDescription': np.nan,
        'CharacteristicDesc': np.nan,
        'Quantative': np.nan,
        'MinValue': np.nan,
        'MaxValue': np.nan,
        'Valuation': 'A',
        'Qualitative': np.nan,
        'StartDate': np.nan,
        'StartTime': np.nan,
        'EndDate': np.nan,
        'EndTime': np.nan,
    }

    for col, default_val in required_cols.items():
        if col not in normalized.columns:
            normalized[col] = default_val

    normalized['Valuation'] = normalized['Valuation'].apply(_normalize_valuation)
    return normalized


def load_training_rows(unified_dataset_csv: str, combined_output_path: Optional[str] = None) -> pd.DataFrame:
    sources = []

    if os.path.exists(unified_dataset_csv):
        sources.append(_read_source_file(unified_dataset_csv))

    if combined_output_path and os.path.exists(combined_output_path):
        sources.append(_read_source_file(combined_output_path))

    if not sources:
        raise FileNotFoundError(
            f'No training sources found. Checked: {unified_dataset_csv}, {combined_output_path}'
        )

    normalized_sources = [_normalize_row_level_df(df) for df in sources]
    merged_df = pd.concat(normalized_sources, ignore_index=True)

    dedupe_cols = [
        'Batch',
        'ProductDescription',
        'CharacteristicDesc',
        'Quantative',
        'Valuation',
        'StartDate',
        'StartTime',
        'EndDate',
        'EndTime',
    ]
    dedupe_cols = [c for c in dedupe_cols if c in merged_df.columns]
    if dedupe_cols:
        merged_df = merged_df.drop_duplicates(subset=dedupe_cols, keep='first')

    return merged_df


def build_batch_table(unified_dataset_csv: str, combined_output_path: Optional[str] = None) -> pd.DataFrame:
    df = load_training_rows(unified_dataset_csv, combined_output_path)

    if 'Batch' not in df.columns:
        raise ValueError('Unified dataset must contain Batch column.')

    df['Batch'] = df['Batch'].astype(str)

    df['StartDT'] = pd.to_datetime(df['StartDate'].astype(str) + ' ' + df['StartTime'].astype(str), errors='coerce')
    df['EndDT'] = pd.to_datetime(df['EndDate'].astype(str) + ' ' + df['EndTime'].astype(str), errors='coerce')

    quant_df = df[df['CharacteristicDesc'] != 'Appearance'].copy()
    quant_df = quant_df.dropna(subset=['Quantative'])

    pivot_df = quant_df.pivot_table(
        index='Batch',
        columns='CharacteristicDesc',
        values='Quantative',
        aggfunc='mean',
    ).reset_index()

    product_map = df.groupby('Batch')['ProductDescription'].first()
    start_map = df.groupby('Batch')['StartDT'].min()
    end_map = df.groupby('Batch')['EndDT'].max()
    target_map = df.groupby('Batch')['Valuation'].apply(lambda x: 1 if 'R' in x.values else 0)

    capa_context_columns = [
        'NotificationID',
        'TaskCharacteristic',
        'Increase/Decrease',
        'CorrectionValue',
        'ItemText',
        'TaskText',
    ]
    capa_context_maps: Dict[str, pd.Series] = {}
    for column in capa_context_columns:
        if column in df.columns:
            capa_context_maps[column] = df.groupby('Batch')[column].first()

    appearance_df = df[df['CharacteristicDesc'] == 'Appearance'].copy()
    appearance_map = appearance_df.groupby('Batch')['Qualitative'].first() if not appearance_df.empty else pd.Series(dtype=object)

    pivot_df['UniqueID'] = pivot_df['Batch'].astype(str)
    pivot_df['ProductName'] = pivot_df['Batch'].map(product_map)
    pivot_df['StartTime'] = pivot_df['Batch'].map(start_map)
    pivot_df['EndTime'] = pivot_df['Batch'].map(end_map)
    pivot_df['Appearance'] = pivot_df['Batch'].map(appearance_map).fillna('Complies')
    pivot_df['Duration'] = (pivot_df['EndTime'] - pivot_df['StartTime']).dt.total_seconds() / 60.0
    pivot_df['target'] = pivot_df['Batch'].map(target_map).astype(int)

    for column, series in capa_context_maps.items():
        pivot_df[column] = pivot_df['Batch'].map(series)

    for col in CHARACTERISTICS:
        if col not in pivot_df.columns:
            pivot_df[col] = np.nan

    pivot_df = pivot_df.dropna(subset=['ProductName']).copy()
    pivot_df['Duration'] = pivot_df['Duration'].fillna(pivot_df['Duration'].median())

    return pivot_df


def train_rf_pipeline(batch_train_df: pd.DataFrame, rf_feature_columns: List[str]) -> Pipeline:
    X = batch_train_df[rf_feature_columns]
    y = batch_train_df['target'].astype(int)

    rf = RandomForestClassifier(**DEFAULT_RF_PARAMS)
    pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('rf', rf),
    ])
    pipeline.fit(X, y)
    return pipeline


def predict_latest_for_row(row: pd.Series, latest_artifacts: Dict[str, object]) -> Dict[str, object]:
    reference_lookup = latest_artifacts['reference_lookup']
    preprocessor_status = latest_artifacts['preprocessor_status']
    le_status = latest_artifacts['le_status']
    model_status = latest_artifacts['model_status']
    model_loaded = bool(latest_artifacts.get('model_loaded', False))

    product = row['ProductName']
    appearance = str(row.get('Appearance', '')).lower().strip()
    duration_min = duration_minutes(row['StartTime'], row['EndTime'])

    if appearance and appearance != 'complies':
        return {
            'status': 'R',
            'reject_confidence': 1.0,
            'hard_fail': True,
        }

    status = 'A'
    max_reject_prob = 0.0

    for char in CHARACTERISTICS:
        quant = row.get(char)
        if pd.isna(quant):
            continue

        bounds = reference_lookup.get((product, char))
        if not bounds:
            continue

        min_val, max_val = bounds
        if quant < min_val or quant > max_val:
            return {
                'status': 'R',
                'reject_confidence': 1.0,
                'hard_fail': True,
            }

        input_status = pd.DataFrame([
            {
                'ProductDescription': product,
                'CharacteristicDesc': char,
                'Quantative': float(quant),
                'MinValue': float(min_val),
                'MaxValue': float(max_val),
                'Duration_min': float(duration_min),
            }
        ])

        if model_loaded and model_status is not None:
            x_stat = preprocessor_status.transform(input_status)
            reject_prob = float(model_status.predict(x_stat, verbose=0)[0][0])
            max_reject_prob = max(max_reject_prob, reject_prob)

            pred_idx = int(round(reject_prob))
            pred_idx = max(0, min(pred_idx, len(le_status.classes_) - 1))
            char_status = le_status.inverse_transform([pred_idx])[0]
            if char_status == 'R':
                status = 'R'

    return {
        'status': status,
        'reject_confidence': max_reject_prob,
        'hard_fail': False,
    }


def predict_rf_for_row(row: pd.Series, rf_pipeline: Pipeline, rf_feature_columns: List[str]) -> Dict[str, object]:
    sample = {col: row.get(col, np.nan) for col in rf_feature_columns}
    sample_df = pd.DataFrame([sample])

    proba = rf_pipeline.predict_proba(sample_df)[0]
    classes = rf_pipeline.named_steps['rf'].classes_
    reject_idx = int(np.where(classes == 1)[0][0]) if 1 in classes else 0
    reject_prob = float(proba[reject_idx])

    return {
        'status': 'R' if reject_prob >= 0.5 else 'A',
        'reject_confidence': reject_prob,
    }


def select_capa_candidate(row: pd.Series, reference_lookup: Dict[object, object]) -> Dict[str, object]:
    product = row.get('ProductName')
    best_candidate = None

    for characteristic in CHARACTERISTICS:
        quantitative = row.get(characteristic)
        if pd.isna(quantitative):
            continue

        bounds = reference_lookup.get((product, characteristic))
        if not bounds:
            continue

        min_val, max_val = bounds
        target = (float(min_val) + float(max_val)) / 2.0
        deviation = float(quantitative) - target
        out_of_bounds = float(quantitative) < float(min_val) or float(quantitative) > float(max_val)
        severity = (1 if out_of_bounds else 0, abs(deviation))

        candidate = {
            'product': product,
            'characteristic': characteristic,
            'quantitative': float(quantitative),
            'min_val': float(min_val),
            'max_val': float(max_val),
            'target': float(target),
            'deviation': float(deviation),
            'out_of_bounds': out_of_bounds,
            'duration_min': duration_minutes(row.get('StartTime'), row.get('EndTime')),
            'severity': severity,
        }

        if best_candidate is None or candidate['severity'] > best_candidate['severity']:
            best_candidate = candidate

    if best_candidate is None:
        return {
            'product': product,
            'characteristic': None,
            'quantitative': None,
            'min_val': None,
            'max_val': None,
            'target': None,
            'deviation': None,
            'out_of_bounds': False,
            'duration_min': duration_minutes(row.get('StartTime'), row.get('EndTime')),
            'severity': (0, 0.0),
        }

    best_candidate.pop('severity', None)
    return best_candidate


def predict_capa_for_row(row: pd.Series, latest_artifacts: Dict[str, object]) -> Dict[str, object]:
    preprocessor_capa = latest_artifacts.get('preprocessor_capa')
    le_capa = latest_artifacts.get('le_capa')
    model_capa = latest_artifacts.get('model_capa')
    capa_loaded = bool(latest_artifacts.get('capa_loaded', False))
    capa_error = str(latest_artifacts.get('capa_error', ''))

    candidate = select_capa_candidate(row, latest_artifacts['reference_lookup'])

    def _build_fallback_action(candidate_info: Dict[str, object]) -> str:
        characteristic = candidate_info.get('characteristic')
        deviation = candidate_info.get('deviation')
        out_of_bounds = bool(candidate_info.get('out_of_bounds', False))

        if not characteristic:
            return 'Review batch measurements and perform root-cause analysis.'

        if deviation is None:
            return f'Review {characteristic} trend and validate process controls.'

        direction = 'above target' if float(deviation) > 0 else 'below target'
        if out_of_bounds:
            return f'Adjust process for {characteristic} ({direction}) and re-test batch.'
        return f'Investigate drift in {characteristic} ({direction}) and monitor next batch.'

    if not capa_loaded or preprocessor_capa is None or le_capa is None or model_capa is None:
        return {
            'capa_action': _build_fallback_action(candidate),
            'capa_characteristic': candidate['characteristic'],
            'capa_confidence': None,
            'capa_error': capa_error,
            'measure_value': candidate.get('quantitative'),
            'measure_min': candidate.get('min_val'),
            'measure_max': candidate.get('max_val'),
            'measure_deviation': candidate.get('deviation'),
            'measure_out_of_bounds': candidate.get('out_of_bounds', False),
        }

    if candidate['characteristic'] is None:
        return {
            'capa_action': _build_fallback_action(candidate),
            'capa_characteristic': None,
            'capa_confidence': None,
            'capa_error': 'No characteristic candidate available for CAPA prediction.',
            'measure_value': None,
            'measure_min': None,
            'measure_max': None,
            'measure_deviation': None,
            'measure_out_of_bounds': False,
        }

    input_capa = pd.DataFrame([
        {
            'ProductDescription': candidate['product'],
            'CharacteristicDesc': candidate['characteristic'],
            'Quantative': candidate['quantitative'],
            'MinValue': candidate['min_val'],
            'MaxValue': candidate['max_val'],
            'Duration_min': candidate['duration_min'],
            'DeviationValue': candidate['deviation'],
        }
    ])

    X_capa = preprocessor_capa.transform(input_capa)
    pred_capa_probs = model_capa.predict(X_capa, verbose=0)[0]
    pred_capa_idx = int(np.argmax(pred_capa_probs))
    capa_action = le_capa.inverse_transform([pred_capa_idx])[0]
    capa_action_text = str(capa_action).strip() if capa_action is not None else ''

    if not capa_action_text or capa_action_text.lower() == 'unknown':
        capa_action_text = _build_fallback_action(candidate)

    return {
        'capa_action': capa_action_text,
        'capa_characteristic': candidate['characteristic'],
        'capa_confidence': float(np.max(pred_capa_probs)),
        'capa_error': '',
        'measure_value': candidate.get('quantitative'),
        'measure_min': candidate.get('min_val'),
        'measure_max': candidate.get('max_val'),
        'measure_deviation': candidate.get('deviation'),
        'measure_out_of_bounds': candidate.get('out_of_bounds', False),
    }


def predict_shap_for_row(
    row: pd.Series,
    rf_pipeline: Pipeline,
    rf_feature_columns: List[str],
    shap_explainer=None,
) -> Dict[str, object]:
    sample = {col: row.get(col, np.nan) for col in rf_feature_columns}
    sample_df = pd.DataFrame([sample])
    imputed_sample = rf_pipeline.named_steps['imputer'].transform(sample_df)

    if shap_explainer is None:
        try:
            import shap  # type: ignore

            shap_explainer = shap.TreeExplainer(rf_pipeline.named_steps['rf'])
        except Exception as shap_exc:
            return {
                'shap_top_feature': None,
                'shap_top_contribution': None,
                'shap_top_feature_value': None,
                'shap_summary': None,
                'shap_ranked_features': [],
                'shap_error': str(shap_exc),
            }

    shap_values = shap_explainer.shap_values(imputed_sample)
    if isinstance(shap_values, list):
        if len(shap_values) > 1:
            shap_matrix = np.asarray(shap_values[1])
        else:
            shap_matrix = np.asarray(shap_values[0])
    else:
        shap_matrix = np.asarray(getattr(shap_values, 'values', shap_values))

    if shap_matrix.ndim == 3:
        if shap_matrix.shape[-1] > 1:
            shap_matrix = shap_matrix[:, :, 1]
        else:
            shap_matrix = shap_matrix[0]

    row_values = np.asarray(shap_matrix)[0]
    top_idx = int(np.argmax(np.abs(row_values)))
    top_feature = rf_feature_columns[top_idx]
    top_contribution = float(row_values[top_idx])
    top_value = sample_df.iloc[0][top_feature]

    ranked = sorted(
        zip(rf_feature_columns, row_values),
        key=lambda item: abs(float(item[1])),
        reverse=True,
    )[:3]
    summary = '; '.join(f'{name}={float(score):+.4f}' for name, score in ranked)
    ranked_features = []
    for name, score in ranked:
        raw_val = sample_df.iloc[0][name]
        ranked_features.append(
            {
                'feature': name,
                'impact': float(score),
                'value': None if pd.isna(raw_val) else float(raw_val),
            }
        )

    return {
        'shap_top_feature': top_feature,
        'shap_top_contribution': top_contribution,
        'shap_top_feature_value': None if pd.isna(top_value) else float(top_value),
        'shap_summary': summary,
        'shap_ranked_features': ranked_features,
        'shap_error': '',
    }


def build_meta_features(latest_result: Dict[str, object], rf_result: Dict[str, object]) -> Dict[str, float]:
    latest_conf = float(latest_result.get('reject_confidence', 0.0))
    rf_conf = float(rf_result.get('reject_confidence', 0.0))
    latest_pred = 1.0 if latest_result.get('status') == 'R' else 0.0
    rf_pred = 1.0 if rf_result.get('status') == 'R' else 0.0
    hard_fail = 1.0 if latest_result.get('hard_fail', False) else 0.0

    return {
        'latest_conf': latest_conf,
        'rf_conf': rf_conf,
        'latest_pred': latest_pred,
        'rf_pred': rf_pred,
        'hard_fail': hard_fail,
        'conf_gap': abs(latest_conf - rf_conf),
        'conf_max': max(latest_conf, rf_conf),
        'conf_min': min(latest_conf, rf_conf),
        'conf_product': latest_conf * rf_conf,
    }


def hybrid_decision(
    latest_result: Dict[str, object],
    rf_result: Dict[str, object],
    rf_threshold: float,
    decision_params: Optional[Dict[str, float]] = None,
    meta_reject_prob: Optional[float] = None,
    meta_threshold: Optional[float] = None,
    use_meta_stacking: bool = False,
) -> Dict[str, object]:
    decision_params = decision_params or {}
    latest_keep_threshold = float(decision_params.get('latest_keep_threshold', 0.75))
    rf_accept_override_threshold = float(decision_params.get('rf_accept_override_threshold', 0.25))

    latest_conf = float(latest_result.get('reject_confidence', 0.0))
    rf_conf = float(rf_result.get('reject_confidence', 0.0))

    if latest_result['hard_fail']:
        return {'status': 'R', 'reason': 'hard_rule_fail'}

    if use_meta_stacking and meta_reject_prob is not None:
        meta_th = float(meta_threshold if meta_threshold is not None else decision_params.get('meta_threshold', 0.5))

        # Keep very high-confidence latest rejects even before meta thresholding.
        if latest_result['status'] == 'R' and latest_conf >= 0.95:
            return {'status': 'R', 'reason': 'latest_very_high_conf_reject'}

        if float(meta_reject_prob) >= meta_th:
            return {'status': 'R', 'reason': 'meta_stacking_reject'}
        return {'status': 'A', 'reason': 'meta_stacking_accept'}

    if latest_result['status'] == 'R':
        if latest_conf >= latest_keep_threshold:
            return {'status': 'R', 'reason': 'latest_high_conf_reject'}

        if rf_conf <= rf_accept_override_threshold:
            return {'status': 'A', 'reason': 'rf_override_accept'}

        if rf_conf >= rf_threshold:
            return {'status': 'R', 'reason': 'consensus_reject'}

        blended_reject = (0.65 * latest_conf) + (0.35 * rf_conf)
        if blended_reject >= 0.55:
            return {'status': 'R', 'reason': 'blended_reject'}
        return {'status': 'A', 'reason': 'blended_accept'}

    if rf_conf >= rf_threshold:
        return {'status': 'R', 'reason': 'rf_threshold_reject'}

    if latest_conf >= max(0.45, latest_keep_threshold - 0.15) and rf_conf >= max(0.45, rf_threshold - 0.15):
        return {'status': 'R', 'reason': 'dual_warning_reject'}

    return {'status': 'A', 'reason': 'accept'}


def classification_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    return {
        'accuracy': float(accuracy_score(y_true, y_pred)),
        'precision': float(precision_score(y_true, y_pred, zero_division=0)),
        'recall': float(recall_score(y_true, y_pred, zero_division=0)),
        'f1': float(f1_score(y_true, y_pred, zero_division=0)),
        'correct': int((y_true == y_pred).sum()),
        'incorrect': int((y_true != y_pred).sum()),
        'total': int(len(y_true)),
    }


def save_hybrid_config(
    path: str,
    rf_threshold: float,
    rf_feature_columns: List[str],
    decision_params: Optional[Dict[str, float]] = None,
):
    payload = {
        'rf_threshold': float(rf_threshold),
        'rf_feature_columns': list(rf_feature_columns),
        'decision_params': dict(decision_params or {}),
    }
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)


def load_hybrid_config(path: str) -> Dict[str, object]:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)
