import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";

const markdownComponents: Components = {
  blockquote: () => null,
  h1: ({ node: _node, ...props }) => <h1 className="text-2xl font-bold mt-2 mb-2" {...props} />,
  h2: ({ node: _node, ...props }) => <h2 className="text-xl font-bold mt-2 mb-2" {...props} />,
  h3: ({ node: _node, ...props }) => <h3 className="text-lg font-bold mt-2 mb-2" {...props} />,
  p: ({ node: _node, ...props }) => <p className="my-1 last:mb-0 first:mt-0" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="list-disc ml-6 my-2" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="list-decimal ml-6 my-2" {...props} />,
  li: ({ node: _node, ...props }) => <li className="mb-1" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-bold" {...props} />,
  em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
  u: ({ node: _node, ...props }) => <u {...props} />,
  del: ({ node: _node, ...props }) => <del className="line-through" {...props} />,
};

interface MarkdownContentProps {
  children: string;
  className?: string;
}

export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
