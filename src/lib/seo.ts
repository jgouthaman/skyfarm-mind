// Per-page search metadata for the public site. Google wants absolute,
// canonical URLs on the host it indexes (torqwings.com redirects to www).

export const SITE_URL = "https://www.torqwings.com";

export function pageSeo({ path, title, description }: { path: string; title: string; description: string }) {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
