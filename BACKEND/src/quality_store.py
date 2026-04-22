import json
import os
import sqlite3
from typing import Dict, List, Optional

import pandas as pd


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))
DATA_DIR = os.path.join(PROJECT_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'quality_history.sqlite3')
SEED_CSV = os.path.join(DATA_DIR, 'Unified_Dataset.csv')


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _to_text(value):
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    return text or None


def _to_float(value):
    if value is None or pd.isna(value):
        return None
    try:
        return float(value)
    except Exception:
        return None


def init_store() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)

    with _connect() as conn:
        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS quality_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_time TEXT NOT NULL,
                record_source TEXT NOT NULL,
                batch TEXT,
                product TEXT,
                characteristic TEXT,
                start_time TEXT,
                end_time TEXT,
                quantitative REAL,
                min_value REAL,
                max_value REAL,
                duration_min REAL,
                deviation REAL,
                status TEXT,
                decision_reason TEXT,
                decision_text TEXT,
                measure_text TEXT,
                analysis_text TEXT,
                capa_action TEXT,
                capa_confidence REAL,
                trend_text TEXT,
                payload_json TEXT
            )
            '''
        )
        conn.execute('CREATE INDEX IF NOT EXISTS idx_quality_history_product ON quality_history(product, characteristic, event_time)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_quality_history_status ON quality_history(status, event_time)')

        row_count = conn.execute('SELECT COUNT(*) AS c FROM quality_history').fetchone()['c']
        if row_count == 0 and os.path.exists(SEED_CSV):
            _seed_from_dataset(conn)


def _seed_from_dataset(conn: sqlite3.Connection) -> None:
    df = pd.read_csv(SEED_CSV)
    if df.empty:
        return

    rows = []
    for _, row in df.iterrows():
        product = _to_text(row.get('ProductDescription'))
        characteristic = _to_text(row.get('CharacteristicDesc')) or _to_text(row.get('Characteristic'))
        batch = _to_text(row.get('Batch'))
        start_time = None
        end_time = None
        if pd.notna(row.get('StartDate')) and pd.notna(row.get('StartTime')):
            start_time = f"{row.get('StartDate')} {row.get('StartTime')}"
        if pd.notna(row.get('EndDate')) and pd.notna(row.get('EndTime')):
            end_time = f"{row.get('EndDate')} {row.get('EndTime')}"

        quantitative = _to_float(row.get('Quantative'))
        min_value = _to_float(row.get('MinValue'))
        max_value = _to_float(row.get('MaxValue'))
        duration_min = _to_float(row.get('Duration_min'))
        deviation = _to_float(row.get('DeviationValue'))
        status = _to_text(row.get('Valuation'))
        item_text = _to_text(row.get('ItemText'))
        task_text = _to_text(row.get('TaskText'))

        if quantitative is not None and min_value is not None and max_value is not None:
            measure_text = f'{characteristic or "Measurement"}: value={quantitative:.2f}, limits=[{min_value:.2f}, {max_value:.2f}]'
        else:
            measure_text = None

        analysis_text = ' ; '.join(part for part in [item_text, task_text] if part) or None

        payload = {
            'NotificationID': _to_text(row.get('NotificationID')),
            'DefectCreatedDate': _to_text(row.get('DefectCreatedDate')),
            'ResolutionCreatedDate': _to_text(row.get('ResolutionCreatedDate')),
            'TaskCharacteristic': _to_text(row.get('TaskCharacteristic')),
            'Increase/Decrease': _to_text(row.get('Increase/Decrease')),
            'CorrectionValue': _to_float(row.get('CorrectionValue')),
        }

        rows.append(
            (
                end_time or start_time or '1970-01-01 00:00:00',
                'dataset',
                batch,
                product,
                characteristic,
                start_time,
                end_time,
                quantitative,
                min_value,
                max_value,
                duration_min,
                deviation,
                status,
                'seeded_from_unified_dataset',
                None,
                measure_text,
                analysis_text,
                _to_text(row.get('TaskText')),
                None,
                None,
                json.dumps(payload, default=str),
            )
        )

    conn.executemany(
        '''
        INSERT INTO quality_history (
            event_time, record_source, batch, product, characteristic,
            start_time, end_time, quantitative, min_value, max_value,
            duration_min, deviation, status, decision_reason,
            decision_text, measure_text, analysis_text, capa_action,
            capa_confidence, trend_text, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        rows,
    )


def store_prediction(record: Dict[str, object]) -> None:
    with _connect() as conn:
        conn.execute(
            '''
            INSERT INTO quality_history (
                event_time, record_source, batch, product, characteristic,
                start_time, end_time, quantitative, min_value, max_value,
                duration_min, deviation, status, decision_reason,
                decision_text, measure_text, analysis_text, capa_action,
                capa_confidence, trend_text, payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                record.get('event_time') or pd.Timestamp.now(tz='UTC').isoformat(),
                record.get('record_source', 'prediction'),
                record.get('batch'),
                record.get('product'),
                record.get('characteristic'),
                record.get('start_time'),
                record.get('end_time'),
                _to_float(record.get('quantitative')),
                _to_float(record.get('min_value')),
                _to_float(record.get('max_value')),
                _to_float(record.get('duration_min')),
                _to_float(record.get('deviation')),
                record.get('status'),
                record.get('decision_reason'),
                record.get('decision_text'),
                record.get('measure_text'),
                record.get('analysis_text'),
                record.get('capa_action'),
                _to_float(record.get('capa_confidence')),
                record.get('trend_text'),
                json.dumps(record.get('payload_json', {}), default=str),
            ),
        )


def _fetch_recent(conn: sqlite3.Connection, product: str, characteristic: Optional[str], limit: int) -> pd.DataFrame:
    params: List[object] = [product]
    sql = (
        'SELECT event_time, batch, product, characteristic, quantitative, min_value, max_value, '
        'deviation, status, decision_text, measure_text, analysis_text, capa_action '
        'FROM quality_history WHERE product = ?'
    )
    if characteristic:
        sql += ' AND characteristic = ?'
        params.append(characteristic)
    sql += ' ORDER BY event_time DESC LIMIT ?'
    params.append(limit)
    return pd.read_sql_query(sql, conn, params=params)


def build_trend_summary(product: str, characteristic: Optional[str] = None, limit: int = 8) -> Dict[str, object]:
    with _connect() as conn:
        params: List[object] = [product]
        where_clause = 'WHERE product = ?'
        if characteristic:
            where_clause += ' AND characteristic = ?'
            params.append(characteristic)

        stats = pd.read_sql_query(
            f'''
            SELECT
                COUNT(*) AS total_rows,
                SUM(CASE WHEN status = 'R' THEN 1 ELSE 0 END) AS reject_rows,
                AVG(quantitative) AS avg_quantitative,
                AVG(deviation) AS avg_deviation
            FROM quality_history
            {where_clause}
            ''',
            conn,
            params=params,
        ).iloc[0].to_dict()

        recent_df = _fetch_recent(conn, product, characteristic, limit)
        recent_df = recent_df.iloc[::-1].reset_index(drop=True) if not recent_df.empty else recent_df

        char_df = pd.read_sql_query(
            '''
            SELECT
                characteristic,
                COUNT(*) AS total_rows,
                SUM(CASE WHEN status = 'R' THEN 1 ELSE 0 END) AS reject_rows,
                AVG(quantitative) AS avg_quantitative,
                AVG(deviation) AS avg_deviation
            FROM quality_history
            WHERE product = ? AND characteristic IS NOT NULL AND characteristic != ''
            GROUP BY characteristic
            ORDER BY total_rows DESC, reject_rows DESC
            ''',
            conn,
            params=[product],
        )

    total_rows = int(stats.get('total_rows') or 0)
    reject_rows = int(stats.get('reject_rows') or 0)
    reject_rate = (reject_rows / total_rows) if total_rows else 0.0
    trend_text = f'{product} has {total_rows} recorded checks and a reject rate of {reject_rate:.1%}.'

    if characteristic:
        values = recent_df['quantitative'].dropna().astype(float).tolist() if not recent_df.empty else []
        if len(values) >= 2:
            delta = values[-1] - values[0]
            direction = 'stable' if abs(delta) < 0.01 else ('rising' if delta > 0 else 'falling')
            trend_text = (
                f'{product} / {characteristic} is {direction} by {delta:+.2f} across the last {len(values)} records. '
                f'This slice has {total_rows} rows and a reject rate of {reject_rate:.1%}.'
            )
        else:
            trend_text = (
                f'{product} / {characteristic} has {total_rows} rows and a reject rate of {reject_rate:.1%}. '
                'There are not enough recent points yet to compute a direction.'
            )
    elif not char_df.empty:
        top_row = char_df.iloc[0]
        top_rate = (float(top_row['reject_rows'] or 0) / float(top_row['total_rows'] or 1)) if top_row['total_rows'] else 0.0
        trend_text = (
            f'{product} has {total_rows} rows and a reject rate of {reject_rate:.1%}. '
            f'The most active characteristic is {top_row["characteristic"]} with a reject rate of {top_rate:.1%}.'
        )

    recent_rows = []
    if not recent_df.empty:
        for _, row in recent_df.iterrows():
            recent_rows.append(
                {
                    'event_time': _to_text(row.get('event_time')),
                    'batch': _to_text(row.get('batch')),
                    'characteristic': _to_text(row.get('characteristic')),
                    'quantitative': _to_float(row.get('quantitative')),
                    'min_value': _to_float(row.get('min_value')),
                    'max_value': _to_float(row.get('max_value')),
                    'deviation': _to_float(row.get('deviation')),
                    'status': _to_text(row.get('status')),
                    'decision_text': _to_text(row.get('decision_text')),
                    'measure_text': _to_text(row.get('measure_text')),
                    'analysis_text': _to_text(row.get('analysis_text')),
                    'capa_action': _to_text(row.get('capa_action')),
                }
            )

    return {
        'product': product,
        'characteristic': characteristic,
        'total_rows': total_rows,
        'reject_rows': reject_rows,
        'reject_rate': reject_rate,
        'avg_quantitative': _to_float(stats.get('avg_quantitative')),
        'avg_deviation': _to_float(stats.get('avg_deviation')),
        'trend_text': trend_text,
        'recent_rows': recent_rows,
        'characteristic_summary': [
            {
                'characteristic': _to_text(row['characteristic']),
                'total_rows': int(row['total_rows'] or 0),
                'reject_rows': int(row['reject_rows'] or 0),
                'reject_rate': (float(row['reject_rows'] or 0) / float(row['total_rows'] or 1)) if row['total_rows'] else 0.0,
                'avg_quantitative': _to_float(row['avg_quantitative']),
                'avg_deviation': _to_float(row['avg_deviation']),
            }
            for _, row in char_df.head(6).iterrows()
        ],
    }


def get_batch_trend(batch: str, limit: int = 100) -> Dict[str, object]:
    """Fetch trend data for a specific batch/tablet across time."""
    with _connect() as conn:
        df = pd.read_sql_query(
            '''
            SELECT * FROM quality_history 
            WHERE batch = ? 
            ORDER BY event_time DESC 
            LIMIT ?
            ''',
            conn,
            params=[batch, limit],
        )
    
    if df.empty:
        return {
            'batch': batch,
            'total_records': 0,
            'records': [],
            'message': 'No records found for this batch.',
        }
    
    records = []
    for _, row in df.iterrows():
        records.append({
            'event_time': _to_text(row.get('event_time')),
            'product': _to_text(row.get('product')),
            'characteristic': _to_text(row.get('characteristic')),
            'quantitative': _to_float(row.get('quantitative')),
            'status': _to_text(row.get('status')),
            'decision_reason': _to_text(row.get('decision_reason')),
            'decision_text': _to_text(row.get('decision_text')),
            'measure_text': _to_text(row.get('measure_text')),
            'analysis_text': _to_text(row.get('analysis_text')),
            'capa_action': _to_text(row.get('capa_action')),
        })
    
    return {
        'batch': batch,
        'total_records': len(records),
        'records': records,
    }