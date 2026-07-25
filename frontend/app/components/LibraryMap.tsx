"use client";

import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

type Library = {
  name: string;
  latitude: number;
  longitude: number;
};

interface Props {
  libraries?: Library[];
}

function DirectionsList({ libraries }: { libraries: Library[] }) {
  return (
    <div className="mt-10 rounded-lg border border-gray-800 bg-gray-900/50 p-5">
      <h3 className="text-lg font-semibold text-[#D4AF37] mb-3">Libraries on map</h3>
      <ul className="space-y-2">
        {libraries.map((lib, idx) => (
          <li key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>{lib.name}</span>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lib.latitude},${lib.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#D4AF37] hover:underline"
            >
              Get directions →
            </a>
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

export default function LibraryMap({ libraries = [] }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!libraries.length) return null;

  if (!apiKey) {
    return <DirectionsList libraries={libraries} />;
  }

  const center = {
    lat: libraries[0].latitude,
    lng: libraries[0].longitude,
  };

  return (
    <div className="mt-10">
      <div className="rounded-lg overflow-hidden border border-gray-800">
        <LoadScript googleMapsApiKey={apiKey}>
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "400px" }}
            center={center}
            zoom={12}
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
            {libraries.map((lib, idx) => (
              <Marker
                key={idx}
                position={{ lat: lib.latitude, lng: lib.longitude }}
                title={lib.name}
              />
            ))}
          </GoogleMap>
        </LoadScript>
      </div>
      <DirectionsList libraries={libraries} />
    </div>
  );
}
