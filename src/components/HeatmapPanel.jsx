import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

function HeatmapCanvas({ issues }) {
  useEffect(() => {
    const map = L.map('admin-map', {
      zoomControl: true,
      attributionControl: true,
    });

    const validIssues = issues.filter(
      issue => Number.isFinite(Number(issue.latitude)) && Number.isFinite(Number(issue.longitude))
    );
    const center = validIssues[0]
      ? [Number(validIssues[0].latitude), Number(validIssues[0].longitude)]
      : [20.5937, 78.9629];

    map.setView(center, validIssues.length ? 12 : 5);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    if (validIssues.length) {
      const points = validIssues.map(issue => [
        Number(issue.latitude),
        Number(issue.longitude),
        Math.max(Number(issue.confidence) || 0.6, 0.35),
      ]);

      L.heatLayer(points, {
        radius: 28,
        blur: 18,
        maxZoom: 17,
        gradient: {
          0.3: '#38bdf8',
          0.5: '#22c55e',
          0.7: '#facc15',
          1.0: '#ef4444',
        },
      }).addTo(map);

      validIssues.forEach(issue => {
        L.circleMarker([Number(issue.latitude), Number(issue.longitude)], {
          radius: 7,
          weight: 2,
          color: '#ffffff',
          fillColor: issue.status === 'resolved' ? '#22c55e' : '#f97316',
          fillOpacity: 0.9,
        })
          .bindPopup(`<strong>Report #${issue.id}</strong><br>${issue.prediction || 'unknown'}<br>${issue.status}`)
          .addTo(map);
      });

      map.fitBounds(points.map(([lat, lng]) => [lat, lng]), { padding: [30, 30] });
    }

    return () => {
      map.remove();
    };
  }, [issues]);

  return <div id="admin-map" className="admin-map" />;
}

export default function HeatmapPanel({ issues }) {
  const mapKey = useMemo(
    () => issues.map(issue => `${issue.id}:${issue.status}:${issue.latitude}:${issue.longitude}`).join('|'),
    [issues]
  );

  return (
    <section className="panel map-panel">
      <div className="panel-header">
        <div>
          <h2>Live Heatmap</h2>
          <p>OpenStreetMap visualization of active reports.</p>
        </div>
      </div>
      <HeatmapCanvas key={mapKey} issues={issues} />
    </section>
  );
}
