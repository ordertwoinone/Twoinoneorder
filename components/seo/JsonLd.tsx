// Injects JSON-LD structured data into the page. Renders no visible markup,
// so it has zero effect on layout or design.

interface JsonLdProps {
  // One schema object, or an array of them.
  data: Record<string, unknown> | Record<string, unknown>[];
}

export default function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data);
  return (
    <script
      type="application/ld+json"
      // Structured data is trusted, server-built content.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
