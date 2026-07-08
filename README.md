# Airline Operations Simulator

A flight operations simulator built using TypeScript, React, and Vite.

I started this project to understand how airline operations work at a systems level, especially how aircraft rotations and delays affect later flights in a schedule.

The project is still in development. Right now, I am working on the simulation engine before moving on to the dashboard and visualization.

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
- Simulation events

A single aircraft can operate multiple flights during the day. If one flight is delayed, the simulator calculates how that delay affects later flights operated by the same aircraft.

For example:

```text
VT-XYZ

AI101: BLR → BOM
AI103: BOM → DEL
AI104: DEL → HYD
```

If AI101 arrives late, AI103 cannot depart until the aircraft has arrived in Mumbai and completed its turnaround time. This can then delay AI104 as well.

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

### Aircraft Rotations and Delay Propagation

The simulator now supports aircraft operating a sequence of flights.

For each flight, the engine checks the previous flight in the aircraft's rotation. The next flight cannot depart before:

```text
previous flight arrival
+ previous flight delay
+ turnaround time
```

The calculated delay is then propagated to later flights in the rotation.

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

This event history will later be used by the React dashboard to display an operations timeline.

### Simulation State

The simulation state has been refactored so that every simulation run starts with fresh:

- Flight data
- Aircraft data
- Event history

The `runSimulation()` function creates the simulation state, runs the clock through the simulated day, and returns the final flights, aircraft, and events.

---

## How the Simulation Works

The simulation runs using a central clock.

```ts
tick(currentTime);
```

At every simulated hour, the engine:

1. Checks scheduled flights
2. Calculates delay propagation from previous flights
3. Checks whether the assigned aircraft is available at the correct airport
4. Processes departures
5. Processes arrivals
6. Updates aircraft state and location
7. Records simulation events

The complete simulation is started through:

```ts
runSimulation();
```

A simulation run creates fresh data, advances the clock, and returns the final state and event history.

---

## Project Structure

```text
src/
│
├── engine/
│   ├── types.ts
│   ├── data.ts
│   ├── events.ts
│   └── clock.ts
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

Contains the initial airport data and the functions used to create fresh flight and aircraft state for each simulation run.

### `clock.ts`

Contains the main simulation logic:

- Finding the aircraft assigned to a flight
- Finding the previous flight in an aircraft rotation
- Handling departures
- Handling arrivals
- Propagating delays
- Advancing the simulation clock
- Running the complete simulation

### `events.ts`

Contains event-related simulation structures used to record departures, arrivals, and delays during a simulation run.

---

## Tech Stack

- TypeScript
- React
- Vite
- Git
- GitHub

---

## What I'm Working on Next

The next step is to expand and test the simulation engine with larger aircraft rotations and more complex schedules.

Planned work includes:

- Adding longer flight rotations for each aircraft
- Simulating multiple aircraft rotations at the same time
- Testing delays introduced at different points in a rotation
- Checking that delays only propagate through the affected aircraft
- Testing whether scheduled ground time can absorb earlier delays
- Adding more realistic turnaround-time handling

Once the simulation engine is working reliably with larger schedules, the next stage will be connecting it to the React frontend and building the operations dashboard.
---

## Why I'm Building This

I wanted to build an aviation-focused project that goes beyond displaying flight data.

The main goal is to understand how individual operational events affect the rest of an airline network. The current version is small, but I am building it step by step, starting with the simulation logic before adding visualization and more complex disruption scenarios.

---

## Status

Active development.

The current simulation engine supports basic flight operations, aircraft rotations, turnaround dependencies, cascading delay propagation, and structured event logging.
