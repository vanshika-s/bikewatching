// Import Mapbox as an ESM module
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
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

    // -------------------------------
  // Step 3.1 – Load Bluebikes stations JSON with D3
  // -------------------------------
  try {
    const stationsUrl =
      'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

    // Fetch the JSON
    const jsonData = await d3.json(stationsUrl);

    console.log('Loaded JSON Data:', jsonData);

    // The actual station array lives here:
    const stations = jsonData.data.stations;
    console.log('Stations Array:', stations);
    console.log('Number of stations:', stations.length);

    // We’ll use `stations` in the next steps to draw circles
  } catch (error) {
    console.error('Error loading Bluebikes JSON:', error);
  }
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