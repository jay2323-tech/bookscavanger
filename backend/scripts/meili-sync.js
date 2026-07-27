/**
 * Local / CI Meilisearch reindex using service role (no admin JWT).
 * Usage: node scripts/meili-sync.js
 * Requires MEILI_HOST + Supabase env in backend/.env
 */
import "dotenv/config";
import { supabaseAdmin } from "../src/config/db.js";
import {
  ensureBooksIndex,
  indexBooks,
  meiliEnabled,
} from "../src/services/meilisearch.js";

async function main() {
  if (!meiliEnabled()) {
    console.error("Set MEILI_HOST in backend/.env first.");
    process.exit(1);
  }

  await ensureBooksIndex();

  let { data, error } = await supabaseAdmin
    .from("books")
    .select(
      "id, title, author, isbn, available, library_id, libraries(name, latitude, longitude, opens_at, closes_at, verified)"
    )
    .limit(5000);

  if (error && String(error.message).includes("verified")) {
    ({ data, error } = await supabaseAdmin
      .from("books")
      .select(
        "id, title, author, isbn, available, library_id, libraries(name, latitude, longitude, opens_at, closes_at)"
      )
      .limit(5000));
  }

  if (error) throw error;

  const { indexed } = await indexBooks(data || []);
  console.log(`Indexed ${indexed} books into Meilisearch.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
