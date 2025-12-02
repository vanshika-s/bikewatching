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