# Design Decisions

This document explains why certain implementation decisions were made during development.

---

## Fresh Simulation State

Every simulation run starts with fresh flight and aircraft objects.

### Reason

Simulation objects are modified while the simulation runs.

For example:

- Flight status changes
- Aircraft location changes
- Delay values change

Reusing the same objects would cause later simulations to start with incorrect state.

---

## Events Instead of Console Output

The engine stores structured events instead of printing everything to the console.

### Benefits

- Easier testing
- Easier debugging
- Future API support
- Dashboard integration
- Event timeline visualization
- Multiple clients can consume the same event history

---

## Delay Propagation by Aircraft Rotation

Delays only propagate between flights operated by the same aircraft.

Different aircraft operate independently.

### Reason

This reflects real airline operations where one aircraft's delay should not directly affect another aircraft unless additional operational constraints are introduced.

---

## Automated Scenario Testing

Each unit test builds its own simulation scenario instead of modifying the default simulation data.

### Benefits

- Independent tests
- Predictable results
- Easier maintenance
- Easier debugging
- No shared state between tests

---

## Simulation Engine Separate from API

The simulation logic is independent of Express.

The REST API simply calls the simulation engine and returns its results.

### Reason

Separating the simulation engine from the API makes the engine reusable.

The same engine can later be used by:

- React dashboard
- REST API
- Command-line interface
- Automated tests

without changing the simulation logic.

---

## REST API for External Access

The simulation engine is exposed through an Express REST API.

### Reason

Using a REST API allows external clients to interact with the simulator without needing access to the simulation code.

Current clients include:

- Thunder Client
- Future React frontend

Additional clients can be added later without modifying the engine.

---

## JSON as the Communication Format

The backend returns simulation results as JSON.

### Reason

JSON is the standard format used for communication over HTTP.

It is lightweight, human-readable, and supported by virtually every programming language, making it suitable for communication between the backend and frontend.

---

## Server Stores Current Simulation State

The Express server keeps the latest simulation result in memory.

```ts
let simulation = runSimulation();
```

### Reason

This avoids recalculating the simulation every time a client requests flights, aircraft, or events.

Instead, the simulation is executed once and its current state is reused until a new simulation is triggered.

---

## Resource-Oriented API Design

The API is organized around resources.

Current endpoints:

- `GET /flights`
- `GET /flights/:id`
- `GET /aircraft`
- `GET /events`
- `POST /simulation/run`

### Reason

Following REST principles makes the API easier to understand, extend, and integrate with future clients.

---

## Configurable Simulation Inputs

The simulation accepts configuration through a `SimulationOptions` object instead of hardcoded values.

Example:

```ts
runSimulation(data, {
    disruptions: [
        {
            type: "weather",
            airport: "BLR",
            delayHours: 3,
            reason: "Thunderstorm"
        }
    ]
});
```

### Reason

This allows the same simulation engine to be reused with different scenarios without modifying the source code.

It also enables external clients such as the React dashboard to configure simulations through the REST API.

---

## Modular Disruption System

Disruption handling is separated from the simulation clock.

```
runSimulation()

↓

applyDisruptions()

↓

Weather
Crew
Technical
```

### Reason

Each disruption type has its own implementation.

This keeps the simulation clock focused on advancing time while the disruption system is responsible for modifying flight schedules.

The architecture also makes it easier to add new disruption types in the future.

---

## Specialized Disruption Handlers

Weather, technical, and crew disruptions are implemented using separate functions.

### Reason

Although the implementations are currently similar, they represent different operational concepts.

Keeping them separate allows each disruption type to evolve independently without creating one large function containing many conditional statements.

Future examples include:

- Airport closures
- Bird strikes
- Maintenance delays
- Air traffic control restrictions

---

## Events Represent Operational History

Every significant operation is recorded as a structured simulation event.

Examples include:

- Weather disruptions
- Flight delays
- Departures
- Arrivals

### Reason

The event timeline becomes the single source of truth for what happened during a simulation.

This allows the same event history to be reused by:

- REST API responses
- React timeline visualization
- Testing
- Future analytics modules