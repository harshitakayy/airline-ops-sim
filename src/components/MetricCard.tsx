import { Card, CardContent } from "./ui/card";

interface SimulationMetrics {
  onTimeFlights: number;
  delayedFlights: number;
  cancelledFlights: number;
  averageDelay: number;
  aircraftUtilization: number;
}

interface MetricCardProps {
  metrics: SimulationMetrics;
}

export default function MetricCard({ metrics }: MetricCardProps) {
  const totalFlights =
    metrics.onTimeFlights +
    metrics.delayedFlights +
    metrics.cancelledFlights;

  return (
    <div className="metrics-grid">
      <Card className="metric-card">
        <CardContent className="metric-card-content">
          <p className="metric-label">Flights</p>
          <p className="metric-value">{totalFlights}</p>
        </CardContent>
      </Card>

      <Card className="metric-card">
        <CardContent className="metric-card-content">
          <p className="metric-label">Average Delay</p>
          <p className="metric-value">
            {metrics.averageDelay.toFixed(1)} hr
          </p>
        </CardContent>
      </Card>

      <Card className="metric-card">
        <CardContent className="metric-card-content">
          <p className="metric-label">Cancelled</p>
          <p className="metric-value">{metrics.cancelledFlights}</p>
        </CardContent>
      </Card>

      <Card className="metric-card">
        <CardContent className="metric-card-content">
          <p className="metric-label">Aircraft Utilization</p>
          <p className="metric-value">
            {Math.round(metrics.aircraftUtilization)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}