import os
import glob
import pandas as pd
import numpy as np
import joblib
from dotenv import load_dotenv
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, precision_score, recall_score, f1_score

# Load KAGGLE_USERNAME and KAGGLE_KEY from .env
load_dotenv()


def get_paysim_dataframe() -> pd.DataFrame:
    """
    Downloads and loads the PaySim dataset using Kaggle API / kagglehub.
    Falls back to local data/paysim.csv if present.
    """
    local_path = "data/paysim.csv"
    if os.path.exists(local_path):
        print(f"Loading PaySim dataset from local file: {local_path}")
        return pd.read_csv(local_path)

    print("Local CSV not found. Fetching PaySim dataset via Kaggle API...")
    try:
        import kagglehub
        # Downloads PaySim dataset from Kaggle Hub
        path = kagglehub.dataset_download("ealaxi/paysim1")
        print(f"Dataset downloaded to Kaggle cache: {path}")

        # Find the CSV file in the downloaded path
        csv_files = glob.glob(os.path.join(path, "*.csv"))
        if not csv_files:
            raise FileNotFoundError("No CSV file found in downloaded Kaggle dataset package.")

        target_csv = csv_files[0]
        print(f"Loading dataset from: {target_csv}")
        return pd.read_csv(target_csv)

    except ImportError:
        print("kagglehub package not found. Attempting download via official Kaggle API...")
        from kaggle.api.kaggle_api_extended import KaggleApi
        
        api = KaggleApi()
        api.authenticate()
        
        os.makedirs("data", exist_ok=True)
        api.dataset_download_files("ealaxi/paysim1", path="data", unzip=True)
        
        csv_files = glob.glob("data/*.csv")
        return pd.read_csv(csv_files[0])


def train_and_save_model():
    model_dir = "models"
    model_path = os.path.join(model_dir, "paysim_fraud_model.pkl")

    # Fetch dataset via Kaggle
    df = get_paysim_dataframe()

    print(f"Raw dataset shape: {df.shape}")

    # PaySim fraud occurs in TRANSFER and CASH_OUT transactions
    df = df[df["type"].isin(["TRANSFER", "CASH_OUT"])].copy()

    # Feature Engineering for PaySim
    df["balance_diff_org"] = df["oldbalanceOrg"] - df["newbalanceOrig"]
    df["balance_diff_dest"] = df["newbalanceDest"] - df["oldbalanceDest"]
    df["is_exact_drain"] = (df["oldbalanceOrg"] == df["amount"]).astype(int)
    df["is_zero_dest_before"] = (df["oldbalanceDest"] == 0.0).astype(int)

    features = [
        "amount",
        "oldbalanceOrg",
        "newbalanceOrig",
        "oldbalanceDest",
        "newbalanceDest",
        "balance_diff_org",
        "balance_diff_dest",
        "is_exact_drain",
        "is_zero_dest_before",
    ]
    target = "isFraud"

    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    neg_count, pos_count = np.bincount(y_train)
    scale_weight = neg_count / pos_count

    print("Training XGBoost Fraud Classifier...")
    model = XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.1,
        scale_pos_weight=scale_weight,
        random_state=42,
        eval_metric="logloss"
    )

    model.fit(X_train, y_train)

    # Model Evaluation
    y_pred = model.predict(X_test)
    print("\n--- Model Evaluation Results ---")
    print(classification_report(y_test, y_pred))

    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    print(f"Precision: {precision:.4f} | Recall: {recall:.4f} | F1-Score: {f1:.4f}")

    # Save trained model artifact
    os.makedirs(model_dir, exist_ok=True)
    joblib.dump(model, model_path)
    print(f"\nModel successfully saved to '{model_path}'")


if __name__ == "__main__":
    train_and_save_model()