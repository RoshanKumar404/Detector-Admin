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
          .bindPopup(`
            <div style="font-family: inherit; font-size: 13px; color: #1f2937; line-height: 1.4; padding: 4px;">
              <strong style="font-size: 14px; color: #1e3a8a;">Report #${issue.id}</strong>
              <div style="margin-top: 4px; font-weight: 500;">
                <span style="color: #6b7280;">Prediction:</span> ${issue.prediction || 'unknown'}
              </div>
              <div style="margin-bottom: 8px; margin-top: 2px;">
                <span style="color: #6b7280;">Status:</span> 
                <span style="background-color: ${issue.status === 'resolved' ? '#d1fae5' : '#ffedd5'}; 
                             color: ${issue.status === 'resolved' ? '#065f46' : '#9a3412'}; 
                             padding: 2px 6px; 
                             border-radius: 4px; 
                             font-size: 11px; 
                             font-weight: bold;">
                  ${issue.status || 'pending'}
                </span>
              </div>
              ${issue.image_url ? `
                <div style="border-radius: 6px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 6px;">
                  <img src="${issue.image_url}" alt="Waterlogging report" style="width: 200px; height: 120px; object-fit: cover; display: block;" />
                </div>
              ` : ''}
            </div>
          `, {
            maxWidth: 220
          })
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
