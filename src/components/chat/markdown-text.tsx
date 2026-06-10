import ReactMarkdown from "react-markdown";

interface MarkdownTextProps {
  children: string;
}

/**
 * Renderiza markdown leve sem permitir HTML cru. Usado tanto em mensagens
 * persistidas (Server Component) quanto nas em streaming. As classes mantêm
 * espaçamento confortável dentro de bubbles.
 */
export function MarkdownText({ children }: MarkdownTextProps) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="leading-relaxed [&:not(:last-child)]:mb-3">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => (
          <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-[0.85em]">
            {children}
          </code>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-accent underline-offset-2 hover:underline"
          >
            {children}
          </a>
        ),
      }}
      skipHtml
    >
      {children}
    </ReactMarkdown>
  );
}
