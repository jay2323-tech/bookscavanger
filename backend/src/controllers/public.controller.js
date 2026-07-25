import { supabase } from "../config/db.js";
import { calculateDistance } from "../utils/distance.js";

export async function searchBooks(req, res) {
  const { q, lat, lng } = req.query;

  try {
    const { data, error } = await supabase
      .from("books")
      .select("*, libraries(name, latitude, longitude)")
      .or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%`);

    if (error) return res.status(500).json({ error: error.message });

    const booksWithDistance = data
      .filter((book) => book.libraries)
      .map((book) => {
      const lib = book.libraries;
      const distance =
        lat && lng && lib.latitude != null && lib.longitude != null
          ? calculateDistance(lat, lng, lib.latitude, lib.longitude)
          : null;

      return {
        ...book,
        library_name: lib?.name ?? null,
        latitude: lib?.latitude ?? null,
        longitude: lib?.longitude ?? null,
        distance,
      };
    });

    // 🔍 Track search analytics
    await supabase.from("analytics").insert({
      event_type: "search",
      metadata: { query: q },
    }).then().catch(err => console.error("Analytics error:", err));

    booksWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    res.json(booksWithDistance);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
}
