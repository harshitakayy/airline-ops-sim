# ✈️ Airline Operations Simulator

An airline operations simulator built with **TypeScript**, **Express**, **React**, and **Vite** that models how disruptions propagate through an airline schedule using aircraft rotations, turnaround constraints, and operational events.

Instead of simply displaying flight information, this project simulates how real airline operations behave when delays occur. The simulator tracks aircraft movement, flight dependencies, airport operations, and disruption propagation while exposing the simulation through a REST API.

The long-term vision is to build an airline operations platform capable of simulating real-world operational scenarios and visualizing them through an interactive dashboard.

---

# Why I Built This

Most aviation projects available online display flight data or use public APIs.

I wanted to understand how airline operations software actually works behind the scenes.

Questions I wanted to answer include:

- What happens if an aircraft arrives late?
- How do delays propagate through an aircraft's rotation?
- When can a delay be absorbed by schedule buffer?
- How do weather or technical disruptions affect later flights?
- How can operational events be visualized?

Rather than focusing on user interfaces first, I decided to build the simulation engine from the ground up before exposing it through an API and eventually building a dashboard.

---

# Features

## Simulation Engine

- Airport model
- Aircraft model
- Flight model
- Aircraft rotations
- Turnaround time modelling
- Aircraft location tracking
- Aircraft status tracking
- Flight departures
- Flight arrivals
- Delay propagation
- Cascading delays
- Schedule buffer absorption
- Multiple independent aircraft rotations

---

## Disruption System

The simulator supports configurable operational disruptions.

Currently implemented:

- Weather disruptions
- Technical disruptions
- Crew disruptions

The disruption system is modular, allowing new disruption types to be added independently.

---

## Event System

Every important operational event is recorded.

Examples include:

- Weather disruptions
- Technical disruptions
- Crew disruptions
- Delay propagation
- Departures
- Arrivals

The simulator stores structured events instead of relying on console output.

---

## REST API

The simulation engine is exposed through an Express REST API.

Current endpoints:

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/flights` | Retrieve all flights |
| GET | `/flights/:id` | Retrieve a single flight |
| GET | `/aircraft` | Retrieve all aircraft |
| GET | `/events` | Retrieve simulation events |
| POST | `/simulation/run` | Run a simulation with custom disruptions |

All communication uses JSON.

---

## Testing

The simulation engine is tested using **Vitest**.

Current tests include:

- Delay propagation
- Delay absorption
- Cascading delays
- Independent aircraft rotations
- Aircraft location validation
- Event generation
- Event ordering

Every test creates its own simulation scenario, allowing deterministic and isolated testing.

---

# Example Rotation

```
Aircraft VT-XYZ

AI101
BLR → BOM

      │

      ▼

AI102
BOM → DEL

      │

      ▼

AI103
DEL → HYD
```

If AI101 arrives late, the simulator determines whether enough turnaround time exists before AI102 departs.

If not, the delay propagates naturally through the remaining rotation.

---

# Example Event Timeline

```
Weather Disruption
BLR (+3h)

        │

        ▼

AI101 Delayed

        │

        ▼

AI102 Delayed

        │

        ▼

AI103 Delayed

        │

        ▼

AI101 Departure

        │

        ▼

AI101 Arrival

        │

        ▼

AI102 Departure

        │

        ▼

...
```

The simulator records both the **cause** (weather) and the resulting operational events, allowing the complete sequence of the simulation to be visualized.

---

# How the Simulation Works

The simulator models airline operations by advancing a simulation clock one hour at a time.

During every simulation step, each scheduled flight is evaluated to determine whether it can depart or arrive based on aircraft availability, turnaround constraints, airport location, and accumulated delays.

Conceptually, the simulation executes the following pipeline:

```text
runSimulation()

        │

        ▼

Create Simulation Data

        │

        ▼

Apply Disruptions

        │

        ▼

Weather
Crew
Technical

        │

        ▼

Simulation Clock

        │

        ▼

Process Every Flight

        │

        ▼

Calculate Aircraft Availability

        │

        ▼

Handle Departures

        │

        ▼

Handle Arrivals

        │

        ▼

Update Aircraft State

        │

        ▼

Generate Events

        │

        ▼

Return Simulation State
```

---

## Simulation Clock

The engine advances through an entire day using a central simulation clock.

```ts
for (let currentTime = 0; currentTime <= 24; currentTime++) {
    tick(currentTime, flights, aircrafts, events);
}
```

At every simulated hour the engine evaluates every flight and determines whether operational conditions allow it to depart or arrive.

---

## Aircraft Rotations

Each aircraft stores the sequence of flights it is scheduled to operate.

Example:

```text
VT-XYZ

AI101
BLR → BOM

↓

AI102
BOM → DEL

↓

AI103
DEL → HYD
```

Instead of treating every flight independently, the simulator understands that the same aircraft must physically complete one flight before operating the next.

---

## Turnaround Constraints

An aircraft cannot immediately depart after landing.

The simulator models turnaround time before the next departure becomes possible.

Conceptually:

```text
Earliest Departure

=

Previous Flight Arrival

+

Previous Flight Delay

+

Turnaround Time
```

If this calculated time is later than the scheduled departure, the delay propagates.

---

## Delay Propagation

The simulator determines each flight's actual departure time by comparing:

- Scheduled departure
- Existing delay
- Aircraft availability

Conceptually:

```text
Actual Departure

=

max(

Scheduled Departure,

Aircraft Available Time

)
```

This naturally produces cascading delays through an aircraft rotation.

---

## Buffer Absorption

Not every delay propagates.

If sufficient ground time exists between flights, the aircraft can recover before the next scheduled departure.

Example:

```text
Flight A

↓

Delayed by 1 hour

↓

Aircraft still becomes available

↓

Flight B departs on schedule
```

This reflects how airlines use schedule buffer to improve operational robustness.

---

## Aircraft Validation

Before allowing a departure, the simulator verifies that:

- The aircraft exists.
- The aircraft is grounded.
- The aircraft is currently located at the correct airport.
- The flight is still scheduled.

These checks prevent impossible flight movements.

---

# Disruption System

The simulator supports configurable operational disruptions.

Each disruption modifies the simulation before the clock begins advancing.

```text
runSimulation()

↓

Apply Disruptions

↓

Weather

Crew

Technical

↓

Simulation Clock
```

The disruption system is intentionally separated from the simulation clock.

This keeps the clock responsible only for advancing time while disruption logic remains modular.

---

## Weather Disruptions

Weather disruptions affect flights departing from a specific airport.

Example:

```json
{
    "type": "weather",
    "airport": "BLR",
    "delayHours": 3,
    "reason": "Thunderstorm"
}
```

Every affected flight receives the specified initial delay before the simulation begins.

---

## Technical Disruptions

Technical disruptions affect a specific aircraft.

Example:

```json
{
    "type": "technical",
    "aircraftId": "VT-XYZ",
    "delayHours": 5,
    "reason": "Hydraulic Failure"
}
```

Only flights operated by that aircraft are affected.

---

## Crew Disruptions

Crew disruptions currently operate similarly to aircraft disruptions.

Example:

```json
{
    "type": "crew",
    "aircraftId": "VT-ABC",
    "delayHours": 2,
    "reason": "Crew Rest Requirement"
}
```

Future versions will introduce dedicated crew objects and duty-hour modelling.

---

# Event System

Rather than printing simulation progress to the console, the simulator records structured operational events.

Example:

```ts
{
    time: 8,
    type: "departure",
    flightId: "AI101",
    message: "AI101 departed BLR"
}
```

The simulator currently records:

- Weather disruptions
- Technical disruptions
- Crew disruptions
- Delay events
- Departures
- Arrivals

These events form a complete operational timeline that can later be visualized in the React dashboard.

---

# REST API

The simulation engine is exposed through an Express REST API, allowing external applications to interact with the simulator without directly accessing the simulation code.

The backend acts as the communication layer between clients and the simulation engine.

```text
Client

(Browser / Thunder Client / React)

        │

 HTTP Request

        │

        ▼

Express REST API

        │

        ▼

Simulation Engine

        │

        ▼

JSON Response

        │

        ▼

Client
```

---

## API Endpoints

### Get All Flights

```http
GET /flights
```

Returns every flight in the current simulation.

---

### Get Flight By ID

```http
GET /flights/:id
```

Example:

```http
GET /flights/AI101
```

Returns:

```json
{
    "id": "AI101",
    "from": "BLR",
    "to": "BOM",
    "status": "landed"
}
```

---

### Get Aircraft

```http
GET /aircraft
```

Returns every aircraft and its current simulation state.

---

### Get Events

```http
GET /events
```

Returns the complete operational timeline.

Example:

```json
[
    {
        "time": 0,
        "type": "weather",
        "message": "Weather disruption at BLR (+3h)"
    },
    {
        "time": 13,
        "type": "departure",
        "flightId": "AI101",
        "message": "AI101 departed BLR"
    }
]
```

---

### Run Simulation

```http
POST /simulation/run
```

Request:

```json
{
    "disruptions": [
        {
            "type": "weather",
            "airport": "BLR",
            "delayHours": 3,
            "reason": "Thunderstorm"
        }
    ]
}
```

The server applies the supplied disruptions, executes the simulation, and returns the updated simulation state.

---

# Project Structure

```text
airline-ops-sim/

├── docs/
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   └── LEARNINGS.md
│
├── server/
│   └── server.ts
│
├── src/
│
│   ├── engine/
│   │
│   ├── clock.ts
│   ├── clock.test.ts
│   ├── data.ts
│   ├── disruptions.ts
│   └── types.ts
│
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── package.json
└── README.md
```

---

# Documentation

The repository contains additional documentation describing the simulator in detail.

| File | Description |
|------|-------------|
| `ARCHITECTURE.md` | Overall system architecture |
| `DECISIONS.md` | Major design decisions |
| `LEARNINGS.md` | Concepts learned during development |

---

# Tech Stack

## Current

### Language

- TypeScript

### Frontend

- React
- Vite

### Backend

- Node.js
- Express
- REST API
- JSON

### Testing

- Vitest
- Thunder Client

### Development

- Git
- GitHub

---

## Planned

- PostgreSQL
- Docker
- Leaflet
- OpenStreetMap
- Weather APIs
- Cloud Deployment

---

# Running the Project

## Clone

```bash
git clone <repository-url>
```

---

## Install Dependencies

```bash
npm install
```

---

## Start React

```bash
npm run dev
```

---

## Start Backend

```bash
npm run server
```

---

## Run Tests

```bash
npm test
```

---

# Development Roadmap

## ✅ Completed

- Airport model
- Aircraft model
- Flight model
- Aircraft rotations
- Turnaround modelling
- Delay propagation
- Buffer absorption
- Event logging
- Automated testing
- Express REST API
- JSON API
- Configurable disruptions
- Weather disruptions
- Technical disruptions
- Crew disruptions

---

## 🚧 In Progress

- Flight cancellations
- Cost modelling
- Airport operational metrics
- Aircraft utilization

---

## 📋 Planned

### Frontend

- React dashboard
- Flight timeline
- Event timeline
- Interactive airport map
- Simulation controls

### Backend

- PostgreSQL
- Historical simulations
- Authentication
- Scenario persistence

### Infrastructure

- Docker
- CI/CD
- Cloud deployment

---

# Future Improvements

The simulator is intended to evolve into a more complete airline operations platform.

Planned capabilities include:

- Flight cancellations
- Airport closures
- Diversions
- Maintenance scheduling
- Crew scheduling
- Passenger connections
- Fuel modelling
- Cost analysis
- Airline recovery strategies
- Live weather integration
- Multi-day simulation
- Performance analytics

---

# Why This Project Matters

Most airline-related student projects focus on displaying information.

This project focuses on **simulating airline operations**.

Instead of asking:

> "Where is this aircraft?"

the simulator asks:

> "Can this aircraft legally operate its next flight?"

Instead of displaying delays, it models **why those delays occur** and how they propagate through the airline schedule.

The long-term objective is to build a realistic airline operations simulator capable of visualizing disruptions, operational decisions, and recovery strategies through an interactive web application.

---

# Status

**🚧 Active Development**

Current capabilities include:

- Aircraft rotations
- Delay propagation
- Schedule buffer absorption
- Configurable disruptions
- Structured event timeline
- Express REST API
- JSON communication
- Automated testing

The current focus is expanding the operational simulation before developing the React operations dashboard and integrating PostgreSQL for persistent simulation storage.