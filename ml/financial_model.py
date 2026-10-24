from dataclasses import dataclass


# ============================================================
# FINANCIAL ASSUMPTIONS
# ============================================================

@dataclass
class FinancialAssumptions:
    """
    Prototype airline economics assumptions.

    These are configurable assumptions for the simulator.
    They are NOT claimed to represent a specific airline.

    All monetary values are in INR.
    """

    # --------------------------------------------------------
    # Revenue
    # --------------------------------------------------------

    passenger_revenue: float = 450_000.0
    ancillary_revenue: float = 50_000.0
    cargo_revenue: float = 50_000.0

    # --------------------------------------------------------
    # Fuel
    # --------------------------------------------------------

    fuel_burn_liters_per_hour: float = 1_200.0
    fuel_price_per_liter: float = 100.0

    # --------------------------------------------------------
    # Operating costs
    # --------------------------------------------------------

    crew_cost_per_hour: float = 15_000.0

    airport_cost: float = 40_000.0

    handling_cost: float = 15_000.0

    maintenance_cost_per_hour: float = 12_500.0

    # --------------------------------------------------------
    # Delay costs
    # --------------------------------------------------------

    passenger_disruption_cost_per_hour: float = 10_000.0

    delay_overhead_per_hour: float = 5_000.0

    # --------------------------------------------------------
    # Cancellation costs
    # --------------------------------------------------------

    cancellation_refund_cost: float = 150_000.0

    cancellation_rebooking_cost: float = 50_000.0

    cancellation_assistance_cost: float = 30_000.0

    cancellation_fixed_cost: float = 30_000.0

    # --------------------------------------------------------
    # Reassignment
    # --------------------------------------------------------

    aircraft_reassignment_cost: float = 35_000.0


# ============================================================
# FLIGHT INPUT
# ============================================================

@dataclass
class FlightFinancialInput:
    """
    Operational information used by the financial model.
    """

    scheduled_duration_hours: float

    expected_delay_minutes: float = 0.0


# ============================================================
# FINANCIAL RESULT
# ============================================================

@dataclass
class FinancialResult:
    """
    Financial result for one operational scenario.
    """

    revenue: float

    operating_cost: float

    disruption_cost: float

    total_cost: float

    net_profit: float


# ============================================================
# REVENUE
# ============================================================

def calculate_revenue(
    assumptions: FinancialAssumptions
) -> float:

    return (
        assumptions.passenger_revenue
        + assumptions.ancillary_revenue
        + assumptions.cargo_revenue
    )


# ============================================================
# NORMAL OPERATING COST
# ============================================================

def calculate_base_operating_cost(
    flight: FlightFinancialInput,
    assumptions: FinancialAssumptions
) -> float:

    duration = (
        flight.scheduled_duration_hours
    )

    # --------------------------------------------------------
    # Fuel
    # --------------------------------------------------------

    fuel_cost = (
        assumptions.fuel_burn_liters_per_hour
        * duration
        * assumptions.fuel_price_per_liter
    )

    # --------------------------------------------------------
    # Crew
    # --------------------------------------------------------

    crew_cost = (
        assumptions.crew_cost_per_hour
        * duration
    )

    # --------------------------------------------------------
    # Maintenance
    # --------------------------------------------------------

    maintenance_cost = (
        assumptions.maintenance_cost_per_hour
        * duration
    )

    # --------------------------------------------------------
    # Airport
    # --------------------------------------------------------

    airport_cost = (
        assumptions.airport_cost
    )

    # --------------------------------------------------------
    # Ground handling
    # --------------------------------------------------------

    handling_cost = (
        assumptions.handling_cost
    )

    return (
        fuel_cost
        + crew_cost
        + maintenance_cost
        + airport_cost
        + handling_cost
    )


# ============================================================
# NORMAL FLIGHT
# ============================================================

def calculate_normal_flight(
    flight: FlightFinancialInput,
    assumptions: FinancialAssumptions
) -> FinancialResult:

    revenue = calculate_revenue(
        assumptions
    )

    operating_cost = (
        calculate_base_operating_cost(
            flight,
            assumptions
        )
    )

    disruption_cost = 0.0

    total_cost = (
        operating_cost
        + disruption_cost
    )

    net_profit = (
        revenue
        - total_cost
    )

    return FinancialResult(
        revenue=revenue,
        operating_cost=operating_cost,
        disruption_cost=disruption_cost,
        total_cost=total_cost,
        net_profit=net_profit
    )


# ============================================================
# DELAYED FLIGHT
# ============================================================

def calculate_delayed_flight(
    flight: FlightFinancialInput,
    assumptions: FinancialAssumptions
) -> FinancialResult:

    revenue = calculate_revenue(
        assumptions
    )

    base_operating_cost = (
        calculate_base_operating_cost(
            flight,
            assumptions
        )
    )

    delay_hours = (
        flight.expected_delay_minutes
        / 60.0
    )

    # --------------------------------------------------------
    # Additional fuel caused by delay
    # --------------------------------------------------------

    additional_fuel_cost = (
        assumptions.fuel_burn_liters_per_hour
        * delay_hours
        * assumptions.fuel_price_per_liter
    )

    # --------------------------------------------------------
    # Additional crew cost
    # --------------------------------------------------------

    additional_crew_cost = (
        assumptions.crew_cost_per_hour
        * delay_hours
    )

    # --------------------------------------------------------
    # Passenger disruption
    # --------------------------------------------------------

    passenger_disruption_cost = (
        assumptions.passenger_disruption_cost_per_hour
        * delay_hours
    )

    # --------------------------------------------------------
    # Other delay overhead
    # --------------------------------------------------------

    delay_overhead = (
        assumptions.delay_overhead_per_hour
        * delay_hours
    )

    disruption_cost = (
        additional_fuel_cost
        + additional_crew_cost
        + passenger_disruption_cost
        + delay_overhead
    )

    total_cost = (
        base_operating_cost
        + disruption_cost
    )

    net_profit = (
        revenue
        - total_cost
    )

    return FinancialResult(
        revenue=revenue,
        operating_cost=base_operating_cost,
        disruption_cost=disruption_cost,
        total_cost=total_cost,
        net_profit=net_profit
    )


# ============================================================
# CANCELLED FLIGHT
# ============================================================

def calculate_cancelled_flight(
    flight: FlightFinancialInput,
    assumptions: FinancialAssumptions
) -> FinancialResult:

    # Cancellation means the planned flight revenue is lost.

    revenue = 0.0

    # --------------------------------------------------------
    # Passenger refund
    # --------------------------------------------------------

    refund_cost = (
        assumptions.cancellation_refund_cost
    )

    # --------------------------------------------------------
    # Rebooking
    # --------------------------------------------------------

    rebooking_cost = (
        assumptions.cancellation_rebooking_cost
    )

    # --------------------------------------------------------
    # Passenger assistance
    # --------------------------------------------------------

    assistance_cost = (
        assumptions.cancellation_assistance_cost
    )

    # --------------------------------------------------------
    # Administrative / operational cost
    # --------------------------------------------------------

    fixed_cost = (
        assumptions.cancellation_fixed_cost
    )

    disruption_cost = (
        refund_cost
        + rebooking_cost
        + assistance_cost
        + fixed_cost
    )

    operating_cost = 0.0

    total_cost = disruption_cost

    net_profit = (
        revenue
        - total_cost
    )

    return FinancialResult(
        revenue=revenue,
        operating_cost=operating_cost,
        disruption_cost=disruption_cost,
        total_cost=total_cost,
        net_profit=net_profit
    )


# ============================================================
# REASSIGNMENT
# ============================================================

def calculate_reassignment_profit(
    normal_result: FinancialResult,
    assumptions: FinancialAssumptions
) -> float:

    reassignment_cost = (
        assumptions.aircraft_reassignment_cost
    )

    return (
        normal_result.net_profit
        - reassignment_cost
    )


# ============================================================
# EXPECTED PROFIT
# ============================================================

def calculate_expected_profit(
    probability_of_delay: float,
    normal_result: FinancialResult,
    delayed_result: FinancialResult
) -> float:

    probability_no_delay = (
        1.0
        - probability_of_delay
    )

    return (
        probability_no_delay
        * normal_result.net_profit
        +
        probability_of_delay
        * delayed_result.net_profit
    )


# ============================================================
# EXPECTED LOSS
# ============================================================

def calculate_expected_loss(
    probability_of_delay: float,
    normal_result: FinancialResult,
    delayed_result: FinancialResult
) -> float:

    expected_profit = (
        calculate_expected_profit(
            probability_of_delay,
            normal_result,
            delayed_result
        )
    )

    return -expected_profit


# ============================================================
# ACTION COMPARISON
# ============================================================

def compare_actions(
    probability_of_delay: float,
    flight: FlightFinancialInput,
    assumptions: FinancialAssumptions
) -> dict:

    # --------------------------------------------------------
    # NORMAL
    # --------------------------------------------------------

    normal_result = (
        calculate_normal_flight(
            flight,
            assumptions
        )
    )

    # --------------------------------------------------------
    # DELAY
    # --------------------------------------------------------

    delayed_result = (
        calculate_delayed_flight(
            flight,
            assumptions
        )
    )

    # --------------------------------------------------------
    # CANCEL
    # --------------------------------------------------------

    cancelled_result = (
        calculate_cancelled_flight(
            flight,
            assumptions
        )
    )

    # --------------------------------------------------------
    # REASSIGN
    # --------------------------------------------------------

    reassignment_profit = (
        calculate_reassignment_profit(
            normal_result,
            assumptions
        )
    )

    # --------------------------------------------------------
    # DO NOTHING
    # --------------------------------------------------------

    expected_profit_do_nothing = (
        calculate_expected_profit(
            probability_of_delay,
            normal_result,
            delayed_result
        )
    )

    # --------------------------------------------------------
    # Compare actions
    # --------------------------------------------------------

    action_profits = {

        "do_nothing":
            expected_profit_do_nothing,

        "reassign":
            reassignment_profit,

        "cancel":
            cancelled_result.net_profit
    }

    recommended_action = max(
        action_profits,
        key=action_profits.get
    )

    best_expected_profit = (
        action_profits[
            recommended_action
        ]
    )

    return {

        "probability_of_delay":
            probability_of_delay,

        "normal_profit":
            normal_result.net_profit,

        "delayed_profit":
            delayed_result.net_profit,

        "cancelled_profit":
            cancelled_result.net_profit,

        "reassignment_profit":
            reassignment_profit,

        "expected_profit_do_nothing":
            expected_profit_do_nothing,

        "expected_profit_reassign":
            reassignment_profit,

        "expected_profit_cancel":
            cancelled_result.net_profit,

        "recommended_action":
            recommended_action,

        "best_expected_profit":
            best_expected_profit
    }


# ============================================================
# RESULT DISPLAY
# ============================================================

def print_result(
    result: dict
) -> None:

    print(
        "\n" + "=" * 60
    )

    print(
        "AIRLINE FINANCIAL DECISION MODEL"
    )

    print(
        "=" * 60
    )

    print(
        f"\nProbability of delay: "
        f"{result['probability_of_delay']:.2%}"
    )

    print(
        f"\nNormal flight profit: "
        f"₹{result['normal_profit']:,.2f}"
    )

    print(
        f"Delayed flight profit: "
        f"₹{result['delayed_profit']:,.2f}"
    )

    print(
        f"Cancelled flight profit: "
        f"₹{result['cancelled_profit']:,.2f}"
    )

    print(
        f"Reassignment profit: "
        f"₹{result['reassignment_profit']:,.2f}"
    )

    print(
        "\nExpected profit if we do nothing: "
        f"₹{result['expected_profit_do_nothing']:,.2f}"
    )

    print(
        "Expected profit after reassignment: "
        f"₹{result['expected_profit_reassign']:,.2f}"
    )

    print(
        "Expected profit after cancellation: "
        f"₹{result['expected_profit_cancel']:,.2f}"
    )

    print(
        "\nRecommended action: "
        f"{result['recommended_action'].upper()}"
    )

    print(
        f"Best expected profit: "
        f"₹{result['best_expected_profit']:,.2f}"
    )


# ============================================================
# DEMO
# ============================================================

if __name__ == "__main__":

    assumptions = (
        FinancialAssumptions()
    )

    flight = (
        FlightFinancialInput(
            scheduled_duration_hours=2.0,
            expected_delay_minutes=60.0
        )
    )

    # Temporary demonstration probability.
    #
    # Later this will come directly from the calibrated
    # Random Forest.

    probability_of_delay = 0.31

    result = compare_actions(
        probability_of_delay,
        flight,
        assumptions
    )

    print_result(
        result
    )