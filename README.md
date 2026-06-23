#  Airline Operations Simulator

A flight operations simulation system built using **TypeScript**, **React**, and **Vite**.

This project models how airlines manage aircraft, schedules, delays, disruptions, and operational costs. The goal is to simulate real-world airline operations and visualize how disruptions propagate through an airline network.

---

## Project Vision

Modern airlines operate thousands of flights every day.

A delay on a single aircraft can affect multiple flights, airports, passengers, and crew members throughout the day.

This simulator aims to model:

- Aircraft movements
- Flight schedules
- Airport operations
- Delay propagation
- Weather disruptions
- Mechanical failures
- Operational costs
- Airline network efficiency

The long-term goal is to create an interactive operations dashboard similar to what airline operations control centers use.

---

## Current Progress

### v0.1 – Basic Flight Simulation Engine ✅

Implemented:

- Airport data model
- Aircraft data model
- Flight data model
- Flight scheduling
- Departure simulation
- Arrival simulation
- Aircraft state transitions
- Simulation clock (`tick()`)

Example simulation output:

```text
TIME: 9
AI101 departed BLR

TIME: 11
AI101 landed BOM

TIME: 12
AI102 departed BOM

TIME: 14
AI102 landed BLR
```

---

## System Architecture

### Airport

Represents an airport in the network.

Properties:

- Airport ID
- Airport name
- Latitude
- Longitude

Example:

```ts
{
  id: "BOM",
  name: "Mumbai",
  lat: 19.0896,
  lng: 72.8656
}
```

---

### Aircraft

Represents an aircraft operating flights.

Properties:

- Aircraft registration
- Current airport
- Current status

Statuses:

- grounded
- airborne
- delayed

Example:

```ts
{
  id: "VT-ABC",
  currentAirport: "BOM",
  status: "grounded"
}
```

---

### Flight

Represents a scheduled flight.

Properties:

- Flight number
- Assigned aircraft
- Origin airport
- Destination airport
- Departure time
- Arrival time

Example:

```ts
{
  id: "AI101",
  aircraftId: "VT-XYZ",
  from: "BLR",
  to: "BOM",
  departureTime: 9,
  arrivalTime: 11
}
```

---

### Simulation Clock

The simulation advances time using a central clock.

```ts
tick(currentTime);
```

For every time step, the engine:

1. Checks departures
2. Checks arrivals
3. Updates aircraft states
4. Records operational events

---

## Planned Features

### v0.2 – Delay System

- Flight delays
- Delayed departures
- Delayed arrivals

### v0.3 – Aircraft Rotation Logic

Model aircraft operating multiple flights throughout the day.

Example:

```text
VT-XYZ

BLR → BOM
BOM → DEL
DEL → HYD
```

---

### v0.4 – Cascading Delays

If one flight is delayed:

```text
Flight A delayed
↓
Aircraft arrives late
↓
Flight B delayed
↓
Flight C delayed
```

This is one of the core airline operations challenges and a major focus of this simulator.

---

### v0.5 – Disruption Engine

Support for:

- Weather disruptions
- Airport closures
- Mechanical failures
- Ground delays

---

### v0.6 – Cost Engine

Track operational impact:

- Fuel costs
- Crew costs
- Passenger compensation
- Delay penalties

---

### v0.7 – Interactive Dashboard

Build a real-time visualization using React.

Features:

- Interactive map
- Aircraft tracking
- Flight status monitoring
- Event timeline
- Delay analytics

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite

### Simulation Engine

- TypeScript

### Version Control

- Git
- GitHub

---

## Learning Goals

This project is being built to strengthen skills in:

- TypeScript
- React
- State management
- Simulation systems
- Software architecture
- Data modelling
- Event-driven systems
- Aviation operations concepts

---

## Repository Structure

```text
src/
│
├── engine/
│   ├── types.ts
│   ├── data.ts
│   └── clock.ts
│
├── App.tsx
├── main.tsx
└── index.css
```

---

## Future Scope

Potential future additions:

- Real airport datasets
- Live weather integration
- Airline fleet management
- Crew scheduling
- Fuel optimization
- Airport congestion modelling
- Multi-airline simulation

---

## Author

**Harshita Kumawat**

B.Tech Computer Science Engineering  
Vellore Institute of Technology (VIT)

---

## Status

🚧 Active Development

Current Version:

**v0.1 – Basic Flight Simulation Engine**
