import { useState } from 'react';
import { EuiBadge, EuiText, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';

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

function parseContent(content: string): ContentSegment[] {
  // Match tool calls: `<emoji> <command>` on their own line(s)
  // Pattern: newline(s), backtick, emoji + text, backtick, newline(s)
  const toolPattern = /\n?`(\p{Emoji_Presentation}[^`\n]*|\p{Emoji}\uFE0F[^`\n]*)`\n?/gu;

  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = toolPattern.exec(content)) !== null) {
    // Text before this tool call
    const beforeText = content.slice(lastIndex, match.index).trim();
    if (beforeText) {
      // Check if this text is output from a previous tool call
      if (segments.length > 0 && segments[segments.length - 1].type === 'tool') {
        segments[segments.length - 1].toolOutput = beforeText;
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
      segments[segments.length - 1].toolOutput = remaining;
    } else {
      segments.push({ type: 'text', text: remaining });
    }
  }

  // If no tool calls found, return the whole thing as text
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
          <span key={i} css={css`white-space: pre-wrap;`}>
            {segment.text}
          </span>
        );
      })}
    </>
  );
}
