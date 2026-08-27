import "./EventList.css";

interface Event {
  timestamp: number;
  message: string;
}

interface EventListProps {
  events: Event[];
}

const getEventIcon = (message: string) => {
  const text = message.toLowerCase();

  if (text.includes("depart")) return "🛫";
  if (text.includes("land")) return "🛬";
  if (text.includes("delay")) return "🟡";
  if (text.includes("cancel")) return "❌";

  return "•";
};

export default function EventList({ events }: EventListProps) {
  return (
    <div className="event-panel">
      <div className="panel-header">
        <h2>Recent Events</h2>
      </div>

      <div className="event-list">
        {events.length === 0 ? (
          <p className="empty-events">No events available.</p>
        ) : (
          events
            .slice()
            .reverse()
            .map((event, index) => (
              <div className="event-item" key={index}>
                <span className="event-icon">
                  {getEventIcon(event.message)}
                </span>

                <div className="event-content">
                  <span className="event-message">
                    {event.message}
                  </span>

                  <span className="event-time">
                    Hour {event.timestamp}
                  </span>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}