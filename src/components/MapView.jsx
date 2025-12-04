import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issues in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapView = ({ trips }) => {
    const navigate = useNavigate();

    // Default center (somewhere in Europe or global view)
    const defaultCenter = [20, 0];
    const defaultZoom = 2;

    return (
        <div className="map-container" style={{ height: '600px', width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 0 }}>
            <MapContainer center={defaultCenter} zoom={defaultZoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {trips.map((trip) => (
                    trip.latitude && trip.longitude ? (
                        <Marker key={trip.id} position={[trip.latitude, trip.longitude]}>
                            <Popup>
                                <div style={{ minWidth: '200px' }}>
                                    <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{trip.title}</h3>
                                    <p style={{ margin: '0 0 5px 0', color: '#666' }}>{trip.destination}</p>
                                    <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>{new Date(trip.start_date).toLocaleDateString()}</p>
                                    <button
                                        onClick={() => navigate(`/trips/${trip.id}`)}
                                        style={{
                                            background: '#646cff',
                                            color: 'white',
                                            border: 'none',
                                            padding: '5px 10px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            width: '100%'
                                        }}
                                    >
                                        View Trip
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ) : null
                ))}
            </MapContainer>
        </div>
    );
};

export default MapView;
