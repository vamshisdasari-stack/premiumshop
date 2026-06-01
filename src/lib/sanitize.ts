import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "ul", "ol", "li", "h2", "h3", "h4",
  "blockquote", "a", "span",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title", "target"],
  span: ["class"],
};

export function sanitizeRichText(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    transformTags: {
      a: (_, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
    },
  });
}

export function sanitizeReviewText(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ["p", "br", "strong", "em"],
    allowedAttributes: {},
  }).trim();
}
