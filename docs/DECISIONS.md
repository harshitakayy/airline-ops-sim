# Design Decisions

This document explains why certain implementation decisions were made.

---

## Fresh Simulation State

Every simulation run starts with fresh flight and aircraft objects.

Reason:

Simulation objects are modified while the simulation runs.

For example:

- Flight status changes
- Aircraft location changes
- Delay values change

Reusing the same objects would cause later simulations to start with incorrect state.

---

## Events Instead of Console Output

The engine stores events instead of printing everything to the console.

Benefits:

- Easier testing
- Easier debugging
- Future API support
- Dashboard integration

---

## Delay Propagation by Aircraft Rotation

Delays only propagate between flights operated by the same aircraft.

Different aircraft operate independently.

This matches how airline operations work in reality.

---

## Automated Scenario Testing

Each test builds its own scenario instead of modifying the default simulation data.

Benefits:

- Independent tests
- Predictable results
- Easier maintenance