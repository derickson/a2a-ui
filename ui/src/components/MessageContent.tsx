import { useState } from 'react';
import { EuiBadge, EuiText, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

interface MessageContentProps {
  content: string;
}

interface ContentSegment {
  type: 'text' | 'tool';
  text: string;
  toolLabel?: string;
  toolOutput?: string;
}

const TOOL_EMOJI_MAP: Record<string, string> = {
  '\uD83D\uDCBB': 'Terminal',      // 💻
  '\uD83D\uDD0D': 'Search',        // 🔍
  '\uD83D\uDCC1': 'File System',   // 📁
  '\uD83C\uDF10': 'Web',           // 🌐
  '\uD83D\uDCDD': 'Write',         // 📝
  '\uD83D\uDCA1': 'Memory',        // 💡
  '\u23F0': 'Schedule',            // ⏰
  '\uD83D\uDCE6': 'Package',       // 📦
  '\uD83D\uDD27': 'Tool',          // 🔧
};

function getToolName(label: string): string {
  for (const [emoji, name] of Object.entries(TOOL_EMOJI_MAP)) {
    if (label.startsWith(emoji)) return name;
  }
  // Fallback: check if starts with any emoji-like character
  const emojiMatch = label.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u);
  if (emojiMatch) return 'Tool';
  return 'Tool';
}

/**
 * Split text after a tool call into the tool's immediate output
 * (first paragraph) and the remaining commentary text.
 * A paragraph break is defined as two or more consecutive newlines.
 */
function splitToolOutput(text: string): [string, string] {
  const breakIdx = text.search(/\n\s*\n/);
  if (breakIdx === -1) {
    return [text.trim(), ''];
  }
  return [text.slice(0, breakIdx).trim(), text.slice(breakIdx).trim()];
}

function parseContent(content: string): ContentSegment[] {
  // Match tool calls: `<emoji> <command>` on their own line(s)
  const toolPattern = /\n?`(\p{Emoji_Presentation}[^`\n]*|\p{Emoji}\uFE0F[^`\n]*)`\n?/gu;

  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = toolPattern.exec(content)) !== null) {
    // Text before this tool call
    const beforeText = content.slice(lastIndex, match.index).trim();
    if (beforeText) {
      if (segments.length > 0 && segments[segments.length - 1].type === 'tool') {
        // Text between two tool calls: first paragraph is previous tool's output,
        // rest is regular text
        const [output, rest] = splitToolOutput(beforeText);
        segments[segments.length - 1].toolOutput = output;
        if (rest) {
          segments.push({ type: 'text', text: rest });
        }
      } else {
        segments.push({ type: 'text', text: beforeText });
      }
    }

    const toolLabel = match[1].trim();
    segments.push({
      type: 'tool',
      text: toolLabel,
      toolLabel,
      toolOutput: '',
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last tool call
  const remaining = content.slice(lastIndex).trim();
  if (remaining) {
    if (segments.length > 0 && segments[segments.length - 1].type === 'tool') {
      // First paragraph after tool call is output, rest is commentary
      const [output, rest] = splitToolOutput(remaining);
      segments[segments.length - 1].toolOutput = output;
      if (rest) {
        segments.push({ type: 'text', text: rest });
      }
    } else {
      segments.push({ type: 'text', text: remaining });
    }
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', text: content });
  }

  return segments;
}

function ToolChiclet({ segment }: { segment: ContentSegment }) {
  const [expanded, setExpanded] = useState(false);
  const toolName = getToolName(segment.toolLabel ?? '');
  // Strip the emoji prefix from the command for display
  const command = (segment.toolLabel ?? '').replace(/^\p{Emoji_Presentation}\s*|\p{Emoji}\uFE0F?\s*/u, '').trim();

  return (
    <div css={css`margin: 8px 0;`}>
      <button
        onClick={() => setExpanded(!expanded)}
        css={css`
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 16px;
          border: 1px solid rgba(128, 128, 128, 0.3);
          background: rgba(128, 128, 128, 0.08);
          cursor: pointer;
          color: inherit;
          font-size: 12px;
          font-family: inherit;
          transition: background 0.15s;
          &:hover {
            background: rgba(128, 128, 128, 0.15);
          }
        `}
      >
        <EuiIcon
          type={expanded ? 'arrowDown' : 'arrowRight'}
          size="s"
          css={css`flex-shrink: 0;`}
        />
        <EuiBadge color="hollow" css={css`font-size: 11px;`}>
          {toolName}
        </EuiBadge>
        <span css={css`
          opacity: 0.7;
          max-width: 300px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: monospace;
          font-size: 11px;
        `}>
          {command}
        </span>
      </button>
      {expanded && (
        <div
          css={css`
            margin-top: 6px;
            margin-left: 8px;
            padding: 10px 14px;
            border-left: 2px solid rgba(128, 128, 128, 0.3);
            font-size: 13px;
          `}
        >
          <div css={css`
            font-family: monospace;
            font-size: 12px;
            opacity: 0.8;
            margin-bottom: 6px;
            word-break: break-all;
          `}>
            $ {command}
          </div>
          {segment.toolOutput && (
            <EuiText size="s">
              <div css={css`white-space: pre-wrap; word-wrap: break-word;`}>
                {segment.toolOutput}
              </div>
            </EuiText>
          )}
        </div>
      )}
    </div>
  );
}

export function MessageContent({ content }: MessageContentProps) {
  const segments = parseContent(content);

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === 'tool') {
          return <ToolChiclet key={i} segment={segment} />;
        }
        return (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              p: ({children}) => <p css={css`margin: 0 0 0.5em; &:last-child { margin-bottom: 0; }`}>{children}</p>,
              code: ({className, children, ...props}) => {
                const isBlock = className?.startsWith('language-');
                return isBlock
                  ? <pre css={css`background: rgba(128,128,128,0.1); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.85em;`}><code {...props}>{children}</code></pre>
                  : <code css={css`background: rgba(128,128,128,0.1); padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.9em;`} {...props}>{children}</code>;
              },
              pre: ({children}) => <>{children}</>,
              a: ({children, href}) => <a href={href} target="_blank" rel="noopener noreferrer" css={css`color: var(--euiColorPrimary);`}>{children}</a>,
              ul: ({children}) => <ul css={css`margin: 0.5em 0; padding-left: 1.5em;`}>{children}</ul>,
              ol: ({children}) => <ol css={css`margin: 0.5em 0; padding-left: 1.5em;`}>{children}</ol>,
              table: ({children}) => <table css={css`border-collapse: collapse; width: 100%; margin: 0.5em 0; & th, & td { border: 1px solid rgba(128,128,128,0.3); padding: 6px 10px; text-align: left; }`}>{children}</table>,
            }}
          >
            {segment.text}
          </ReactMarkdown>
        );
      })}
    </>
  );
}
