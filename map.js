// Import Mapbox + D3 as ESM modules
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";

// Set your Mapbox access token here
mapboxgl.accessToken =
  "pk.eyJ1IjoidnNvbWFuaTEyMyIsImEiOiJjbWlueWVoZm8wMjdkM2VxMDg3OGd6OHdhIn0.o9Auxw2oA0UGI5m49o0rQw";

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

// Select the SVG overlay sitting on top of the map
const svg = d3.select("#map").select("svg");

// Helper: project station Lat/Long -> SVG pixel coords
// NOTE: in the JSON the keys are `Long` and `Lat`
function getCoords(station) {
  const lng = +station.Long;
  const lat = +station.Lat;

  const point = map.project([lng, lat]); // { x, y }
  return { cx: point.x, cy: point.y };
}

// Optional: add zoom + rotation controls
map.addControl(new mapboxgl.NavigationControl());

// ONE load handler for everything
map.on("load", async () => {
  // -------------------------------
  // 1. Shared styling for bike lanes
  // -------------------------------
  const bikeLanePaint = {
    "line-color": "#32D400", // bright green
    "line-width": 4,
    "line-opacity": 0.6,
  };

  // --- Boston bike lanes ---
  map.addSource("boston_bike_lanes", {
    type: "geojson",
    data:
      "https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson",
  });

  map.addLayer({
    id: "boston-bike-lanes",
    type: "line",
    source: "boston_bike_lanes",
    paint: bikeLanePaint,
  });

  // --- Cambridge bike lanes ---
  map.addSource("cambridge_bike_lanes", {
    type: "geojson",
    data:
      "https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson",
  });

  map.addLayer({
    id: "cambridge-bike-lanes",
    type: "line",
    source: "cambridge_bike_lanes",
    paint: bikeLanePaint,
  });

  // -------------------------------
  // 2. Bluebikes stations (SVG circles)
  // -------------------------------
  try {
    const stationsUrl =
      "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";

    const jsonData = await d3.json(stationsUrl);
    console.log("Loaded JSON Data:", jsonData);

    const stations = jsonData.data.stations;
    console.log("Stations Array:", stations);
    console.log("Number of stations:", stations.length);

    // Create one SVG circle per station
    const circles = svg
      .selectAll("circle")
      .data(stations)
      .join("circle")
      .attr("r", 5)
      .attr("fill", "steelblue")
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .attr("opacity", 0.8);

    // Function to update circle positions when the map moves/zooms
    function updatePositions() {
      circles
        .attr("cx", (d) => getCoords(d).cx)
        .attr("cy", (d) => getCoords(d).cy);
    }

    // Initial placement
    updatePositions();

    // Keep them synced with the map view
    map.on("move", updatePositions);
    map.on("zoom", updatePositions);
    map.on("resize", updatePositions);
    map.on("moveend", updatePositions);
  } catch (error) {
    console.error("Error loading Bluebikes JSON:", error);
  }
});
