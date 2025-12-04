import React from 'react';
import './ItineraryTimeline.css';

const ItineraryTimeline = ({ activities, startDate, endDate }) => {
    // Group activities by date
    const groupedActivities = activities.reduce((acc, activity) => {
        const date = activity.date ? activity.date.split('T')[0] : 'Unscheduled';
        if (!acc[date]) acc[date] = [];
        acc[date].push(activity);
        return acc;
    }, {});

    // Sort dates
    const sortedDates = Object.keys(groupedActivities).sort();

    return (
        <div className="itinerary-timeline">
            {sortedDates.length === 0 ? (
                <p className="empty-message">No activities planned yet. Add some to see your timeline!</p>
            ) : (
                sortedDates.map((date, index) => (
                    <div key={date} className="timeline-day">
                        <div className="timeline-date">
                            <div className="date-circle"></div>
                            <span className="date-label">
                                {date === 'Unscheduled' ? 'Unscheduled' : new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                        <div className="day-activities">
                            {groupedActivities[date].map(activity => (
                                <div key={activity.id} className="timeline-card glass">
                                    <div className="card-content">
                                        <h4>{activity.activity}</h4>
                                        {activity.notes && <p className="notes">{activity.notes}</p>}
                                        {activity.cost && <span className="cost-tag">${activity.cost}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ItineraryTimeline;
