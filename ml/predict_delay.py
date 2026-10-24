
from pathlib import Path
from typing import Any
import argparse
import json
import sys

import joblib
import pandas as pd


ARTIFACT_PATH = (
    Path(__file__).resolve().parent
    / "artifacts"
    / "flight_delay_model.joblib"
)


def load_artifact() -> dict[str, Any]:
    if not ARTIFACT_PATH.exists():
        raise FileNotFoundError(
            f"Model artifact not found at {ARTIFACT_PATH}. "
            "Train the model first using python ml/flight_delay_ml.py."
        )

    return joblib.load(ARTIFACT_PATH)


def predict_delay_probability(features: dict[str, Any]) -> float:
    artifact = load_artifact()
    feature_columns = artifact["feature_columns"]

    missing = [
        name for name in feature_columns
        if name not in features
    ]

    if missing:
        raise ValueError(
            "Missing required model features: "
            + ", ".join(missing)
        )

    row = pd.DataFrame(
        [{name: features[name] for name in feature_columns}],
        columns=feature_columns,
    )

    raw_probability = float(
        artifact["model"].predict_proba(row)[0, 1]
    )

    calibrated_probability = float(
        artifact["calibrator"].predict([raw_probability])[0]
    )

    return max(0.0, min(1.0, calibrated_probability))


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Predict the calibrated probability of an arrival delay "
            "of at least 30 minutes."
        )
    )

    feature_group = parser.add_mutually_exclusive_group(
        required=True
    )

    feature_group.add_argument(
        "--features",
        help="Path to a JSON file containing model features.",
    )

    feature_group.add_argument(
        "--features-json",
        help="Model features supplied as a JSON object.",
    )

    parser.add_argument(
        "--json",
        action="store_true",
        help="Return the prediction as JSON.",
    )

    args = parser.parse_args()

    try:
        if args.features_json is not None:
            features = json.loads(args.features_json)
        else:
            with open(
                args.features,
                "r",
                encoding="utf-8",
            ) as file:
                features = json.load(file)

        if not isinstance(features, dict):
            raise ValueError(
                "Model features must be a JSON object."
            )

        probability = predict_delay_probability(features)

        if args.json:
            print(
                json.dumps(
                    {
                        "probability": probability,
                        "target": "arrival delay >= 30 minutes",
                        "dataset": "US domestic flights, 2015",
                    }
                )
            )
        else:
            print(
                "Calibrated probability of 30+ minute delay: "
                f"{probability:.2%}"
            )

    except Exception as error:
        if args.json:
            print(json.dumps({"error": str(error)}))
        else:
            print(f"Prediction failed: {error}", file=sys.stderr)

        raise SystemExit(2)


if __name__ == "__main__":
    main()
