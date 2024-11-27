import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const createCustomIcon = (heading, width, height, iconType, isSelected) => {
  let iconUrl = iconType === 'extra-large' ? '/BERTH-ICON.PNG' : '/ship-popup.png';

  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="transform: rotate(${heading}deg); width: ${width}px; height: ${height}px;">
             <img src="${iconUrl}" style="width: 100%; height: 100%;" />
           </div>`,
    iconSize: [width, height],
    popupAnchor: [0, -height / 2], // Adjust the popup position
  });
};

const createPointIcon = (width, height) => {
  return L.divIcon({
    className: 'point-icon',
    html: <div style="width: ${width}px; height: ${height}px; background-color: red; border-radius: 50%;"></div>,
    iconSize: [width, height],
    popupAnchor: [0, -height / 2], // Adjust the popup position
  });
};

const getIconForZoom = (zoom, isSelected) => {
  const sizeMultiplier = isSelected ? 1.5 : 1;
  if (zoom > 23) return { width: 35 * sizeMultiplier, height: 60 * sizeMultiplier, type: 'extra-large' };
  if (zoom > 15) return { width: 25 * sizeMultiplier, height: 50 * sizeMultiplier, type: 'large' };
  if (zoom > 14.75) return { width: 20 * sizeMultiplier, height: 45 * sizeMultiplier, type: 'medium' };
  if (zoom > 13.75) return { width: 20 * sizeMultiplier, height: 35 * sizeMultiplier, type: 'small' };
  if (zoom > 12.75) return { width: 17 * sizeMultiplier, height: 30 * sizeMultiplier, type: 'small' };
  if (zoom > 11.5) return { width: 15 * sizeMultiplier, height: 25 * sizeMultiplier, type: 'small' };
  if (zoom > 10.75) return { width: 15 * sizeMultiplier, height: 20 * sizeMultiplier, type: 'small' };
  if (zoom > 9.75) return { width: 10 * sizeMultiplier, height: 15 * sizeMultiplier, type: 'small' };
  if (zoom > 8.75) return { width: 7 * sizeMultiplier, height: 10 * sizeMultiplier, type: 'small' };
  if (zoom > 7.75) return { width: 7 * sizeMultiplier, height: 8 * sizeMultiplier, type: 'small' };
  if (zoom > 6) return { width: 8 * sizeMultiplier, height: 8 * sizeMultiplier, type: 'point' };
  return { width: 7 * sizeMultiplier, height: 7 * sizeMultiplier, type: 'point' };
};

const MapWithMarkers = ({ vessels, selectedVessel }) => {
  const map = useMap();
  const markerClusterGroupRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    const updateMarkers = () => {
      const currentZoom = map.getZoom();

      if (markerClusterGroupRef.current) {
        markerClusterGroupRef.current.clearLayers();
      } else {
        markerClusterGroupRef.current = L.markerClusterGroup({
          maxClusterRadius: 30,
        });
        map.addLayer(markerClusterGroupRef.current);
      }

      vessels.forEach((vessel) => {
        if (vessel.lat !== undefined && vessel.lng !== undefined) {
          const isSelected = selectedVessel && vessel.name === selectedVessel.name;
          const { width, height, type } = getIconForZoom(currentZoom, isSelected);
          const icon = isSelected
            ? createCustomIcon(vessel.heading, width, height, type, true)
            : type === 'point'
            ? createPointIcon(width, height)
            : createCustomIcon(vessel.heading, width, height, type, false);

          const marker = L.marker([vessel.lat, vessel.lng], { icon });
          marker.bindPopup(`
            <div class="popup-container">
              <div class="popup-header">
                <h3 class="popup-title">${vessel.name || 'No name'} <span class="popup-imo">${vessel.imo ? vessel.imo : 'N/A'}</span></h3>
              </div>
          
              <div class="popup-details">
                <div class="popup-detail"><span class="popup-value">${vessel.destination || '-'}</span></div>
          
                <div class="popup-detail"> 
                  <span class="popup-value">
                    ${vessel.heading ? vessel.heading + '°' : '-'} | 
                    ${vessel.speed === 0 ? '<strong>Berth</strong>' : (vessel.speed ? vessel.speed + ' kn' : '-')}
                  </span>
                </div>
                <div class="popup-detail"><strong>ETA:</strong> <span class="popup-value">${vessel.eta || '-'}</span></div>
              </div>
              <div class="popup-footer">
                <a href="/dashboard/${vessel.name}" class="view-more-link">++View More</a>
              </div>
            </div>
          `);
          
          markerClusterGroupRef.current.addLayer(marker);
        }
      });
    };

    const flyToVessel = () => {
      if (selectedVessel) {
        const { width, height, type } = getIconForZoom(map.getZoom(), true);
        if (markerRef.current) {
          markerRef.current.remove();
        }
        const customIcon = createCustomIcon(
          selectedVessel.heading,
          width,
          height,
          type,
          true
        );
        markerRef.current = L.marker([selectedVessel.lat, selectedVessel.lng], {
          icon: customIcon,
        })
          .addTo(map)
          .bindPopup(`
            <div>
              Name: ${selectedVessel.name}<br />
            </div>
            <div style="text-align: right;">
              <a href="/dashboard/${selectedVessel.name}" style="cursor: pointer;">
                <u>++View more</u>
              </a>
            </div>
          `)
          .openPopup();

        map.flyTo([selectedVessel.lat, selectedVessel.lng], 15, {
          animate: true,
          duration: 1,
        });

        updateMarkers();
      }
    };

    map.on('zoomend', updateMarkers);
    updateMarkers();
    flyToVessel();
  }, [map, vessels, selectedVessel]);

  return null;
};

MapWithMarkers.propTypes = {
  vessels: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
      name: PropTypes.string,
      imo: PropTypes.number,
      speed: PropTypes.number,
      heading: PropTypes.number,
      eta: PropTypes.string,
      destination: PropTypes.string,
    }).isRequired
  ).isRequired,
  selectedVessel: PropTypes.shape({
    name: PropTypes.string.isRequired,
    imo: PropTypes.number,
    speed: PropTypes.number,
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
    heading: PropTypes.number,
  }),
};

export default MapWithMarkers;