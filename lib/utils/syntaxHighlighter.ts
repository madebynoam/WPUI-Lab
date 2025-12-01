/**
 * Simple syntax highlighter for JSX code
 * Returns an array of tokens with type and content
 */
export interface Token {
  type: 'keyword' | 'string' | 'tag' | 'attribute' | 'comment' | 'function' | 'number' | 'text';
  content: string;
}

const KEYWORDS = new Set([
  'import', 'export', 'from', 'const', 'let', 'var', 'function', 'return',
  'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'switch', 'case',
  'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new',
  'typeof', 'instanceof', 'true', 'false', 'null', 'undefined', 'this',
]);

/**
 * Parse JSX tag and break it down into tokens for attribute highlighting
 */
function parseJSXTag(tagContent: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  // Opening <
  tokens.push({ type: 'text', content: '<' });
  i++;

  // Tag name (until whitespace or > or /)
  let nameEnd = i;
  while (nameEnd < tagContent.length && /[a-zA-Z0-9_$\-:/]/.test(tagContent[nameEnd])) nameEnd++;
  if (nameEnd > i) {
    tokens.push({ type: 'tag', content: tagContent.slice(i, nameEnd) });
    i = nameEnd;
  }

  // Parse attributes and rest of tag
  while (i < tagContent.length) {
    const char = tagContent[i];

    if (/\s/.test(char)) {
      // Whitespace
      tokens.push({ type: 'text', content: char });
      i++;
    } else if (/[a-zA-Z_$]/.test(char)) {
      // Attribute name
      let nameStart = i;
      while (i < tagContent.length && /[a-zA-Z0-9_$\-:]/.test(tagContent[i])) i++;
      tokens.push({ type: 'attribute', content: tagContent.slice(nameStart, i) });
    } else if ((char === '/' || char === '>') && i === tagContent.length - 1) {
      // Self-closing tag or closing bracket
      if (char === '/' && tagContent[i + 1] === '>') {
        tokens.push({ type: 'text', content: ' />' });
        i += 2;
      } else if (char === '>') {
        tokens.push({ type: 'text', content: '>' });
        i++;
      }
    } else {
      // Everything else (=, quotes, braces, values)
      tokens.push({ type: 'text', content: char });
      i++;
    }
  }

  return tokens;
}

export const highlightCode = (code: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Comments
    if (code[i] === '/' && code[i + 1] === '/') {
      let end = i;
      while (end < code.length && code[end] !== '\n') end++;
      tokens.push({ type: 'comment', content: code.slice(i, end) });
      i = end;
      continue;
    }

    // Strings (double quotes)
    if (code[i] === '"') {
      let end = i + 1;
      while (end < code.length && code[end] !== '"') {
        if (code[end] === '\\') end++;
        end++;
      }
      end++;
      tokens.push({ type: 'string', content: code.slice(i, end) });
      i = end;
      continue;
    }

    // Strings (single quotes)
    if (code[i] === "'") {
      let end = i + 1;
      while (end < code.length && code[end] !== "'") {
        if (code[end] === '\\') end++;
        end++;
      }
      end++;
      tokens.push({ type: 'string', content: code.slice(i, end) });
      i = end;
      continue;
    }

    // Strings (backticks)
    if (code[i] === '`') {
      let end = i + 1;
      while (end < code.length && code[end] !== '`') {
        if (code[end] === '\\') end++;
        end++;
      }
      end++;
      tokens.push({ type: 'string', content: code.slice(i, end) });
      i = end;
      continue;
    }

    // JSX Tags
    if (code[i] === '<' && /[A-Za-z/!]/.test(code[i + 1])) {
      let end = i + 1;
      while (end < code.length && code[end] !== '>') end++;
      end++;
      const tagContent = code.slice(i, end);
      const tagTokens = parseJSXTag(tagContent);
      tokens.push(...tagTokens);
      i = end;
      continue;
    }

    // Numbers
    if (/\d/.test(code[i])) {
      let end = i;
      while (end < code.length && /[\d.]/.test(code[end])) end++;
      tokens.push({ type: 'number', content: code.slice(i, end) });
      i = end;
      continue;
    }

    // Keywords and identifiers
    if (/[a-zA-Z_$]/.test(code[i])) {
      let end = i;
      while (end < code.length && /[a-zA-Z0-9_$]/.test(code[end])) end++;
      const word = code.slice(i, end);

      if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', content: word });
      } else if (end < code.length && code[end] === '(') {
        tokens.push({ type: 'function', content: word });
      } else {
        tokens.push({ type: 'text', content: word });
      }
      i = end;
      continue;
    }

    // Everything else (spaces, operators, etc)
    tokens.push({ type: 'text', content: code[i] });
    i++;
  }

  return tokens;
};
