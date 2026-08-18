const wikipediaApiUrl =
  "https://en.wikipedia.org/w/api.php";

const maximumSources = 3;
const maximumExtractLength = 2000;

function normalizeExtract(extract) {
  if (typeof extract !== "string") {
    return "";
  }

  const normalizedExtract = extract
    .replace(/\s+/g, " ")
    .trim();

  if (normalizedExtract.length <= maximumExtractLength) {
    return normalizedExtract;
  }

  return `${normalizedExtract.slice(
    0,
    maximumExtractLength,
  )}...`;
}

export async function searchWikipedia(query) {
  const normalizedQuery =
    typeof query === "string" ? query.trim() : "";

  if (!normalizedQuery) {
    return [];
  }

  const requestUrl = new URL(wikipediaApiUrl);

  requestUrl.searchParams.set("action", "query");
  requestUrl.searchParams.set("format", "json");
  requestUrl.searchParams.set("formatversion", "2");
  requestUrl.searchParams.set("generator", "search");
  requestUrl.searchParams.set(
    "gsrsearch",
    normalizedQuery,
  );
  requestUrl.searchParams.set("gsrnamespace", "0");
  requestUrl.searchParams.set(
    "gsrlimit",
    String(maximumSources),
  );
  requestUrl.searchParams.set("prop", "extracts|info");
  requestUrl.searchParams.set("exintro", "1");
  requestUrl.searchParams.set("explaintext", "1");
  requestUrl.searchParams.set("inprop", "url");
  requestUrl.searchParams.set("redirects", "1");

  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "AI-Chat-Educational-Demo/1.0",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(
        `Wikipedia returned HTTP ${response.status}.`,
      );
    }

    const data = await response.json();

    const pages = Array.isArray(data.query?.pages)
      ? data.query.pages
      : [];

    return pages
      .sort(
        (firstPage, secondPage) =>
          (firstPage.index ?? 0) -
          (secondPage.index ?? 0),
      )
      .map((page, index) => ({
        citationNumber: index + 1,
        title:
          typeof page.title === "string"
            ? page.title
            : `Wikipedia source ${index + 1}`,
        url:
          typeof page.fullurl === "string"
            ? page.fullurl
            : `https://en.wikipedia.org/?curid=${page.pageid}`,
        extract: normalizeExtract(page.extract),
      }))
      .filter((source) => source.extract);
  } catch (error) {
    console.warn(
      "Wikipedia search failed:",
      error instanceof Error
        ? error.message
        : error,
    );

    return [];
  }
}