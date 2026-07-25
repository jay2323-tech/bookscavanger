/**
 * ILS connectors — sync inventory into BookScavenger `books` table.
 *
 * Supported types:
 *   - koha_csv: fetch a Koha CSV export (title,author,isbn,available)
 *   - koha_sru: basic SRU search against a Koha SRU endpoint
 *
 * Full production ILS usually needs per-library credentials + cron;
 * this is the integration surface librarians / ops can wire up.
 */

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const titleI = headers.findIndex((h) => h === "title" || h === "biblio.title");
  const authorI = headers.findIndex(
    (h) => h === "author" || h === "biblio.author"
  );
  const isbnI = headers.findIndex((h) => h === "isbn" || h === "biblio.isbn");
  const availI = headers.findIndex(
    (h) => h === "available" || h === "status" || h === "onloan"
  );

  if (titleI < 0) throw new Error("CSV needs a title column");

  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const title = cols[titleI];
    if (!title) continue;
    let available = true;
    if (availI >= 0) {
      const v = (cols[availI] || "").toLowerCase();
      available = !(
        v === "0" ||
        v === "false" ||
        v === "onloan" ||
        v === "checked out" ||
        v === "unavailable"
      );
    }
    rows.push({
      title: title.slice(0, 300),
      author: (authorI >= 0 ? cols[authorI] : "")?.slice(0, 200) || null,
      isbn: (isbnI >= 0 ? cols[isbnI] : "")?.replace(/\D/g, "").slice(0, 20) || null,
      available,
      quantity: 1,
    });
  }
  return rows;
}

/** Very small SRU title extractor (MARCxml / DC) */
function parseSruXml(xml) {
  const rows = [];
  const records = xml.split(/<record[\s>]/i).slice(1);
  for (const rec of records) {
    const title =
      rec.match(/<dc:title[^>]*>([^<]+)/i)?.[1] ||
      rec.match(/<datafield[^>]*tag="245"[\s\S]*?<subfield[^>]*code="a"[^>]*>([^<]+)/i)?.[1];
    const author =
      rec.match(/<dc:creator[^>]*>([^<]+)/i)?.[1] ||
      rec.match(/<datafield[^>]*tag="100"[\s\S]*?<subfield[^>]*code="a"[^>]*>([^<]+)/i)?.[1];
    const isbn =
      rec.match(/<dc:identifier[^>]*>([^<]*isbn[^<]*)/i)?.[1] ||
      rec.match(/<datafield[^>]*tag="020"[\s\S]*?<subfield[^>]*code="a"[^>]*>([^<]+)/i)?.[1];
    if (!title) continue;
    rows.push({
      title: title.trim().slice(0, 300),
      author: author?.trim().slice(0, 200) || null,
      isbn: isbn?.replace(/\D/g, "").slice(0, 20) || null,
      available: true,
      quantity: 1,
    });
  }
  return rows;
}

/**
 * @param {{ type: string, endpoint: string, query?: string }} opts
 * @returns {Promise<{ title: string, author: string|null, isbn: string|null, available: boolean, quantity: number }[]>}
 */
export async function fetchIlsInventory({ type, endpoint, query = "" }) {
  if (!endpoint) throw new Error("endpoint required");

  if (type === "koha_csv" || type === "csv") {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
    const text = await res.text();
    return parseCsv(text);
  }

  if (type === "koha_sru" || type === "sru") {
    const url = new URL(endpoint);
    if (!url.searchParams.has("query")) {
      url.searchParams.set("query", query || 'dc.title=*');
    }
    if (!url.searchParams.has("version")) {
      url.searchParams.set("version", "1.1");
    }
    if (!url.searchParams.has("operation")) {
      url.searchParams.set("operation", "searchRetrieve");
    }
    if (!url.searchParams.has("maximumRecords")) {
      url.searchParams.set("maximumRecords", "50");
    }
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`SRU fetch failed: ${res.status}`);
    const xml = await res.text();
    return parseSruXml(xml);
  }

  throw new Error(`Unsupported ILS type: ${type}. Use koha_csv or koha_sru.`);
}
