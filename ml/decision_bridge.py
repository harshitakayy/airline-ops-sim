import argparse
import json
from pathlib import Path

from financial_model import (
    FinancialAssumptions,
    FlightFinancialInput,
    compare_actions,
    print_result,
)
from predict_delay import predict_delay_probability


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Run the first ML-to-financial-model integration. "
            "This evaluates financial actions using a calibrated delay probability."
        )
    )
    parser.add_argument(
        "--features",
        required=True,
        help="Path to JSON containing the model's engineered feature row.",
    )
    parser.add_argument(
        "--duration-hours",
        type=float,
        required=True,
        help="Scheduled flight duration in hours.",
    )
    parser.add_argument(
        "--expected-delay-minutes",
        type=float,
        default=60.0,
        help=(
            "Assumed duration of the delayed outcome. This is a prototype "
            "assumption, not an output of the current classifier. Default: 60."
        ),
    )
    args = parser.parse_args()

    if args.duration_hours <= 0:
        parser.error("--duration-hours must be greater than zero")
    if args.expected_delay_minutes < 0:
        parser.error("--expected-delay-minutes cannot be negative")

    feature_path = Path(args.features)
    with feature_path.open("r", encoding="utf-8") as file:
        features = json.load(file)

    probability = predict_delay_probability(features)
    flight = FlightFinancialInput(
        scheduled_duration_hours=args.duration_hours,
        expected_delay_minutes=args.expected_delay_minutes,
    )
    result = compare_actions(
        probability,
        flight,
        FinancialAssumptions(),
    )

    print_result(result)
    print(
        "\nNOTE: This is a plumbing prototype. The model was trained on US 2015 "
        "data; it is not validated for Indian airline operations. The delay "
        "duration and action consequences are simplified assumptions, and "
        "reassignment has not yet been run through the TypeScript simulator."
    )


if __name__ == "__main__":
    main()
