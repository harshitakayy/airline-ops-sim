import type { Aircraft } from "../engine/types";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface AircraftPanelProps {
  aircrafts: Aircraft[];
}

function AircraftPanel({ aircrafts }: AircraftPanelProps) {
  return (
    <Card className="dashboard-card">
      <CardHeader className="dashboard-card-header">
        <CardTitle className="dashboard-card-title">
          Aircraft
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="aircraft-list">
          {aircrafts.map((aircraft) => (
            <div className="aircraft-item" key={aircraft.id}>
              <div className="aircraft-top">
                <span className="aircraft-id">
                  {aircraft.id}
                </span>

                <span
                  className={`aircraft-status ${
                    aircraft.status === "airborne"
                      ? "airborne"
                      : ""
                  }`}
                >
                  {aircraft.status}
                </span>
              </div>

              <p className="aircraft-airport">
                Current airport: {aircraft.currentAirport}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default AircraftPanel;