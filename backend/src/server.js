import cors from "cors";
import "dotenv/config";
import express from "express";

import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import libraryRoutes from "./routes/library.routes.js";
import publicRoutes from "./routes/public.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import onboardingRoutes from "./routes/onboarding.routes.js";
import readerRoutes from "./routes/reader.routes.js";
import { meiliEnabled, searchMeili, ensureBooksIndex, indexBooks } from "./services/meilisearch.js";
import { supabaseAdmin } from "./config/db.js";


const app = express();

/* ============================
   GLOBAL MIDDLEWARE
   ============================ */
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow local + any Vercel preview/prod. No origin = curl/server-to-server.
      if (
        !origin ||
        origin === "http://localhost:3000" ||
        origin === "http://127.0.0.1:3000" ||
        /\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/* ============================
   HEALTH CHECK
   ============================ */
app.get("/", (_req, res) => {
  res.json({
    status: "BookScavenger backend running",
    meilisearch: meiliEnabled(),
  });
});

/* ============================
   PUBLIC ROUTES
   ============================ */
app.use("/api/auth", authRoutes);      // (empty for now, safe)
app.use("/api/books", publicRoutes);   // public browsing

/* ============================
   PROTECTED ROUTES
   ============================ */
app.use("/api/library", libraryRoutes);
app.use("/api/library", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/library", onboardingRoutes);
app.use("/api/reader", readerRoutes);


/* ============================
   START SERVER
   ============================ */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  if (meiliEnabled()) {
    console.log(`🔎 Meilisearch: ${process.env.MEILI_HOST}`);
    void warmMeiliIndex();
  } else {
    console.log("🔎 Meilisearch: off (set MEILI_HOST to enable)");
  }
});

/** If Meili is empty, reindex once in the background. */
async function warmMeiliIndex() {
  try {
    await ensureBooksIndex();
    const probe = await searchMeili("a", { limit: 1 });
    if (probe && probe.length > 0) return;

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
    console.log(`🔎 Meilisearch warm-index: ${indexed} docs`);
  } catch (err) {
    console.warn("Meili warm-index skip:", err.message);
  }
}
