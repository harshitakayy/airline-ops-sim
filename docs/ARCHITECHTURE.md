# Project Architecture

## Current Architecture

```text
                 runSimulation()

                        │

                        ▼

              Simulation Clock (tick)

                        │

                        ▼

             Process Every Flight

                        │

      ┌─────────────────┴─────────────────┐

      ▼                                   ▼

Departure Logic                   Arrival Logic

      │                                   │

      └──────────────┬────────────────────┘

                     ▼

            Update Aircraft State

                     ▼

              Record Events

                     ▼

        Return Simulation Results
```

---

## Current Components

- Flight model
- Aircraft model
- Airport model
- Simulation clock
- Delay propagation
- Aircraft rotations
- Event system

---

## Planned Architecture

```text
React Dashboard

        │

HTTP Requests

        │

REST API (Express)

        │

Simulation Engine

        │

Database
```