import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to update map center when coordinates change
const MapUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

const ActivityMap = ({ destination, activities = [] }) => {
    const [center, setCenter] = useState([20, 0]); // Default global view
    const [markers, setMarkers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const loadCoordinates = async () => {
            if (!destination) {
                setMarkers([]);
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const destRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`);
                const destData = await destRes.json();

                let mapCenter = [20, 0];
                const newMarkers = [];

                if (destData && destData.length > 0) {
                    mapCenter = [parseFloat(destData[0].lat), parseFloat(destData[0].lon)];

                    newMarkers.push({
                        id: 'dest',
                        position: mapCenter,
                        title: `Trip to ${destination}`,
                        type: 'destination'
                    });
                }

                const activitiesToMap = activities.slice(0, 5);
                for (const act of activitiesToMap) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));

                    try {
                        const query = `${act.activity}, ${destination}`;
                        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                        const data = await res.json();

                        if (data && data.length > 0) {
                            newMarkers.push({
                                id: act.id || `${act.activity}-${act.date || 'unscheduled'}`,
                                position: [parseFloat(data[0].lat), parseFloat(data[0].lon)],
                                title: act.activity,
                                date: act.date,
                                type: 'activity'
                            });
                        }
                    } catch {
                        console.warn(`Failed to geocode activity: ${act.activity}`);
                    }
                }

                if (!cancelled) {
                    setCenter(mapCenter);
                    setMarkers(newMarkers);
                }
            } catch (error) {
                console.error('Error fetching map data:', error);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadCoordinates();

        return () => {
            cancelled = true;
        };
    }, [destination, activities]);

    return (
        <div className="activity-map-container glass" style={{ padding: '1rem', marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>🗺️ Trip Map</h3>
            <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                {loading && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                    }}>
                        Loading Map Points...
                    </div>
                )}
                <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapUpdater center={center} />
                    {markers.map((marker) => (
                        <Marker key={marker.id} position={marker.position}>
                            <Popup>
                                <strong>{marker.title}</strong>
                                {marker.date && <br />}
                                {marker.date && <span style={{ fontSize: '0.8rem' }}>{new Date(marker.date).toLocaleDateString()}</span>}
                                {marker.type === 'destination' && <br />}
                                {marker.type === 'destination' && <span style={{ color: '#646cff' }}>Main Destination</span>}
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default ActivityMap;
