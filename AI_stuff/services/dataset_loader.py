import os
import pandas as pd
from kaggle.api.kaggle_api_extended import KaggleApi

DATASET_NAME = "ealaxi/paysim1"
DATA_DIR = "tests/data"
CSV_PATH = os.path.join(DATA_DIR, "PS_20174392719_1491204439457_log.csv")

def download_paysim_dataset():
    """Downloads and extracts PaySim dataset if not locally present."""
    if os.path.exists(CSV_PATH):
        return CSV_PATH

    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        api = KaggleApi()
        api.authenticate()
        api.dataset_download_files(DATASET_NAME, path=DATA_DIR, unzip=True)
    except Exception as e:
        print(f"Kaggle API load note: {str(e)}")
    return CSV_PATH

def load_paysim_test_cases(limit: int = 10):
    """Loads PaySim dataset transactions and converts them into natural language prompts."""
    csv_file = download_paysim_dataset()
    if not os.path.exists(csv_file):
        return []

    df = pd.read_csv(csv_file)
    df_filtered = df[df["type"].isin(["TRANSFER", "CASH_OUT"])].head(limit)
    
    test_cases = []
    for idx, row in df_filtered.iterrows():
        prompt = (
            f"Please {row['type'].lower()} ${row['amount']:.2f} "
            f"from account {row['nameOrig']} to account {row['nameDest']}."
        )
        test_cases.append({
            "case_id": f"PAYSIM-{idx}",
            "user_id": str(row["nameOrig"]),
            "session_id": f"SESS-PAYSIM-{idx}",
            "raw_prompt": prompt,
            "actual_amount": float(row["amount"]),
            "is_fraud_label": bool(row["isFraud"])
        })
    return test_cases