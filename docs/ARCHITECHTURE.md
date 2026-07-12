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

        ┌───────────────┴────────────────┐

        ▼                                ▼

 Apply Disruptions                 Simulation Clock

        │                              (tick)

        ▼                                │

 Weather / Crew /                 Process Every Flight
 Technical                               │

        │                ┌───────────────┴───────────────┐

        ▼                ▼                               ▼

 Record Disruption   Departure Logic             Arrival Logic
      Events               │                           │

                            └──────────────┬──────────────┘

                                           ▼

                              Update Aircraft State

                                           ▼

                              Record Flight Events

                                           ▼

                              Return Simulation State

                                           ▼

                                   JSON Response

                                           │

                                           ▼

                                         Client
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
- Turnaround dependency handling
- Modular disruption system
- Structured event logging

### Disruption System

- Weather disruptions
- Technical disruptions
- Crew disruptions
- Extensible disruption handlers

### Testing

- Vitest
- Unit tests for delay propagation
- Unit tests for aircraft location enforcement
- Unit tests for simulation events

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
        │                                 ├── Weather API
        │                                 ├── Airport Data
        │                                 └── Flight Data
        │
        ▼

  Simulation Pipeline

        │

        ├── Apply Disruptions
        ├── Delay Propagation
        ├── Aircraft Rotations
        ├── Event Generation
        ├── Cost Analysis
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

- Flight cancellations
- Airport closures
- Diversion handling
- Maintenance scheduling
- Aircraft utilization analysis
- Operational cost calculation

### Frontend

- React operations dashboard
- Interactive airport map
- Flight timeline visualization
- Event timeline
- Disruption controls
- Simulation configuration panel

### Backend

- PostgreSQL persistence
- Historical simulation storage
- User-defined scenarios
- Authentication

### Infrastructure

- Docker containerization
- Cloud deployment
- CI/CD pipeline