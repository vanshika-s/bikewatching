// Import Mapbox as an ESM module
import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";

// Set your Mapbox access token here
mapboxgl.accessToken = "pk.eyJ1IjoidnNvbWFuaTEyMyIsImEiOiJjbWlueWVoZm8wMjdkM2VxMDg3OGd6OHdhIn0.o9Auxw2oA0UGI5m49o0rQw";

// Check that Mapbox GL JS is loaded
console.log("Mapbox GL JS Loaded:", mapboxgl);

// Initialize the map
const map = new mapboxgl.Map({
  container: "map", // ID of the div where the map will render
  style: "mapbox://styles/mapbox/streets-v12", // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude] (Boston-ish)
  zoom: 12, // Initial zoom level
  minZoom: 5,
  maxZoom: 18,
});

// Wait for the basemap tiles & style to finish loading
map.on('load', async () => {
  // Shared styling for *all* bike-lane layers
  const bikeLanePaint = {
    'line-color': '#32D400',   // bright green
    'line-width': 4,           // a bit thicker
    'line-opacity': 0.6        // slightly translucent
  };

  // --- Boston bike lanes ---
  map.addSource('boston_bike_lanes', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addLayer({
    id: 'boston-bike-lanes',
    type: 'line',
    source: 'boston_bike_lanes',
    paint: bikeLanePaint,   // <- reuse shared style
  });
  // --- Cambridge bike lanes ---
  map.addSource('cambridge_bike_lanes', {
    type: 'geojson',
    // 👉 Use the Cambridge GeoJSON URL from the lab handout here:
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });

  map.addLayer({
    id: 'cambridge-bike-lanes',
    type: 'line',
    source: 'cambridge_bike_lanes',
    paint: bikeLanePaint,   // same style, so both cities match
  });
});

// Optional: add zoom + rotation controls
map.addControl(new mapboxgl.NavigationControl());

// When the basemap has finished loading, add bike-lane data
map.on('load', async () => {
  // 1. Add the GeoJSON data source (Boston bike network)
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  // 2. Draw the bike lanes as a line layer
  map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route', // <-- must match the source id above
    paint: {
      'line-color': '#27ae60',   // a nicer green than plain "green"
      'line-width': 2.5,
      'line-opacity': 0.6,
    },
  });
});