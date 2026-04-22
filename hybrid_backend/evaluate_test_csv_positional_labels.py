import os

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from hybrid_core import classification_metrics


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'artifacts')
PRED_CSV = os.path.join(BASE_DIR, 'hybrid_test_predictions.csv')
OUT_CSV = os.path.join(ARTIFACTS_DIR, 'testcsv_positional_metrics.csv')
OUT_PNG = os.path.join(ARTIFACTS_DIR, 'testcsv_positional_metrics.png')


def status_to_binary(series: pd.Series) -> np.ndarray:
    return (series.astype(str).str.upper() == 'R').astype(int).to_numpy()


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
    ax.set_title('Metrics on test.csv using positional labels (first half A, second half R)')
    ax.legend(ncol=4, loc='upper center', bbox_to_anchor=(0.5, 1.15))

    fig.tight_layout()
    fig.savefig(out_path, dpi=180)
    plt.close(fig)


def main() -> None:
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    if not os.path.exists(PRED_CSV):
        raise FileNotFoundError(
            f'Missing {PRED_CSV}. Run run_hybrid_inference.py first to generate predictions.'
        )

    pred_df = pd.read_csv(PRED_CSV)
    n = len(pred_df)
    if n == 0:
        raise ValueError('hybrid_test_predictions.csv is empty.')

    half = n // 2
    y_true = np.array(([0] * half) + ([1] * (n - half)), dtype=int)

    latest_pred = status_to_binary(pred_df['LatestStatus'])
    rf_pred = status_to_binary(pred_df['RFStatus'])
    hybrid_pred = status_to_binary(pred_df['HybridStatus'])

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
    out_df.to_csv(OUT_CSV, index=False)
    save_metrics_png(out_df, OUT_PNG)

    print(f'Rows in test predictions: {n}')
    print(f'Pseudo labels used: first {half} rows = Accept(0), last {n-half} rows = Reject(1)')
    print('Metrics (positional labels on test.csv):')
    print('- sid    :', m_latest)
    print('- rf     :', m_rf)
    print('- hybrid :', m_hybrid)
    print('\nSaved:', OUT_CSV)
    print('Saved:', OUT_PNG)


if __name__ == '__main__':
    main()
