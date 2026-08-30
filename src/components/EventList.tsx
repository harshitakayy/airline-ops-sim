import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface Event {
  time: number;
  type: string;
  flightId?: string;
  message: string;
}

interface EventListProps {
  events: Event[];
}

function getEventIcon(type: string) {
  switch (type) {
    case "departure":
      return "↗";

    case "arrival":
      return "↘";

    case "delay":
      return "◷";

    case "cancellation":
      return "×";

    case "weather":
      return "☁";

    case "technical":
      return "⚙";

    case "crew":
      return "◉";

    default:
      return "•";
  }
}

function EventList({ events }: EventListProps) {
  return (
    <Card className="dashboard-card">
      <CardHeader className="dashboard-card-header">
        <CardTitle className="dashboard-card-title">
          Recent Events
        </CardTitle>
      </CardHeader>

      <CardContent className="events-card-content">
        {events.length === 0 ? (
          <div className="empty-state">
            No events available.
          </div>
        ) : (
          <div className="events-list">
            {[...events].reverse().map((event, index) => (
              <div className="event-item" key={`${event.time}-${index}`}>
                <div className="event-icon">
                  {getEventIcon(event.type)}
                </div>

                <div className="event-content">
                  <p className="event-message">
                    {event.message}
                  </p>

                  <span className="event-time">
                    Simulation hour {event.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EventList;