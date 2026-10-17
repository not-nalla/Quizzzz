import React, { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Light normalization for common model HTML leaks so nothing renders as
 * literal markup (e.g. "<br>• text" or "<b>term</b>").
 */
function normalizeMarkdown(raw: string): string {
  let text = raw || "";
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n");
  text = text.replace(/<\/?p[^>]*>/gi, "\n");
  text = text.replace(/<(\/?)(?:strong|b)>/gi, "**");
  text = text.replace(/<(\/?)(?:em|i)>/gi, "*");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (React.isValidElement(node)) return nodeText((node.props as { children?: React.ReactNode }).children);
  return "";
}

const CodeBlock: React.FC<{ language: string; code: string; children: React.ReactNode }> = ({
  language,
  code,
  children,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — fail silently
    }
  };

  return (
    <div className="my-3 rounded-lg border border-slate-700/60 overflow-hidden bg-slate-900">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700/60">
        <span className="text-caption font-mono text-slate-400">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-caption font-medium text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          aria-label={copied ? "Code copied" : "Copy code"}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" strokeWidth={2.5} /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" strokeWidth={2} /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 m-0 [&_code]:bg-transparent [&_code]:border-0 [&_code]:px-0 [&_code]:py-0 [&_code]:text-[0.8125rem] [&_code]:leading-relaxed [&_code]:text-slate-100 [&_code]:whitespace-pre">
        {children}
      </pre>
    </div>
  );
};

const markdownComponents: Components = {
  pre: ({ children, ...props }) => {
    const child = React.Children.toArray(children)[0];
    const childProps = React.isValidElement(child)
      ? (child.props as { className?: string; children?: React.ReactNode })
      : null;
    const langMatch = childProps?.className ? /language-(\w+)/.exec(childProps.className) : null;
    const language = langMatch?.[1] || "code";
    const code = nodeText(childProps?.children ?? children).replace(/\n$/, "");
    return (
      <CodeBlock language={language} code={code}>
        {children}
      </CodeBlock>
    );
  },
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className || "");
    return (
      <code
        className={cn(
          "font-mono",
          !isBlock &&
            "bg-secondary text-foreground border border-border/60 rounded px-1.5 py-0.5 text-[0.84em]"
        )}
      >
        {children}
      </code>
    );
  },
  p: ({ children }) => <p className="text-chat leading-relaxed">{children}</p>,
  h1: ({ children }) => (
    <h3 className="text-h3 font-display font-bold text-headings pt-1">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="text-h4 font-display font-semibold text-headings pt-1">{children}</h4>
  ),
  h3: ({ children }) => (
    <p className="text-body font-bold text-headings pt-0.5">{children}</p>
  ),
  h4: ({ children }) => (
    <p className="text-body font-semibold text-headings pt-0.5">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-headings">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary font-medium underline underline-offset-2 hover:opacity-80 break-all"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 space-y-1 marker:text-primary">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 space-y-1 marker:text-primary marker:font-semibold">{children}</ol>
  ),
  li: ({ children }) => <li className="text-chat leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 bg-secondary/50 rounded-r-md px-3 py-2 text-muted-foreground [&_p]:my-0 [&_p]:text-inherit">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="!my-3 border-border" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded-lg border border-border">
      <table className="w-full text-left border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-th font-semibold text-foreground border-b border-border whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-td text-foreground border-b border-border/60 align-top">{children}</td>
  ),
};

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * Chat-optimized Markdown renderer (Claude/ChatGPT-style):
 * headings, bold/italic, lists, tables, blockquotes, and code blocks
 * with a copy button — themed to the SyllabusIQ design tokens.
 */
export const Markdown: React.FC<MarkdownProps> = ({ content, className }) => (
  <div className={cn("text-chat text-foreground leading-relaxed space-y-2", className)}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {normalizeMarkdown(content)}
    </ReactMarkdown>
  </div>
);
