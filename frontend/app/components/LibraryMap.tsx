"use client";

import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

type Library = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

interface Props {
  libraries?: Library[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  compact?: boolean;
  requireLoginForDirections?: boolean;
  onDirectionsGate?: (mapsUrl: string) => void;
}

function DirectionsList({
  libraries,
  selectedId,
  onSelect,
  compact,
  requireLoginForDirections,
  onDirectionsGate,
}: {
  libraries: Library[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  compact?: boolean;
  requireLoginForDirections?: boolean;
  onDirectionsGate?: (mapsUrl: string) => void;
}) {
  return (
    <div
      className={`${compact ? "mt-3" : "mt-4"} rounded-xl border border-bs-line bg-bs-surface p-4`}
    >
      <h3
        className="text-sm font-semibold text-bs-ink mb-2"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Libraries on map
      </h3>
      <ul className="space-y-1 max-h-48 overflow-y-auto">
        {libraries.map((lib) => {
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lib.latitude},${lib.longitude}`;
          return (
          <li key={lib.id}>
            <button
              type="button"
              onClick={() => onSelect?.(lib.id)}
              className={`w-full text-left flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm ${
                selectedId === lib.id
                  ? "bg-bs-teal-soft text-bs-teal"
                  : "hover:bg-bs-paper text-bs-ink"
              }`}
            >
              <span className="truncate">{lib.name}</span>
              <a
                href={
                  requireLoginForDirections
                    ? "/library/login?next=/search"
                    : mapsUrl
                }
                target={requireLoginForDirections ? undefined : "_blank"}
                rel={
                  requireLoginForDirections
                    ? undefined
                    : "noopener noreferrer"
                }
                className="text-xs text-bs-teal hover:underline shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (requireLoginForDirections) {
                    e.preventDefault();
                    onDirectionsGate?.(mapsUrl);
                  }
                }}
              >
                {requireLoginForDirections ? "Sign in" : "Go"}
              </a>
            </button>
          </li>
          );
        })}
      </ul>
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
        <p className="text-xs text-bs-muted mt-3">
          Add NEXT_PUBLIC_GOOGLE_MAPS_KEY for the embedded map.
        </p>
      )}
    </div>
  );
}

export default function LibraryMap({
  libraries = [],
  selectedId,
  onSelect,
  compact,
  requireLoginForDirections,
  onDirectionsGate,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!libraries.length) return null;

  if (!apiKey) {
    return (
      <DirectionsList
        libraries={libraries}
        selectedId={selectedId}
        onSelect={onSelect}
        compact={compact}
        requireLoginForDirections={requireLoginForDirections}
        onDirectionsGate={onDirectionsGate}
      />
    );
  }

  const selected = libraries.find((l) => l.id === selectedId) || libraries[0];
  const center = {
    lat: selected.latitude,
    lng: selected.longitude,
  };

  return (
    <div className={compact ? "" : "mt-8"}>
      <div className="rounded-xl overflow-hidden border border-bs-line shadow-sm">
        <LoadScript googleMapsApiKey={apiKey}>
          <GoogleMap
            mapContainerStyle={{
              width: "100%",
              height: compact ? "320px" : "400px",
            }}
            center={center}
            zoom={selectedId ? 13 : 12}
            options={{
              styles: [
                { elementType: "geometry", stylers: [{ color: "#e8eef2" }] },
                {
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#142033" }],
                },
                {
                  featureType: "water",
                  elementType: "geometry",
                  stylers: [{ color: "#c5dde0" }],
                },
                {
                  featureType: "poi.park",
                  elementType: "geometry",
                  stylers: [{ color: "#d9f0ed" }],
                },
              ],
              disableDefaultUI: compact,
              zoomControl: true,
            }}
          >
            {libraries.map((lib) => (
              <Marker
                key={lib.id}
                position={{ lat: lib.latitude, lng: lib.longitude }}
                title={lib.name}
                opacity={selectedId && selectedId !== lib.id ? 0.55 : 1}
                onClick={() => onSelect?.(lib.id)}
              />
            ))}
          </GoogleMap>
        </LoadScript>
      </div>
      <DirectionsList
        libraries={libraries}
        selectedId={selectedId}
        onSelect={onSelect}
        compact={compact}
        requireLoginForDirections={requireLoginForDirections}
        onDirectionsGate={onDirectionsGate}
      />
    </div>
  );
}
