# Airline Operations Simulator

A flight operations simulator built using TypeScript, React, and Vite.

I started this project to understand how airline operations work at a systems level, especially how aircraft rotations, turnaround time, and delays affect later flights in a schedule.

The project is still in development. The current focus has been building and testing the core simulation engine before moving on to the API, disruptions, and dashboard.

---

## What the Simulator Does

The simulator currently models a small airline schedule with:

- Airports
- Aircraft
- Scheduled flights
- Departures and arrivals
- Aircraft rotations
- Turnaround time
- Delay propagation
- Cascading delays
- Schedule buffer absorption
- Multiple independent aircraft rotations
- Aircraft location checks
- Structured simulation events

A single aircraft can operate multiple flights during the simulated day. If one flight is delayed, the simulator calculates whether that delay affects later flights operated by the same aircraft.

For example:

```text
VT-XYZ

AI101: BLR → BOM
AI102: BOM → DEL
AI103: DEL → HYD
```

If AI101 arrives late, AI102 cannot depart until the aircraft has arrived in Mumbai and completed its turnaround time.

If the delay is large enough, it can continue propagating through later flights in the rotation. If there is enough scheduled ground time between flights, the delay can be absorbed and later flights can return to their original schedule.

---

## Current Progress

### Basic Simulation Engine

The first version of the engine implemented:

- Airport, aircraft, and flight data models
- A simulation clock
- Scheduled departures
- Scheduled arrivals
- Aircraft state changes between grounded and airborne
- Aircraft location updates after landing

### Aircraft Rotations

The simulator supports aircraft operating a sequence of connected flights.

Each aircraft stores its own flight rotation. For a flight in a rotation, the engine checks the previous flight before calculating when the aircraft is available for the next departure.

The next flight cannot depart before:

```text
previous flight scheduled arrival
+ previous flight delay
+ turnaround time
```

The engine also checks that:

- The aircraft is grounded
- The aircraft is at the correct departure airport
- The flight is still scheduled

These checks prevent invalid departures.

### Delay Propagation

The simulator calculates the earliest possible departure time of each flight.

Conceptually:

```text
earliest aircraft availability
=
previous flight actual arrival
+ turnaround time
```

The actual departure time is determined by comparing the flight's scheduled departure time, existing delay, and aircraft availability.

This allows the engine to model:

- Delay propagation to the next flight
- Cascading delays across several connected flights
- Schedule buffer absorbing earlier delays
- Independent rotations where one delayed aircraft does not affect another aircraft

### Event Logging

The simulation records structured events for:

- Departures
- Arrivals
- Delays

Each event contains:

- Simulation time
- Event type
- Flight ID
- A message describing what happened

For example:

```ts
{
  time: 8,
  type: "departure",
  flightId: "TEST101",
  message: "TEST101 departed BLR"
}
```

The simulation engine returns these events as data instead of relying on console output.

This event history can later be exposed through the API and used by the React dashboard to display an operations timeline.

### Automated Testing

The simulation engine is tested using Vitest.

The current test suite covers:

- Delay propagation to the next flight
- Delay absorption when sufficient schedule buffer exists
- Cascading delay through a longer aircraft rotation
- Recovery of later flights after delay absorption
- Independent aircraft rotations
- Prevention of departure when an aircraft is at the wrong airport
- Departure and arrival event generation and ordering

Each test creates its own isolated simulation scenario instead of depending on the default data in `data.ts`.

This makes the engine easier to test with different schedules and prevents changes to the default scenario from affecting unrelated tests.

---

## How the Simulation Works

The simulation runs using a central clock.

At every simulated hour, the engine processes the current simulation state.

Conceptually:

```text
runSimulation()
        ↓
tick(currentTime)
        ↓
process each flight
        ↓
calculate aircraft availability
        ↓
process valid departures and arrivals
        ↓
update flight and aircraft state
        ↓
record events
```

At every time step, the engine:

1. Checks scheduled flights
2. Calculates delay propagation from previous flights
3. Checks whether the assigned aircraft is available
4. Checks whether the aircraft is at the correct airport
5. Processes departures
6. Processes arrivals
7. Updates aircraft state and location
8. Records simulation events

The complete simulation is run through:

```ts
runSimulation();
```

By default, this uses the standard simulation data.

The function can also receive a custom scenario:

```ts
runSimulation(scenario);
```

This is used by the automated tests to run controlled schedules with known expected outcomes.

---

## Design Decisions

### Simulation Data Can Be Supplied to `runSimulation()`

The first version of `runSimulation()` created its simulation data internally.

The function was later changed so that scenario data can be supplied by the caller while still keeping the default simulation data available.

This allows:

- The normal simulation to run with default data
- Tests to create small controlled scenarios
- Different schedules to be simulated without changing `data.ts`

This also keeps the simulation logic separate from the source of its input data.

### Fresh State for Every Simulation Run

Flight and aircraft objects are mutable during a simulation.

For example:

- Flight status changes from `scheduled` to `departed` to `landed`
- Aircraft status changes between `grounded` and `airborne`
- Aircraft location changes after landing
- Delay values can change through propagation

For this reason, simulation data is created fresh for each normal run instead of reusing already-mutated state from a previous simulation.

### Structured Events Instead of Console Output

Early versions of the engine used `console.log()` to inspect departures, arrivals, and delays.

The engine now records these as structured `SimulationEvent` objects.

This makes the output:

- Testable
- Easier to expose through an API
- Easier to display in a frontend
- Independent of terminal output

### Aircraft Rotations Define Delay Dependencies

Delay propagation is based on the sequence of flights assigned to the same aircraft.

A delayed flight affects the next flight only when both flights belong to the same aircraft rotation.

This prevents delays from incorrectly propagating between independent aircraft.

---

## Project Structure

```text
src/
│
├── engine/
│   ├── types.ts
│   ├── data.ts
│   ├── clock.ts
│   └── clock.test.ts
│
├── App.tsx
├── main.tsx
└── index.css
```

### `types.ts`

Contains the TypeScript interfaces used by the simulation:

- `Airport`
- `Aircraft`
- `Flight`
- `SimulationEvent`

### `data.ts`

Contains the initial airport data and the functions used to create fresh flight and aircraft state for a normal simulation run.

### `clock.ts`

Contains the main simulation logic:

- Finding the aircraft assigned to a flight
- Finding the previous flight in an aircraft rotation
- Handling departures
- Handling arrivals
- Propagating delays
- Advancing the simulation clock
- Running the complete simulation

### `clock.test.ts`

Contains automated tests for the simulation engine using isolated flight and aircraft scenarios.

---

## Tech Stack

### Current

- TypeScript
- React
- Vite
- Vitest
- Git
- GitHub

### Planned

The project will later add backend, persistence, deployment, and external-data components as those phases are implemented.

---

## What I'm Working on Next

The next phase is to expose the simulation engine through a REST API.

The immediate plan is to:

- Design API endpoints for flights, aircraft, rotations, simulation state, and events
- Connect API routes to the simulation engine
- Return simulation results as JSON
- Add API-level validation and testing
- Introduce a more suitable time representation for multi-day schedules
- Add persistence once the API structure is stable

After the API foundation is working, the simulator will be extended with disruption scenarios such as:

- Weather delays
- Airport disruptions
- Mechanical delays

Later phases will include operational cost modelling, recovery decisions, dashboard visualization, and deployment.

---

## Why I'm Building This

I wanted to build an aviation-focused project that goes beyond displaying flight data.

The main goal is to understand how individual operational events affect the rest of an airline schedule and eventually compare how different operational decisions affect delays and costs.

The current version focuses on aircraft movement, rotations, delay dependencies, and event generation. I am building the project in stages so that the simulation logic is reliable before adding the API, disruption models, and visualization.

---

## Status

Active development.

The current simulation engine supports flight operations, aircraft rotations, turnaround dependencies, cascading delay propagation, schedule buffer absorption, multiple independent aircraft rotations, aircraft location enforcement, structured event logging, and automated simulation tests.