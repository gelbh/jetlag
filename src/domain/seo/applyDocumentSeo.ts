import { absoluteUrl, getRouteSeo } from "./routeSeo";

const JSON_LD_ATTR = "data-seo-jsonld";

function upsertMeta(options: {
  name?: string;
  property?: string;
  content: string;
}): void {
  const { name, property, content } = options;
  const selector = name
    ? `meta[name="${name}"]`
    : `meta[property="${property}"]`;
  let el = document.head.querySelector(selector);
  if (!(el instanceof HTMLMetaElement)) {
    el = document.createElement("meta");
    if (name) el.setAttribute("name", name);
    if (property) el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(options: { rel: string; href: string }): void {
  const { rel, href } = options;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!(el instanceof HTMLLinkElement)) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(data: Record<string, unknown> | undefined): void {
  const existing = document.head.querySelector(
    `script[type="application/ld+json"][${JSON_LD_ATTR}="1"]`,
  );
  if (!data) {
    existing?.remove();
    return;
  }
  let el = existing;
  if (!(el instanceof HTMLScriptElement)) {
    el = document.createElement("script");
    el.setAttribute("type", "application/ld+json");
    el.setAttribute(JSON_LD_ATTR, "1");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function applyDocumentSeo(pathname: string): void {
  const seo = getRouteSeo(pathname);
  const canonicalUrl = absoluteUrl(seo.canonicalPath);
  const ogImageUrl = absoluteUrl(seo.ogImagePath);

  document.title = seo.title;

  upsertMeta({ name: "description", content: seo.description });
  upsertMeta({ name: "robots", content: seo.robots });
  upsertLink({ rel: "canonical", href: canonicalUrl });

  upsertMeta({ property: "og:title", content: seo.title });
  upsertMeta({ property: "og:description", content: seo.description });
  upsertMeta({ property: "og:url", content: canonicalUrl });
  upsertMeta({ property: "og:image", content: ogImageUrl });
  upsertMeta({ property: "og:type", content: "website" });

  upsertMeta({ name: "twitter:card", content: "summary_large_image" });
  upsertMeta({ name: "twitter:title", content: seo.title });
  upsertMeta({ name: "twitter:description", content: seo.description });
  upsertMeta({ name: "twitter:image", content: ogImageUrl });

  upsertJsonLd(seo.jsonLd);
}
