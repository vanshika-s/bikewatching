// Import Mapbox + D3 as ESM modules
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";

// -------------------------------
// Config + helpers
// -------------------------------

// Mapbox token
mapboxgl.accessToken =
  "pk.eyJ1IjoidnNvbWFuaTEyMyIsImEiOiJjbWlueWVoZm8wMjdkM2VxMDg3OGd6OHdhIn0.o9Auxw2oA0UGI5m49o0rQw";

console.log("Mapbox GL JS Loaded:", mapboxgl);

// current time filter in minutes since midnight (-1 = any time)
let timeFilter = -1;

// Turn minutes (0–1440) into "3:15 PM"
function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString("en-US", { timeStyle: "short" });
}

// Minutes since midnight for a Date
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// Compute arrivals/departures/total traffic for each station
function computeStationTraffic(stations, trips) {
  // departures per start_station_id
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id
  );

  // arrivals per end_station_id
  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id
  );

  // attach metrics onto each station object
  return stations.map((station) => {
    const id = station.short_name;

    station.departures = departures.get(id) ?? 0;
    station.arrivals = arrivals.get(id) ?? 0;
    station.totalTraffic = station.departures + station.arrivals;

    return station;
  });
}

// Filter trips to those that start OR end within ±60 minutes of timeFilter
function filterTripsByTime(trips, timeFilter) {
  if (timeFilter === -1) return trips;

  return trips.filter((trip) => {
    const startedMinutes = minutesSinceMidnight(trip.started_at);
    const endedMinutes = minutesSinceMidnight(trip.ended_at);

    return (
      Math.abs(startedMinutes - timeFilter) <= 60 ||
      Math.abs(endedMinutes - timeFilter) <= 60
    );
  });
}

// Map departures/total ratio -> 3 discrete values
const stationFlow = d3
  .scaleQuantize()
  .domain([0, 1])
  .range([0, 0.5, 1]); // more arrivals, balanced, more departures

// -------------------------------
// Map + SVG setup
// -------------------------------

// Initialize the map
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

// SVG overlay on top of map
const svg = d3.select("#map").select("svg");

// Project station lat/lon -> pixel coords
function getCoords(station) {
  // support either Lat/Long or lat/lon keys
  const lng = +(station.Long ?? station.lon);
  const lat = +(station.Lat ?? station.lat);

  const point = map.project([lng, lat]); // { x, y }
  return { cx: point.x, cy: point.y };
}

// Navigation controls
map.addControl(new mapboxgl.NavigationControl());

// -------------------------------
// Main load handler
// -------------------------------

map.on("load", async () => {
  // 1. Bike lanes (Boston + Cambridge)
  const bikeLanePaint = {
    "line-color": "#32D400",
    "line-width": 4,
    "line-opacity": 0.6,
  };

  // Boston
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

  // Cambridge
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

  // 2. Load stations JSON
  const stationsUrl =
    "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";

  const stationsJson = await d3.json(stationsUrl);
  let stations = stationsJson.data.stations;
  console.log("Stations:", stations.length);

  // 3. Load trips CSV, parsing started_at / ended_at into Date
  const tripsUrl =
    "https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv";

  let trips = await d3.csv(tripsUrl, (trip) => {
    trip.started_at = new Date(trip.started_at);
    trip.ended_at = new Date(trip.ended_at);
    return trip;
  });
  console.log("Trips:", trips.length);

  // 4. Initial traffic metrics (no time filter)
  stations = computeStationTraffic(stations, trips);

  // 5. Radius scale based on totalTraffic
  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);

  // 6. Create circles (one per station)
  const circles = svg
    .selectAll("circle")
    .data(stations, (d) => d.short_name)
    .join("circle")
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .attr("fill-opacity", 0.6)
    .attr("r", (d) => radiusScale(d.totalTraffic))
    .style("--departure-ratio", (d) => {
        const ratio = d.totalTraffic ? d.departures / d.totalTraffic : 0.5;
        return stationFlow(ratio);
    })
    .each(function (d) {
        d3.select(this)
        .append("title")
        .text(
            `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
        );
    });


  // 7. Keep circles glued to map movement/zoom
  function updatePositions() {
    circles
      .attr("cx", (d) => getCoords(d).cx)
      .attr("cy", (d) => getCoords(d).cy);
  }

  updatePositions();

  map.on("move", updatePositions);
  map.on("zoom", updatePositions);
  map.on("resize", updatePositions);
  map.on("moveend", updatePositions);

  // -------------------------------
  // Time slider wiring + filtering
  // -------------------------------

  const timeSlider = document.getElementById("time-slider");
  const selectedTime = document.getElementById("selected-time");
  const anyTimeLabel = document.getElementById("any-time");

  function updateScatterPlot(currentTimeFilter) {
    // 1. Filter trips by time
    const filteredTrips = filterTripsByTime(trips, currentTimeFilter);

    // 2. Recompute station traffic with filtered trips
    const filteredStations = computeStationTraffic(stations, filteredTrips);

    // 3. Adjust radius scale range based on whether filtering is on
    if (currentTimeFilter === -1) {
      radiusScale.range([0, 25]);
    } else {
      radiusScale.range([3, 50]);
    }

    // 4. Update circles’ data, radius, and tooltips
    circles
        .data(filteredStations, (d) => d.short_name)
        .join("circle")
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("fill-opacity", 0.6)
        .attr("r", (d) => radiusScale(d.totalTraffic))
        .style("--departure-ratio", (d) => {
            const ratio = d.totalTraffic ? d.departures / d.totalTraffic : 0.5;
            return stationFlow(ratio);
        })
        .each(function (d) {
            const t = d3.select(this).select("title");
            if (t.empty()) {
            d3.select(this).append("title");
        }
        d3
            .select(this)
            .select("title")
            .text(
            `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
            );
        });

    // Re-position in case new circles were added
    updatePositions();
  }

  function updateTimeDisplay() {
    timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
      selectedTime.textContent = "";
      anyTimeLabel.style.display = "block";
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = "none";
    }

    // reflect changes on the map
    updateScatterPlot(timeFilter);
  }

  timeSlider.addEventListener("input", updateTimeDisplay);
  updateTimeDisplay(); // initialize UI + sizes
});
