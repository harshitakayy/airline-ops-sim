
import argparse
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd


REQUIRED_COLUMNS = [
    "FL_DATE",
    "MKT_UNIQUE_CARRIER",
    "OP_CARRIER",
    "ORIGIN_AIRPORT_ID",
    "DEST_AIRPORT_ID",
    "CRS_DEP_TIME",
    "CRS_ARR_TIME",
    "ARR_DELAY",
    "CANCELLED",
    "DIVERTED",
    "DISTANCE",
]


def parse_scheduled_time(series):
    values = pd.to_numeric(series, errors="coerce")
    values = values.mask(values == 2400, 0)

    hours = np.floor(values / 100)
    minutes = values % 100

    valid = (
        values.notna()
        & (hours >= 0)
        & (hours <= 23)
        & (minutes >= 0)
        & (minutes <= 59)
    )

    result = pd.Series(np.nan, index=series.index, dtype=float)
    result.loc[valid] = (
        hours.loc[valid] * 60 + minutes.loc[valid]
    )

    return result


def read_dataset(input_path):
    suffix = input_path.suffix.lower()

    if suffix == ".csv":
        return pd.read_csv(input_path, low_memory=False)

    if suffix == ".zip":
        with zipfile.ZipFile(input_path) as archive:
            csv_files = [
                name for name in archive.namelist()
                if name.lower().endswith(".csv")
            ]

            if len(csv_files) != 1:
                raise ValueError(
                    "Expected exactly one CSV inside the ZIP."
                )

            with archive.open(csv_files[0]) as csv_file:
                return pd.read_csv(csv_file, low_memory=False)

    raise ValueError("Input file must be a .csv or .zip file.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_file", help="Path to BTS CSV or ZIP")
    parser.add_argument(
        "--output",
        default="ml/data/bts_2026_jan_clean.csv",
        help="Output CSV path",
    )
    args = parser.parse_args()

    input_path = Path(args.input_file)
    output_path = Path(args.output)

    if not input_path.exists():
        raise FileNotFoundError(
            f"Input file not found: {input_path.resolve()}\n"
            "Move the downloaded file into ml/data or provide "
            "its correct path."
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)

    df = read_dataset(input_path)

    df.columns = df.columns.str.strip().str.upper()

    missing_columns = [
        col for col in REQUIRED_COLUMNS
        if col not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}\n"
            f"Columns found: {df.columns.tolist()}"
        )

    original_rows = len(df)

    df["FL_DATE"] = pd.to_datetime(
    df["FL_DATE"],
    format="%m/%d/%Y",
    errors="coerce",
    )

    for column in [
        "ARR_DELAY",
        "CANCELLED",
        "DIVERTED",
        "DISTANCE",
        "CRS_DEP_TIME",
        "CRS_ARR_TIME",
    ]:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    df["CRS_DEP_MINUTE"] = parse_scheduled_time(
        df["CRS_DEP_TIME"]
    )

    df["CRS_ARR_MINUTE"] = parse_scheduled_time(
        df["CRS_ARR_TIME"]
    )

    for column in [
        "ORIGIN_AIRPORT_ID",
        "DEST_AIRPORT_ID",
    ]:
        df[column] = df[column].astype("string")

    for column in [
        "MKT_UNIQUE_CARRIER",
        "OP_CARRIER",
    ]:
        df[column] = (
            df[column]
            .astype("string")
            .str.strip()
            .replace("", pd.NA)
        )

    usable = df.loc[
        (df["CANCELLED"] == 0)
        & (df["DIVERTED"] == 0)
        & df["ARR_DELAY"].notna()
        & df["FL_DATE"].notna()
        & df["CRS_DEP_MINUTE"].notna()
        & df["CRS_ARR_MINUTE"].notna()
        & df["DISTANCE"].notna()
        & df["OP_CARRIER"].notna()
        & df["ORIGIN_AIRPORT_ID"].notna()
        & df["DEST_AIRPORT_ID"].notna()
    ].copy()

    usable["flight_month"] = usable["FL_DATE"].dt.month
    usable["flight_day"] = usable["FL_DATE"].dt.day
    usable["day_of_week"] = usable["FL_DATE"].dt.dayofweek

    usable["delayed30Min"] = (
        usable["ARR_DELAY"] >= 30
    ).astype("int8")

    feature_columns = [
        "OP_CARRIER",
        "MKT_UNIQUE_CARRIER",
        "ORIGIN_AIRPORT_ID",
        "DEST_AIRPORT_ID",
        "CRS_DEP_MINUTE",
        "CRS_ARR_MINUTE",
        "DISTANCE",
        "flight_month",
        "flight_day",
        "day_of_week",
    ]

    output_columns = [
        "FL_DATE",
        *feature_columns,
        "ARR_DELAY",
        "delayed30Min",
    ]

    cleaned = usable[output_columns].copy()

    cleaned = cleaned.sort_values(
        "FL_DATE"
    ).reset_index(drop=True)

    cleaned.to_csv(output_path, index=False)

    positive_count = int(cleaned["delayed30Min"].sum())
    negative_count = len(cleaned) - positive_count

    print("\nDataset preparation complete")
    print(f"Original rows: {original_rows:,}")
    print(f"Usable rows: {len(cleaned):,}")
    print(f"Removed rows: {original_rows - len(cleaned):,}")
    print(f"Delayed >= 30 min: {positive_count:,}")
    print(f"Not delayed >= 30 min: {negative_count:,}")

    if len(cleaned):
        print(
            f"Positive rate: {cleaned['delayed30Min'].mean():.2%}"
        )
        print(
            f"Date range: {cleaned['FL_DATE'].min().date()} "
            f"to {cleaned['FL_DATE'].max().date()}"
        )

    print(f"Output: {output_path.resolve()}")
    print("\nFeatures used:")
    for column in feature_columns:
        print(f"- {column}")

    print(
        "\nARR_DELAY is retained for analysis but must not "
        "be used as a classifier input."
    )


if __name__ == "__main__":
    main()
