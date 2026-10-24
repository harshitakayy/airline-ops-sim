# Flight Data and Machine Learning Integration

## Observations Versus Outcomes

A flight-data API may return scheduled and estimated times before a flight has completed.

An observation is a record of what the provider reported at a particular time. A confirmed outcome requires suitable actual-flight information.

**What I learned:** Collecting flight data does not automatically create a valid supervised-learning dataset. The pipeline must distinguish observations from confirmed outcomes.

## Synchronization and Provenance

A synchronization-run table records each provider request, while individual observations reference the run that collected them.

**What I learned:** Data pipelines need provenance. Knowing when and how a record was collected makes failures easier to diagnose and supports reproducible analysis.

## Codeshares and Flight Identity

Multiple marketed flight numbers may refer to one operating flight.

**What I learned:** Counting raw API rows can overcount actual operations. Identity resolution must account for operating flight numbers, dates, routes, and the possibility of incomplete provider fields.

## Probability Versus Duration

A binary classifier estimates the probability that a defined event occurs, such as arrival delay reaching 30 minutes. It does not automatically estimate the duration of the delay.

**What I learned:** Prediction outputs must be interpreted according to their target definition. A risk probability and a delay-duration estimate are different quantities.

## Training and Evaluation Must Be Separate

Preparing a dataset is only one stage of an ML pipeline. Training, evaluation, calibration, and testing must also complete before a model's performance can be reported.

**What I learned:** A prepared dataset and an existing training script do not prove that a new model has been trained successfully.

## Integration Requires Compatible Features

A model trained on historical data may require features that are unavailable from a live API response.

**What I learned:** Missing features should be handled through a documented feature contract and appropriate preprocessing—not by silently inventing values that make the prediction look valid.

## Simulation and Decision Support

The deterministic simulator models operational constraints, while the ML model estimates a statistical risk. A decision engine may use both, but their meanings must remain distinct.

**What I learned:** Combining two models does not automatically produce a valid recommendation. Their assumptions, target definitions, baseline behavior, and cost functions must be compatible.
