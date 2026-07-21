# Project Architecture

## Current Architecture

```text
                     Client

      (Browser / Thunder Client / React)

                        │

                  HTTP Request

                        │

                        ▼

                Express REST API

      ┌────────────┼─────────────┐
      ▼            ▼             ▼

 GET /flights   GET /events   POST /simulation/run

                        │

                        ▼

                runSimulation()

                            │

                            ▼

                     Create Fresh Simulation State

                            │

                            ▼

                     Apply Disruptions

                            │

                            ▼

                     Weather / Crew / Technical

                            │

                            ▼

                     Simulation Clock

                     (tick 0 → 24)

                            │

                            ▼

                     Process Every Flight

                            │

                     ┌──────┴───────────────┐

                     ▼                      ▼

                     Departure Logic    Arrival Logic

                     │                      │

                     └──────────┬───────────┘

                            ▼

                     Update Aircraft State

                            ▼

                     Generate Events

                            ▼

                     Calculate Metrics

                            ▼

                     Return Simulation State

                            ▼

                     JSON Response
```

---

## Current Components

### Backend

- Express REST API
- HTTP request handling
- JSON request/response handling

### Simulation Engine

- Flight model
- Aircraft model
- Airport model
- Simulation clock
- Aircraft rotations
- Delay propagation
- Schedule buffer absorption
- Flight cancellation logic
- Aircraft availability validation
- Turnaround dependency handling
- Modular disruption system
- Structured event logging
- Operational metrics generation

### Disruption System

- Weather disruptions
- Technical disruptions
- Crew disruptions
- Extensible disruption handlers

### Testing

- Vitest
- Delay propagation tests
- Buffer absorption tests
- Flight cancellation tests
- Aircraft availability tests
- Event generation tests
- Operational metrics tests

---

## Current API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/flights` | Returns all flights |
| GET | `/flights/:id` | Returns a specific flight |
| GET | `/aircraft` | Returns all aircraft |
| GET | `/events` | Returns the complete simulation timeline |
| POST | `/simulation/run` | Runs the simulation using optional disruption inputs and returns the updated simulation state |

---

## Planned Architecture

```text
                   React Dashboard

                          │

                    HTTP + JSON

                          │

                          ▼

                  Express REST API

                          │

        ┌─────────────────┼──────────────────┐

        ▼                 ▼                  ▼

 Simulation Engine   PostgreSQL        External APIs
        │                                 │
        ├── Simulation Clock
        ├── Disruption Engine
        ├── Event Generator
        └── Metrics Engine
        ▼

  Simulation Pipeline

        │

        ├── Apply Disruptions
        ├── Flight Scheduling
        ├── Aircraft Rotations
        ├── Delay Propagation
        ├── Cancellation Handling
        ├── Event Generation
        ├── Operational Metrics
        └── Simulation Results

                          │

                          ▼

                   JSON Responses

                          │

                          ▼

                         User
```

---

## Planned Features

### Simulation Engine

- Airport closures
- Diversion handling
- Maintenance scheduling
- Passenger connections
- Gate assignment
- Operational cost calculation
- Recovery strategy optimization

### Frontend

- React operations dashboard
- KPI cards
- Flight status table
- Event timeline
- Interactive airport map
- Simulation controls
- Simulation configuration panel

### Backend

- PostgreSQL persistence
- Historical simulation storage
- User-defined scenarios
- Scenario management
- Authentication
- Metrics persistence

### Infrastructure

- Docker containerization
- Cloud deployment
- CI/CD pipeline