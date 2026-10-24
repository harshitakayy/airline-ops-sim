import pandas as pd
import numpy as np
import joblib
from pathlib import Path



from sklearn.compose import ColumnTransformer

from sklearn.ensemble import RandomForestClassifier

from sklearn.impute import SimpleImputer

from sklearn.isotonic import IsotonicRegression

from sklearn.metrics import (

    accuracy_score,

    precision_score,

    recall_score,

    f1_score,

    confusion_matrix,

    brier_score_loss,

    log_loss,

)

from sklearn.pipeline import Pipeline

from sklearn.preprocessing import OneHotEncoder

from sklearn.calibration import calibration_curve





# ============================================================

# CONFIGURATION

# ============================================================



DATA_PATH = "ml/data/flights.csv"



RANDOM_STATE = 42

TRAIN_SAMPLE_SIZE = 250_000



DELAY_THRESHOLD_MINUTES = 30



RF_ESTIMATORS = 150

RF_MAX_DEPTH = 15

RF_MIN_SAMPLES_LEAF = 10





# ============================================================

# LOAD DATA

# ============================================================



print("\nLoading dataset...")



df = pd.read_csv(

    DATA_PATH,

    low_memory=False

)



print(f"Original dataset shape: {df.shape}")





# ============================================================

# BASIC FILTERING

# ============================================================



# For the first model we only predict delay for flights

# that actually operate.



df = df[

    (df["CANCELLED"] == 0) &

    (df["DIVERTED"] == 0)

].copy()



print(

    f"After removing cancelled/diverted flights: "

    f"{df.shape}"

)





# ============================================================

# TARGET

# ============================================================



# Significant delay = arrival delay >= 30 minutes



df["delayed"] = (

    df["ARRIVAL_DELAY"] >= DELAY_THRESHOLD_MINUTES

).astype(int)



print("\nTarget distribution:")



print(

    df["delayed"].value_counts(

        normalize=True

    )

)





# ============================================================

# BASIC FEATURE ENGINEERING

# ============================================================



df["departure_hour"] = (

    df["SCHEDULED_DEPARTURE"] // 100

).astype(int)





df["departure_minute"] = (

    df["SCHEDULED_DEPARTURE"] % 100

).astype(int)





# Route



df["route"] = (

    df["ORIGIN_AIRPORT"].astype(str)

    + "_"

    + df["DESTINATION_AIRPORT"].astype(str)

)





# ============================================================

# SCHEDULED DATETIME

# ============================================================



df["scheduled_datetime"] = pd.to_datetime(

    df["YEAR"].astype(str)

    + "-"

    + df["MONTH"].astype(str).str.zfill(2)

    + "-"

    + df["DAY"].astype(str).str.zfill(2)

    + " "

    + (

        (df["SCHEDULED_DEPARTURE"] // 100)

        .astype(int)

        .astype(str)

        .str.zfill(2)

    )

    + ":"

    + (

        (df["SCHEDULED_DEPARTURE"] % 100)

        .astype(int)

        .astype(str)

        .str.zfill(2)

    )

)





# ============================================================

# SORT CHRONOLOGICALLY

# ============================================================



df = df.sort_values(

    "scheduled_datetime"

).reset_index(drop=True)





# ============================================================

# HISTORICAL ROUTE DELAY RATE

# ============================================================



print(

    "\nCreating historical route delay feature..."

)





# Aggregate flights with identical route + scheduled timestamp

# before calculating historical statistics.



route_time_stats = (

    df.groupby(

        [

            "route",

            "scheduled_datetime"

        ],

        sort=False

    )["delayed"]

    .agg(

        route_time_delays="sum",

        route_time_flights="count"

    )

    .reset_index()

)





route_time_stats = route_time_stats.sort_values(

    [

        "route",

        "scheduled_datetime"

    ]

)





# Cumulative historical values BEFORE the current timestamp.



route_time_stats["prior_route_delays"] = (

    route_time_stats

    .groupby("route")["route_time_delays"]

    .cumsum()

    .shift(1)

    .fillna(0)

)





route_time_stats["prior_route_flights"] = (

    route_time_stats

    .groupby("route")["route_time_flights"]

    .cumsum()

    .shift(1)

    .fillna(0)

)





route_time_stats["route_delay_rate"] = np.where(

    route_time_stats["prior_route_flights"] > 0,

    route_time_stats["prior_route_delays"]

    / route_time_stats["prior_route_flights"],

    np.nan

)





df = df.merge(

    route_time_stats[

        [

            "route",

            "scheduled_datetime",

            "route_delay_rate"

        ]

    ],

    on=[

        "route",

        "scheduled_datetime"

    ],

    how="left"

)





# Global fallback



global_delay_rate = df["delayed"].mean()



df["route_delay_rate"] = (

    df["route_delay_rate"]

    .fillna(global_delay_rate)

)





print(

    f"Global historical delay rate: "

    f"{global_delay_rate:.4f}"

)



print(

    "Missing route delay rates:",

    df["route_delay_rate"].isna().sum()

)





# ============================================================

# PREVIOUS AIRCRAFT DELAY

# ============================================================



print(

    "\nCreating previous-aircraft features..."

)





# Previous flight operated by the same aircraft.



df["previous_aircraft_delay"] = (

    df.groupby("TAIL_NUMBER")["delayed"]

    .shift(1)

)





df["previous_aircraft_delay_minutes"] = (

    df.groupby("TAIL_NUMBER")["ARRIVAL_DELAY"]

    .shift(1)

)





print(

    "Missing previous-aircraft delay:",

    df["previous_aircraft_delay"].isna().mean()

)





print(

    "Missing previous-aircraft delay minutes:",

    df["previous_aircraft_delay_minutes"].isna().mean()

)





# ============================================================

# CHRONOLOGICAL TRAIN / VALIDATION / TEST SPLIT

# ============================================================



# January - September -> training

# October            -> calibration

# November           -> validation / threshold selection

# December           -> final untouched test



train_df = df[

    df["MONTH"] <= 9

].copy()





validation_df = df[

    df["MONTH"].isin([10, 11])

].copy()





test_df = df[

    df["MONTH"] == 12

].copy()





print("\nChronological split:")



print(

    f"Train:      {len(train_df):,}"

)



print(

    f"Validation: {len(validation_df):,}"

)



print(

    f"Test:       {len(test_df):,}"

)





# ============================================================

# FEATURE SET

# ============================================================



numeric_features = [

    "YEAR",

    "MONTH",

    "DAY",

    "DAY_OF_WEEK",

    "FLIGHT_NUMBER",

    "SCHEDULED_DEPARTURE",

    "departure_hour",

    "departure_minute",

    "SCHEDULED_TIME",

    "DISTANCE",

    "route_delay_rate",

    "previous_aircraft_delay",

    "previous_aircraft_delay_minutes",

]





categorical_features = [

    "AIRLINE",

    "ORIGIN_AIRPORT",

    "DESTINATION_AIRPORT",

]





feature_columns = (

    numeric_features

    + categorical_features

)





# ============================================================

# TRAINING DATA

# ============================================================



X_train = train_df[

    feature_columns

]



y_train = train_df[

    "delayed"

]





# ============================================================

# TRAINING SAMPLE

# ============================================================



if len(X_train) > TRAIN_SAMPLE_SIZE:



    sample_indices = (

        train_df

        .sample(

            n=TRAIN_SAMPLE_SIZE,

            random_state=RANDOM_STATE

        )

        .index

    )



    X_train_model = train_df.loc[

        sample_indices,

        feature_columns

    ]



    y_train_model = train_df.loc[

        sample_indices,

        "delayed"

    ]



else:



    X_train_model = X_train

    y_train_model = y_train





print(

    f"\nRandom Forest training rows: "

    f"{len(X_train_model):,}"

)





# ============================================================

# PREPROCESSING

# ============================================================



numeric_pipeline = Pipeline(

    steps=[

        (

            "imputer",

            SimpleImputer(

                strategy="median"

            )

        )

    ]

)





categorical_pipeline = Pipeline(

    steps=[

        (

            "imputer",

            SimpleImputer(

                strategy="most_frequent"

            )

        ),

        (

            "onehot",

            OneHotEncoder(

                handle_unknown="ignore"

            )

        )

    ]

)





preprocessor = ColumnTransformer(

    transformers=[

        (

            "num",

            numeric_pipeline,

            numeric_features

        ),

        (

            "cat",

            categorical_pipeline,

            categorical_features

        )

    ]

)





# ============================================================

# RANDOM FOREST

# ============================================================



model = Pipeline(

    steps=[

        (

            "preprocessor",

            preprocessor

        ),

        (

            "classifier",

            RandomForestClassifier(

                n_estimators=RF_ESTIMATORS,

                max_depth=RF_MAX_DEPTH,

                min_samples_leaf=RF_MIN_SAMPLES_LEAF,

                class_weight="balanced",

                random_state=RANDOM_STATE,

                n_jobs=-1

            )

        )

    ]

)





print(

    "\nTraining Random Forest..."

)





model.fit(

    X_train_model,

    y_train_model

)





print(

    "Training complete."

)





# ============================================================

# CLASSIFICATION METRICS HELPER

# ============================================================



def print_metrics(

    y_true,

    probabilities,

    threshold=0.5,

    title=""

):



    predictions = (

        probabilities >= threshold

    ).astype(int)





    accuracy = accuracy_score(

        y_true,

        predictions

    )





    precision = precision_score(

        y_true,

        predictions,

        zero_division=0

    )





    recall = recall_score(

        y_true,

        predictions,

        zero_division=0

    )





    f1 = f1_score(

        y_true,

        predictions,

        zero_division=0

    )





    cm = confusion_matrix(

        y_true,

        predictions

    )





    print(

        f"\n{title}"

    )



    print(

        f"Threshold: {threshold:.2f}"

    )



    print(

        f"Accuracy:  {accuracy:.4f}"

    )



    print(

        f"Precision: {precision:.4f}"

    )



    print(

        f"Recall:    {recall:.4f}"

    )



    print(

        f"F1:        {f1:.4f}"

    )



    print(

        "Confusion matrix:"

    )



    print(cm)





    return {

        "accuracy": accuracy,

        "precision": precision,

        "recall": recall,

        "f1": f1

    }





# ============================================================

# OCTOBER = CALIBRATION

# NOVEMBER = VALIDATION

# ============================================================



october_df = validation_df[

    validation_df["MONTH"] == 10

].copy()





november_df = validation_df[

    validation_df["MONTH"] == 11

].copy()





X_october = october_df[

    feature_columns

]



y_october = october_df[

    "delayed"

]





X_november = november_df[

    feature_columns

]



y_november = november_df[

    "delayed"

]





print(

    "\nValidation split:"

)



print(

    f"October calibration set: "

    f"{len(october_df):,}"

)



print(

    f"November evaluation set: "

    f"{len(november_df):,}"

)





# ============================================================

# RAW RANDOM FOREST PROBABILITIES

# ============================================================



print(

    "\nGenerating Random Forest probabilities..."

)





october_raw_probabilities = (

    model

    .predict_proba(

        X_october

    )[:, 1]

)





november_raw_probabilities = (

    model

    .predict_proba(

        X_november

    )[:, 1]

)





# ============================================================

# ISOTONIC CALIBRATION

# ============================================================



print(

    "\nFitting isotonic probability calibration..."

)





calibrator = IsotonicRegression(

    out_of_bounds="clip"

)





calibrator.fit(

    october_raw_probabilities,

    y_october

)





november_calibrated_probabilities = (

    calibrator.predict(

        november_raw_probabilities

    )

)





# ============================================================

# CALIBRATION QUALITY

# ============================================================



raw_brier = brier_score_loss(

    y_november,

    november_raw_probabilities

)





calibrated_brier = brier_score_loss(

    y_november,

    november_calibrated_probabilities

)





raw_log_loss = log_loss(

    y_november,

    november_raw_probabilities,

    labels=[0, 1]

)





calibrated_log_loss = log_loss(

    y_november,

    november_calibrated_probabilities,

    labels=[0, 1]

)





print(

    "\nProbability calibration results:"

)



print(

    f"Raw RF Brier score:        "

    f"{raw_brier:.6f}"

)



print(

    f"Calibrated Brier score:    "

    f"{calibrated_brier:.6f}"

)



print(

    f"Raw RF log loss:           "

    f"{raw_log_loss:.6f}"

)



print(

    f"Calibrated log loss:       "

    f"{calibrated_log_loss:.6f}"

)





# ============================================================

# CALIBRATION CURVE

# ============================================================



raw_fraction_positive, raw_mean_predicted = (

    calibration_curve(

        y_november,

        november_raw_probabilities,

        n_bins=10,

        strategy="quantile"

    )

)





calibrated_fraction_positive, calibrated_mean_predicted = (

    calibration_curve(

        y_november,

        november_calibrated_probabilities,

        n_bins=10,

        strategy="quantile"

    )

)





print(

    "\nCalibration curve:"

)





print(

    "\nRaw RF:"

)



print(

    "Predicted probability | Actual delay rate"

)





for predicted, actual in zip(

    raw_mean_predicted,

    raw_fraction_positive

):



    print(

        f"{predicted:.4f}               | "

        f"{actual:.4f}"

    )





print(

    "\nCalibrated RF:"

)



print(

    "Predicted probability | Actual delay rate"

)





for predicted, actual in zip(

    calibrated_mean_predicted,

    calibrated_fraction_positive

):



    print(

        f"{predicted:.4f}               | "

        f"{actual:.4f}"

    )





# ============================================================

# RAW RANDOM FOREST AT 0.50

# ============================================================



print(

    "\n" + "=" * 60

)



print(

    "RAW RANDOM FOREST"

)



print(

    "=" * 60

)





print_metrics(

    y_november,

    november_raw_probabilities,

    threshold=0.50,

    title="Raw RF at threshold 0.50"

)





# ============================================================

# CALIBRATED RANDOM FOREST AT 0.50

# ============================================================



print(

    "\n" + "=" * 60

)



print(

    "CALIBRATED RANDOM FOREST"

)



print(

    "=" * 60

)





print_metrics(

    y_november,

    november_calibrated_probabilities,

    threshold=0.50,

    title="Calibrated RF at threshold 0.50"

)





# ============================================================

# THRESHOLD ANALYSIS

# ============================================================



print(

    "\n" + "=" * 60

)



print(

    "CALIBRATED PROBABILITY THRESHOLD ANALYSIS"

)



print(

    "=" * 60

)





threshold_results = []





for threshold in np.arange(

    0.20,

    0.81,

    0.05

):



    predictions = (

        november_calibrated_probabilities

        >= threshold

    ).astype(int)





    accuracy = accuracy_score(

        y_november,

        predictions

    )





    precision = precision_score(

        y_november,

        predictions,

        zero_division=0

    )





    recall = recall_score(

        y_november,

        predictions,

        zero_division=0

    )





    f1 = f1_score(

        y_november,

        predictions,

        zero_division=0

    )





    threshold_results.append(

        {

            "threshold": threshold,

            "accuracy": accuracy,

            "precision": precision,

            "recall": recall,

            "f1": f1

        }

    )





threshold_table = pd.DataFrame(

    threshold_results

)





print(

    threshold_table.to_string(

        index=False

    )

)





# ============================================================

# BEST VALIDATION THRESHOLD

# ============================================================



best_row = threshold_table.loc[

    threshold_table["f1"].idxmax()

]





best_threshold = float(

    best_row["threshold"]

)





print(

    "\nBest calibrated F1 threshold:"

)



print(

    f"{best_threshold:.2f}"

)





print_metrics(

    y_november,

    november_calibrated_probabilities,

    threshold=best_threshold,

    title="Best calibrated threshold"

)





# ============================================================

# FEATURE IMPORTANCE

# ============================================================



print(

    "\n" + "=" * 60

)



print(

    "FEATURE IMPORTANCE"

)



print(

    "=" * 60

)





trained_preprocessor = (

    model.named_steps[

        "preprocessor"

    ]

)





trained_classifier = (

    model.named_steps[

        "classifier"

    ]

)





feature_names = (

    trained_preprocessor

    .get_feature_names_out()

)





importances = (

    trained_classifier

    .feature_importances_

)





importance_df = pd.DataFrame(

    {

        "feature": feature_names,

        "importance": importances

    }

).sort_values(

    "importance",

    ascending=False

)





print(

    "\nTop 20 model features:"

)





print(

    importance_df

    .head(20)

    .to_string(

        index=False

    )

)





# ============================================================

# ORIGINAL FEATURE-GROUP IMPORTANCE

# ============================================================



original_feature_importance = []





for feature in numeric_features:



    transformed_name = (

        f"num__{feature}"

    )





    matching = importance_df[

        importance_df["feature"]

        == transformed_name

    ]





    importance = (

        matching["importance"].sum()

    )





    original_feature_importance.append(

        {

            "original_feature": feature,

            "importance": importance

        }

    )





for feature in categorical_features:



    prefix = (

        f"cat__{feature}_"

    )





    matching = importance_df[

        importance_df["feature"]

        .str.startswith(prefix)

    ]





    importance = (

        matching["importance"].sum()

    )





    original_feature_importance.append(

        {

            "original_feature": feature,

            "importance": importance

        }

    )





grouped_importance_df = (

    pd.DataFrame(

        original_feature_importance

    )

    .sort_values(

        "importance",

        ascending=False

    )

)





print(

    "\nOriginal feature-group importance:"

)





print(

    grouped_importance_df.to_string(

        index=False

    )

)





# ============================================================

# EXAMPLE CALIBRATED PROBABILITIES

# ============================================================



print(

    "\n" + "=" * 60

)



print(

    "EXAMPLE CALIBRATED PROBABILITIES"

)



print(

    "=" * 60

)





example_columns = [

    "AIRLINE",

    "ORIGIN_AIRPORT",

    "DESTINATION_AIRPORT",

    "FLIGHT_NUMBER",

    "previous_aircraft_delay",

    "previous_aircraft_delay_minutes",

    "route_delay_rate"

]





example_output = november_df[

    example_columns

].copy()





example_output[

    "raw_delay_probability"

] = november_raw_probabilities





example_output[

    "calibrated_delay_probability"

] = (

    november_calibrated_probabilities

)





example_output[

    "actual_delayed"

] = (

    y_november.values

)





print(

    example_output

    .head(20)

    .to_string(

        index=False

    )

)





# ============================================================

# VALIDATION PROBABILITY DISTRIBUTION

# ============================================================



print(

    "\nProbability distribution:"

)





print(

    f"Raw mean: "

    f"{november_raw_probabilities.mean():.4f}"

)





print(

    f"Calibrated mean: "

    f"{november_calibrated_probabilities.mean():.4f}"

)





print(

    f"Actual November delay rate: "

    f"{y_november.mean():.4f}"

)





print(

    f"Raw minimum: "

    f"{november_raw_probabilities.min():.4f}"

)





print(

    f"Raw maximum: "

    f"{november_raw_probabilities.max():.4f}"

)





print(

    f"Calibrated minimum: "

    f"{november_calibrated_probabilities.min():.4f}"

)





print(

    f"Calibrated maximum: "

    f"{november_calibrated_probabilities.max():.4f}"

)





# ============================================================

# FINAL UNTOUCHED DECEMBER TEST

# ============================================================



print(

    "\n" + "=" * 60

)



print(

    "FINAL TEST — DECEMBER 2015"

)



print(

    "=" * 60

)





print(

    "\nIMPORTANT:"

)



print(

    "December was not used for training, "

    "calibration, or threshold selection."

)



print(

    "This is the final unseen evaluation."

)





# ------------------------------------------------------------

# December features

# ------------------------------------------------------------



X_test = test_df[

    feature_columns

]





y_test = test_df[

    "delayed"

]





print(

    f"\nDecember test rows: "

    f"{len(X_test):,}"

)





print(

    f"December actual delay rate: "

    f"{y_test.mean():.4f}"

)





# ------------------------------------------------------------

# Raw Random Forest probability

# ------------------------------------------------------------



test_raw_probabilities = (

    model

    .predict_proba(

        X_test

    )[:, 1]

)





# ------------------------------------------------------------

# Apply calibration learned from October

# ------------------------------------------------------------



test_calibrated_probabilities = (

    calibrator.predict(

        test_raw_probabilities

    )

)





# ------------------------------------------------------------

# Test probability quality

# ------------------------------------------------------------



test_raw_brier = brier_score_loss(

    y_test,

    test_raw_probabilities

)





test_calibrated_brier = brier_score_loss(

    y_test,

    test_calibrated_probabilities

)





test_raw_log_loss = log_loss(

    y_test,

    test_raw_probabilities,

    labels=[0, 1]

)





test_calibrated_log_loss = log_loss(

    y_test,

    test_calibrated_probabilities,

    labels=[0, 1]

)





print(

    "\nProbability quality:"

)





print(

    f"Raw RF Brier score:        "

    f"{test_raw_brier:.6f}"

)





print(

    f"Calibrated Brier score:    "

    f"{test_calibrated_brier:.6f}"

)





print(

    f"Raw RF log loss:           "

    f"{test_raw_log_loss:.6f}"

)





print(

    f"Calibrated log loss:       "

    f"{test_calibrated_log_loss:.6f}"

)





# ------------------------------------------------------------

# FINAL TEST CLASSIFICATION

# ------------------------------------------------------------



final_test_metrics = print_metrics(

    y_test,

    test_calibrated_probabilities,

    threshold=best_threshold,

    title=(

        "FINAL DECEMBER TEST "

        f"(threshold = {best_threshold:.2f})"

    )

)





# ============================================================

# VALIDATION VS FINAL TEST

# ============================================================



print(

    "\n" + "=" * 60

)



print(

    "VALIDATION VS FINAL TEST"

)



print(

    "=" * 60

)





print(

    f"\nValidation F1: "

    f"{best_row['f1']:.4f}"

)





print(

    f"Test F1:       "

    f"{final_test_metrics['f1']:.4f}"

)





print(

    f"\nValidation precision: "

    f"{best_row['precision']:.4f}"

)





print(

    f"Test precision:       "

    f"{final_test_metrics['precision']:.4f}"

)





print(

    f"\nValidation recall: "

    f"{best_row['recall']:.4f}"

)





print(

    f"Test recall:       "

    f"{final_test_metrics['recall']:.4f}"

)





# ============================================================

# FINAL TEST PROBABILITY DISTRIBUTION

# ============================================================



print(

    "\nFinal test probability distribution:"

)





print(

    f"Raw mean: "

    f"{test_raw_probabilities.mean():.4f}"

)





print(

    f"Calibrated mean: "

    f"{test_calibrated_probabilities.mean():.4f}"

)





print(

    f"Actual delay rate: "

    f"{y_test.mean():.4f}"

)





print(

    f"Calibrated minimum: "

    f"{test_calibrated_probabilities.min():.4f}"

)





print(

    f"Calibrated maximum: "

    f"{test_calibrated_probabilities.max():.4f}"

)





# ============================================================

# FINAL MODEL STATUS

# ============================================================



print(

    "\n" + "=" * 60

)



print(

    "FINAL MODEL STATUS"

)



print(

    "=" * 60

)





print(

    "\nModel training: COMPLETE"

)





print(

    "Probability calibration: COMPLETE"

)





print(

    f"Selected validation threshold: "

    f"{best_threshold:.2f}"

)





print(

    "Final December test evaluation: COMPLETE"

)





print(

    "\nDecember was used only for final evaluation."

)





print(

    "\nNext stage:"

)





print(

    "Connect calibrated delay probability "

    "to the airline financial and scenario engine."

)

# ============================================================
# SAVE REUSABLE MODEL ARTIFACTS
# ============================================================

# Keep the fitted preprocessing pipeline, Random Forest and isotonic
# calibrator together. Inference must use the same feature order and
# calibration mapping as the evaluated model.

artifact_directory = Path(__file__).resolve().parent / "artifacts"
artifact_directory.mkdir(parents=True, exist_ok=True)
artifact_path = artifact_directory / "flight_delay_model.joblib"

joblib.dump(
    {
        "model": model,
        "calibrator": calibrator,
        "feature_columns": feature_columns,
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
        "delay_threshold_minutes": DELAY_THRESHOLD_MINUTES,
        "classification_threshold": best_threshold,
        "training_sample_size": len(X_train_model),
        "dataset": "US domestic flights, 2015",
        "target_definition": "ARRIVAL_DELAY >= 30 minutes",
    },
    artifact_path,
)

print(f"\nSaved reusable model artifact: {artifact_path}")
