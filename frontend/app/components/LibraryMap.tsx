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
}

function DirectionsList({
  libraries,
  selectedId,
  onSelect,
}: {
  libraries: Library[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="mt-10 rounded-lg border border-gray-800 bg-gray-900/50 p-5">
      <h3 className="text-lg font-semibold text-[#D4AF37] mb-3">
        Libraries on map
      </h3>
      <ul className="space-y-2">
        {libraries.map((lib) => (
          <li key={lib.id}>
            <button
              type="button"
              onClick={() => onSelect?.(lib.id)}
              className={`w-full text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md px-2 py-2 ${
                selectedId === lib.id
                  ? "bg-slate-800 text-[#D4AF37]"
                  : "hover:bg-slate-800/60"
              }`}
            >
              <span>{lib.name}</span>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lib.latitude},${lib.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#D4AF37] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Get directions →
              </a>
            </button>
          </li>
        ))}
      </ul>
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
        <p className="text-xs text-gray-500 mt-4">
          Add NEXT_PUBLIC_GOOGLE_MAPS_KEY to enable the embedded map.
        </p>
      )}
    </div>
  );
}

export default function LibraryMap({
  libraries = [],
  selectedId,
  onSelect,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!libraries.length) return null;

  if (!apiKey) {
    return (
      <DirectionsList
        libraries={libraries}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    );
  }

  const selected = libraries.find((l) => l.id === selectedId) || libraries[0];
  const center = {
    lat: selected.latitude,
    lng: selected.longitude,
  };

  return (
    <div className="mt-10">
      <div className="rounded-lg overflow-hidden border border-gray-800">
        <LoadScript googleMapsApiKey={apiKey}>
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "400px" }}
            center={center}
            zoom={selectedId ? 13 : 12}
            options={{
              styles: [
                { elementType: "geometry", stylers: [{ color: "#1f2933" }] },
                {
                  elementType: "labels.text.stroke",
                  stylers: [{ color: "#0F172A" }],
                },
                {
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#D4AF37" }],
                },
              ],
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
      />
    </div>
  );
}
