## External Flight Observations Are Stored Separately

Provider observations are stored in `flight_observations` rather than automatically overwriting the simulator's `flights` table.

### Reason

The simulator uses its own operational state and scheduling rules, while external observations describe provider-reported flight information at particular times. Keeping them separate prevents external data from silently changing a simulation run.

## Synchronization Runs Are Auditable

Each ingestion attempt is recorded in `flight_data_sync_runs`, and observations reference the corresponding run.

### Reason

This makes it possible to inspect synchronization status, record counts, failures, and observation provenance.

## Raw Provider Payloads Are Retained

The original provider response is stored as JSON alongside normalized fields.

### Reason

Normalized columns make common queries easier, while the raw payload helps with debugging, field mapping, and future schema changes.

## Confirmed Arrival Outcomes Define ML Labels

The dataset-export workflow uses scheduled and actual arrival times to calculate arrival delay. Estimated arrival times are not used as confirmed training labels.

### Reason

A supervised label must represent the outcome being predicted. Treating a changing estimate as an actual outcome would introduce label noise and could misrepresent model performance.

## Codeshare Observations Require Identity Resolution

Marketed flight numbers and operating-flight numbers are not always identical. The pipeline retains source observations and derives operating-flight identity where possible.

### Reason

Grouping aliases can reduce duplicate counting, but the original records must remain available for auditing and data-quality checks.

## ML Risk Is Not Delay Duration

The existing classifier predicts the probability of arrival delay of at least 30 minutes. It does not predict exact delay minutes.

### Reason

A probability of crossing a threshold cannot be directly interpreted as an expected number of minutes. Decision logic must keep classification risk, simulated delays, and cost assumptions conceptually separate.

## Historical Model Data Is Not Indian Validation Data

The original model uses US domestic 2015 flight data. The BTS January 2026 dataset is a separate experiment.

### Reason

Model performance depends on the distribution and characteristics of the data used for training and evaluation. A model trained on US flights should not be represented as validated for Indian airline operations without appropriate evaluation.
