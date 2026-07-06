"use client";

import { useEffect, useRef } from "react";
import type { GPXPoint } from "@cyclopilot/shared";
import maplibregl from "maplibre-gl";

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: "OSM Bright",
  sources: {
    "raster-tiles": {
      type: "raster",
      tiles: [
        "https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/about" target="_blank">OpenStreetMap</a>',
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: "raster-layer",
      type: "raster",
      source: "raster-tiles",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export interface MapViewProps {
  route: GPXPoint[];
  currentPoint: GPXPoint | null;
}

export function MapView({
  route,
  currentPoint,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const markerSourceData = {
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: currentPoint
        ? [currentPoint.lon, currentPoint.lat]
        : route[0]
          ? [route[0].lon, route[0].lat]
          : [2.3522, 48.8566],
    },
    properties: {},
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: currentPoint
        ? [currentPoint.lon, currentPoint.lat]
        : [2.3522, 48.8566],
      zoom: 14,
    });

    map.addControl(
      new maplibregl.NavigationControl(),
      "top-right",
    );

    map.on("error", (event) => {
      // Surface tile/style errors in dev tools for easier diagnosis.
      console.error("MapLibre error", event.error);
    });

    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: route.map((p) => [
              p.lon,
              p.lat,
            ]),
          },
          properties: {},
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#2563eb",
          "line-width": 4,
        },
      });

      map.addSource("current-point", {
        type: "geojson",
        data: markerSourceData,
      });

      map.addLayer({
        id: "current-point-layer",
        type: "circle",
        source: "current-point",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            6,
            16,
            10,
          ],
          "circle-color": "#ef4444",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
          "circle-opacity": 0.95,
        },
      });

      if (route.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        route.forEach((p) => {
          bounds.extend([p.lon, p.lat]);
        });
        map.fitBounds(bounds, {
          padding: 40,
          maxZoom: 16,
        });
      }

      requestAnimationFrame(() => {
        map.resize();
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!currentPoint) return;

    const source = map.getSource("current-point") as
      | maplibregl.GeoJSONSource
      | undefined;

    if (source) {
      source.setData({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            currentPoint.lon,
            currentPoint.lat,
          ],
        },
        properties: {},
      });
    }

    map.easeTo({
      center: [
        currentPoint.lon,
        currentPoint.lat,
      ],
      duration: 400,
    });
  }, [currentPoint]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: 420,
        marginTop: 24,
        borderRadius: 12,
        overflow: "hidden",
      }}
    />
  );
}
