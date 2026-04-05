import { useState } from 'react';
import { EuiBadge, EuiText, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import type { A2APart, FilePart } from '../types';

interface MessageContentProps {
  content: string;
  parts?: A2APart[];
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

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p css={css`margin: 0 0 0.5em; &:last-child { margin-bottom: 0; }`}>{children}</p>
  ),
  code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
    const isBlock = className?.startsWith('language-');
    return isBlock
      ? <pre css={css`background: rgba(128,128,128,0.1); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.85em;`}><code {...props}>{children}</code></pre>
      : <code css={css`background: rgba(128,128,128,0.1); padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.9em;`} {...props}>{children}</code>;
  },
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" css={css`color: var(--euiColorPrimary);`}>{children}</a>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => <ul css={css`margin: 0.5em 0; padding-left: 1.5em;`}>{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol css={css`margin: 0.5em 0; padding-left: 1.5em;`}>{children}</ol>,
  table: ({ children }: { children?: React.ReactNode }) => (
    <table css={css`border-collapse: collapse; width: 100%; margin: 0.5em 0; & th, & td { border: 1px solid rgba(128,128,128,0.3); padding: 6px 10px; text-align: left; }`}>{children}</table>
  ),
};

function getToolName(label: string): string {
  for (const [emoji, name] of Object.entries(TOOL_EMOJI_MAP)) {
    if (label.startsWith(emoji)) return name;
  }
  const emojiMatch = label.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u);
  if (emojiMatch) return 'Tool';
  return 'Tool';
}

/**
 * Split text after a tool call into the tool's immediate output
 * (first paragraph) and the remaining commentary text.
 */
function splitToolOutput(text: string): [string, string] {
  const breakIdx = text.search(/\n\s*\n/);
  if (breakIdx === -1) {
    return [text.trim(), ''];
  }
  return [text.slice(0, breakIdx).trim(), text.slice(breakIdx).trim()];
}

function parseContent(content: string): ContentSegment[] {
  const toolPattern = /\n?`(\p{Emoji_Presentation}[^`\n]*|\p{Emoji}\uFE0F[^`\n]*)`\n?/gu;

  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = toolPattern.exec(content)) !== null) {
    const beforeText = content.slice(lastIndex, match.index).trim();
    if (beforeText) {
      if (segments.length > 0 && segments[segments.length - 1].type === 'tool') {
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

  const remaining = content.slice(lastIndex).trim();
  if (remaining) {
    if (segments.length > 0 && segments[segments.length - 1].type === 'tool') {
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

function FilePartRenderer({ part }: { part: FilePart }) {
  const { file } = part;
  const mimeType = file.mimeType ?? '';
  const fileName = file.name ?? 'file';

  const src = file.uri
    ? file.uri
    : file.bytes
      ? `data:${mimeType};base64,${file.bytes}`
      : undefined;

  if (mimeType.startsWith('image/') && src) {
    return (
      <img
        src={src}
        alt={fileName}
        css={css`max-width: 100%; border-radius: 8px; margin: 8px 0;`}
      />
    );
  }

  if (mimeType.startsWith('audio/') && src) {
    return (
      <audio
        controls
        src={src}
        css={css`width: 100%; margin: 8px 0;`}
      />
    );
  }

  if (src) {
    return (
      <a href={src} download={fileName} css={css`display: inline-block; margin: 8px 0;`}>
        {fileName}
      </a>
    );
  }

  return <span>{fileName} (no data)</span>;
}

function DataPartRenderer({ data }: { data: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);

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
          &:hover { background: rgba(128, 128, 128, 0.15); }
        `}
      >
        <EuiIcon
          type={expanded ? 'arrowDown' : 'arrowRight'}
          size="s"
          css={css`flex-shrink: 0;`}
        />
        <EuiBadge color="hollow" css={css`font-size: 11px;`}>Data</EuiBadge>
      </button>
      {expanded && (
        <pre
          css={css`
            margin-top: 6px;
            margin-left: 8px;
            padding: 10px 14px;
            border-left: 2px solid rgba(128, 128, 128, 0.3);
            font-size: 12px;
            background: rgba(128,128,128,0.05);
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
          `}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function renderTextWithMedia(text: string): React.ReactNode[] | null {
  const mediaPattern = /MEDIA:(\/[^\s\n]+)/g;

  if (!mediaPattern.test(text)) {
    return null;
  }

  // Reset lastIndex after test
  mediaPattern.lastIndex = 0;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mediaPattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      nodes.push(
        <ReactMarkdown
          key={`t-${lastIndex}`}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={markdownComponents}
        >
          {before}
        </ReactMarkdown>
      );
    }

    const filePath = match[1];
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    const src = `/api/files/?path=${encodeURIComponent(filePath)}`;

    if (IMAGE_EXTS.includes(ext)) {
      nodes.push(
        <img
          key={`m-${match.index}`}
          src={src}
          alt={filePath.split('/').pop() ?? 'image'}
          css={css`max-width: 100%; border-radius: 8px; margin: 8px 0;`}
        />
      );
    } else if (AUDIO_EXTS.includes(ext)) {
      nodes.push(
        <audio
          key={`m-${match.index}`}
          controls
          src={src}
          css={css`width: 100%; margin: 8px 0;`}
        />
      );
    } else {
      nodes.push(
        <a key={`m-${match.index}`} href={src} download>
          {filePath.split('/').pop()}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    nodes.push(
      <ReactMarkdown
        key={`t-${lastIndex}`}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {remaining}
      </ReactMarkdown>
    );
  }

  return nodes.length > 0 ? nodes : null;
}

function renderTextSegment(text: string, key: string | number) {
  const mediaNodes = renderTextWithMedia(text);
  if (mediaNodes) {
    return <div key={key}>{mediaNodes}</div>;
  }

  return (
    <ReactMarkdown
      key={key}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={markdownComponents}
    >
      {text}
    </ReactMarkdown>
  );
}

function renderSegments(segments: ContentSegment[]) {
  return segments.map((segment, i) => {
    if (segment.type === 'tool') {
      return <ToolChiclet key={i} segment={segment} />;
    }
    return renderTextSegment(segment.text, i);
  });
}

function consolidateTextParts(parts: A2APart[]): A2APart[] {
  const result: A2APart[] = [];
  for (const part of parts) {
    const last = result[result.length - 1];
    if (part.kind === 'text' && last && last.kind === 'text') {
      result[result.length - 1] = { kind: 'text', text: last.text + part.text };
    } else {
      result.push(part);
    }
  }
  return result;
}

export function MessageContent({ content, parts }: MessageContentProps) {
  // If parts are provided, render by part kind
  if (parts && parts.length > 0) {
    const consolidated = consolidateTextParts(parts);
    return (
      <>
        {consolidated.map((part, i) => {
          if (part.kind === 'text') {
            const segments = parseContent(part.text);
            return <div key={i}>{renderSegments(segments)}</div>;
          }
          if (part.kind === 'file') {
            return <FilePartRenderer key={i} part={part} />;
          }
          if (part.kind === 'data') {
            return <DataPartRenderer key={i} data={part.data} />;
          }
          return null;
        })}
      </>
    );
  }

  // Fallback: render content string (backward compat)
  const segments = parseContent(content);
  return <>{renderSegments(segments)}</>;
}
