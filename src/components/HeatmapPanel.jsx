import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

const isValidCoordinate = issue => {
  const latitude = Number(issue.latitude);
  const longitude = Number(issue.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
};

function spreadOverlappingIssues(issues) {
  const coordinateCounts = new Map();

  return issues.map(issue => {
    const latitude = Number(issue.latitude);
    const longitude = Number(issue.longitude);
    const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const index = coordinateCounts.get(key) || 0;
    coordinateCounts.set(key, index + 1);

    if (index === 0) {
      return { ...issue, displayLatitude: latitude, displayLongitude: longitude };
    }

    const angle = index * 1.61803398875 * Math.PI;
    const distance = 0.00012 * Math.ceil(index / 6);

    return {
      ...issue,
      displayLatitude: latitude + Math.sin(angle) * distance,
      displayLongitude: longitude + Math.cos(angle) * distance,
    };
  });
}

function HeatmapCanvas({ issues }) {
  const mapRef = useRef(null);

  // Initialize map container once
  useEffect(() => {
    const map = L.map('admin-map', {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update map overlays when issues change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing layers (except tile layer)
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) return;
      map.removeLayer(layer);
    });

    const validIssues = spreadOverlappingIssues(issues.filter(isValidCoordinate));

    if (validIssues.length) {
      const points = validIssues.map(issue => [
        issue.displayLatitude,
        issue.displayLongitude,
        Math.max(Number(issue.confidence) || 0.65, 0.55),
      ]);

      L.heatLayer(points, {
        radius: 18,
        blur: 10,
        maxZoom: 18,
        minOpacity: 0.35,
        gradient: {
          0.3: '#38bdf8',
          0.5: '#22c55e',
          0.7: '#facc15',
          1.0: '#ef4444',
        },
      }).addTo(map);

      validIssues.forEach(issue => {
        L.circleMarker([issue.displayLatitude, issue.displayLongitude], {
          radius: 8,
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
              <div style="margin-bottom: 8px;">
                <span style="color: #6b7280;">GPS:</span> ${Number(issue.latitude).toFixed(6)}, ${Number(issue.longitude).toFixed(6)}
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

      map.fitBounds(points.map(([lat, lng]) => [lat, lng]), {
        padding: [40, 40],
        maxZoom: validIssues.length === 1 ? 16 : 17,
      });
    } else {
      map.setView([20.5937, 78.9629], 5);
    }
  }, [issues]);

  return <div id="admin-map" className="admin-map" />;
}

export default function HeatmapPanel({ issues }) {
  const validIssueCount = issues.filter(isValidCoordinate).length;

  return (
    <section className="panel map-panel">
      <div className="panel-header">
        <div>
          <h2>Live Heatmap</h2>
          <p>OpenStreetMap visualization of active reports.</p>
        </div>
        <span className="map-count">{validIssueCount}/{issues.length} plotted</span>
      </div>
      <HeatmapCanvas issues={issues} />
    </section>
  );
}
