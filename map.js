// Import Mapbox + D3 as ESM modules
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";

// Set your Mapbox access token here
mapboxgl.accessToken =
  "pk.eyJ1IjoidnNvbWFuaTEyMyIsImEiOiJjbWlueWVoZm8wMjdkM2VxMDg3OGd6OHdhIn0.o9Auxw2oA0UGI5m49o0rQw";

console.log("Mapbox GL JS Loaded:", mapboxgl);

// Initialize the map
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

// SVG overlay on top of the map
const svg = d3.select("#map").select("svg");

// Helper: project station lon/lat -> pixel coords
function getCoords(station) {
  // Bluebikes JSON uses `lon` and `lat`
  const lng = +station.lon;
  const lat = +station.lat;
  const point = map.project([lng, lat]);
  return { cx: point.x, cy: point.y };
}

map.addControl(new mapboxgl.NavigationControl());

// ONE load handler for everything
map.on("load", async () => {
  // -------------------------------
  // 1. Bike lane layers
  // -------------------------------
  const bikeLanePaint = {
    "line-color": "#32D400",
    "line-width": 4,
    "line-opacity": 0.6,
  };

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
  // 2–4. Bluebikes stations + traffic
  // -------------------------------
  try {
    // 2. Station metadata
    const stationsUrl =
      "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";
    const jsonData = await d3.json(stationsUrl);
    let stations = jsonData.data.stations;

    console.log("Stations:", stations.length);

    // 4.1 Load trips CSV
    const tripsUrl =
      "https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv";
    const trips = await d3.csv(tripsUrl);
    console.log("Trips:", trips.length);

    // 4.2 rollups: departures & arrivals
    const departures = d3.rollup(
      trips,
      v => v.length,
      d => d.start_station_id
    );

    const arrivals = d3.rollup(
      trips,
      v => v.length,
      d => d.end_station_id
    );

    // Attach arrivals / departures / totalTraffic to each station
    stations = stations.map(station => {
      const id = station.short_name; // e.g. A32000
      station.arrivals = arrivals.get(id) ?? 0;
      station.departures = departures.get(id) ?? 0;
      station.totalTraffic = station.arrivals + station.departures;
      return station;
    });

    console.log("Example station with traffic:", stations[0]);

    // 4.3 size scale (area-correct!)
    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(stations, d => d.totalTraffic)])
      .range([0, 25]);

    // Create one SVG circle per station
    const circles = svg
      .selectAll("circle")
      .data(stations)
      .join("circle")
      .attr("r", d => radiusScale(d.totalTraffic))
      .attr("fill", "steelblue")
      .attr("opacity", 0.6)
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      // 4.4 simple browser tooltip
      .each(function (d) {
        d3.select(this)
          .append("title")
          .text(
            `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
          );
      });

    // Position circles according to map view
    function updatePositions() {
      circles
        .attr("cx", d => getCoords(d).cx)
        .attr("cy", d => getCoords(d).cy);
    }

    updatePositions(); // initial placement

    map.on("move", updatePositions);
    map.on("zoom", updatePositions);
    map.on("resize", updatePositions);
    map.on("moveend", updatePositions);
  } catch (error) {
    console.error("Error loading Bluebikes data:", error);
  }
});
