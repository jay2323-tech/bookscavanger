export type RunStop = {
  id: string;
  title: string;
  library_name: string;
  latitude: number;
  longitude: number;
  distance: number | null;
};

const STORAGE_KEY = "bookscavanger_book_run";

export function loadRun(): RunStop[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveRun(stops: RunStop[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stops));
}

export function addToRun(stop: Omit<RunStop, "id">) {
  const stops = loadRun();
  const id = `${stop.library_name}|${stop.title}|${stop.latitude}`;
  if (stops.some((s) => s.id === id)) return stops;
  const next = [...stops, { ...stop, id }];
  saveRun(next);
  return next;
}
