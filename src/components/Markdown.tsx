import { Marked } from "marked";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Le HTML brut tapé dans un article est affiché tel quel (échappé), pas interprété.
const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }) {
      return escape(text);
    },
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      const safe = /^(https?:|mailto:|\/)/i.test(href) ? href : "#";
      const external = /^https?:/i.test(safe);
      return `<a href="${safe}"${title ? ` title="${escape(title)}"` : ""}${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
    },
    image({ href, text }) {
      const safe = /^https?:/i.test(href) ? href : "";
      return safe ? `<img src="${safe}" alt="${escape(text)}" loading="lazy">` : "";
    },
  },
});

export default function Markdown({ source }: { source: string }) {
  return <div className="prose-ar" dangerouslySetInnerHTML={{ __html: md.parse(source) as string }} />;
}
