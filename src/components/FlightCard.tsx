import type { Flight } from "../engine/types";
import "./FlightCard.css";

interface FlightCardProps {
    flight: Flight;
}

function FlightCard({ flight }: FlightCardProps) {
    return (
        <div className="flight-card">
            <h2>{flight.id}</h2>

            <p>
                <strong>Route:</strong> {flight.from} → {flight.to}
            </p>

            <p>
                <strong>Departure:</strong> {flight.departureTime}:00
            </p>

            <p>
                <strong>Arrival:</strong> {flight.arrivalTime}:00
            </p>

            <p>
                Status:
                <span className="status landed">
                    {flight.status}
                </span>
            </p>

            <p>
                <strong>Delay:</strong> {flight.delayHours} hour(s)
            </p>
        </div>
    );
}

export default FlightCard;