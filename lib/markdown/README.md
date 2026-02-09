# Markdown Support

This app uses React Markdown libraries for rich text content in announcements.

## Installed Libraries

- **react-markdown** (v10.1.0) - Render markdown as React components
- **remark-gfm** (v4.0.1) - GitHub Flavored Markdown support (tables, strikethrough, task lists)
- **rehype-raw** (v7.0.0) - Allow HTML in markdown (use with caution)
- **@uiw/react-md-editor** (v4.0.11) - Markdown editor with live preview

## Usage

### Displaying Markdown Content

```tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-neutral dark:prose-invert max-w-none"
    >
      {content}
    </ReactMarkdown>
  );
}
```

### Markdown Editor Component

```tsx
'use client';

import MDEditor from '@uiw/react-md-editor';
import { useState } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your announcement...',
}: MarkdownEditorProps) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || '')}
        preview="edit"
        height={400}
        textareaProps={{
          placeholder,
        }}
      />
    </div>
  );
}
```

### Complete Announcement Form Example

```tsx
'use client';

import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CreateAnnouncementForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  return (
    <form>
      <Input
        placeholder="Announcement Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div data-color-mode="light" className="mt-4">
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || '')}
          preview="edit"
          height={400}
        />
      </div>

      <Button type="submit">Create Announcement</Button>
    </form>
  );
}
```

## Supported Markdown Features

### Basic Formatting
```markdown
**bold text**
*italic text*
~~strikethrough~~
`inline code`
```

### Headers
```markdown
# H1
## H2
### H3
```

### Lists
```markdown
- Unordered list
- Item 2
  - Nested item

1. Ordered list
2. Item 2
```

### Links and Images
```markdown
[Link text](https://example.com)
![Alt text](image-url.jpg)
```

### Code Blocks
````markdown
```javascript
const hello = 'world';
console.log(hello);
```
````

### Tables (GitHub Flavored Markdown)
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
```

### Task Lists (GitHub Flavored Markdown)
```markdown
- [x] Completed task
- [ ] Uncompleted task
```

### Blockquotes
```markdown
> This is a blockquote
> It can span multiple lines
```

## Styling Markdown Output

Use Tailwind's typography plugin for beautiful markdown styling:

```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-code:text-primary prose-pre:bg-muted"
>
  {content}
</ReactMarkdown>
```

## Security Considerations

**⚠️ IMPORTANT**: By default, we don't allow HTML in markdown for security reasons. If you need HTML support:

1. Use `rehype-raw` plugin (already installed)
2. Sanitize user input
3. Be aware of XSS vulnerabilities

```tsx
import rehypeRaw from 'rehype-raw';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeRaw]}
>
  {content}
</ReactMarkdown>
```

## Editor Customization

### Hide Preview (Edit-only mode)
```tsx
<MDEditor
  value={content}
  onChange={setContent}
  preview="edit"  // Only show editor
/>
```

### Split View (Side-by-side)
```tsx
<MDEditor
  value={content}
  onChange={setContent}
  preview="live"  // Show editor and preview
/>
```

### Preview Only
```tsx
<MDEditor.Markdown source={content} />
```

## Dark Mode Support

MDEditor supports dark mode via data-color-mode:

```tsx
<div data-color-mode="dark">
  <MDEditor value={content} onChange={setContent} />
</div>
```

Or use system preference:

```tsx
<div data-color-mode="auto">
  <MDEditor value={content} onChange={setContent} />
</div>
```

## Custom Toolbar

```tsx
<MDEditor
  value={content}
  onChange={setContent}
  commands={[
    commands.bold,
    commands.italic,
    commands.strikethrough,
    commands.hr,
    commands.title,
    commands.link,
    commands.quote,
    commands.code,
    commands.codeBlock,
    commands.unorderedListCommand,
    commands.orderedListCommand,
  ]}
/>
```

## Resources

- [react-markdown documentation](https://github.com/remarkjs/react-markdown)
- [remark-gfm documentation](https://github.com/remarkjs/remark-gfm)
- [MDEditor documentation](https://uiwjs.github.io/react-md-editor/)
- [Markdown Guide](https://www.markdownguide.org/)
