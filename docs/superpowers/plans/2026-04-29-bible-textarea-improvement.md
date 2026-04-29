# Bible Textarea Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the Bible page textarea inputs by implementing tabbed sections with character/word count features.

**Architecture:** Refactor the existing `EditForm` component to use a tabbed layout with 4 logical groups, add auto-expanding textarea behavior, and implement live character/word counting.

**Tech Stack:** Next.js, React, TypeScript, CSS

---

## File Structure

- `apps/web/app/stories/[id]/bible/edit-form.tsx` - Main component to refactor
- `apps/web/app/globals.css` - Add new CSS styles for tabs and textareas

---

### Task 1: Add CSS Styles for Tabs and Textareas

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Add tab navigation styles**

```css
.tabs {
  display: flex;
  border-bottom: 2px solid #e5e5e5;
  margin-bottom: 20px;
}

.tab-button {
  padding: 12px 24px;
  border: none;
  background: #f0f0f0;
  color: #666;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background: #e0e0e0;
}

.tab-button.active {
  background: #1a4ed8;
  color: white;
}

.tab-button + .tab-button {
  margin-left: 4px;
}
```

- [ ] **Step 2: Add tab content styles**

```css
.tab-content {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 20px;
}

.tab-panel {
  display: none;
}

.tab-panel.active {
  display: block;
}
```

- [ ] **Step 3: Add textarea improvement styles**

```css
.textarea-group {
  margin-bottom: 16px;
}

.textarea-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  margin-top: 0;
}

.textarea-group textarea {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  width: 100%;
  font: inherit;
  resize: vertical;
  min-height: 200px;
  transition: border-color 0.2s ease;
}

.textarea-group textarea:focus {
  outline: none;
  border-color: #1a4ed8;
  box-shadow: 0 0 0 3px rgba(26, 78, 216, 0.1);
}
```

- [ ] **Step 4: Add character/word count styles**

```css
.textarea-count {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}

.textarea-count.warning {
  color: #b91c1c;
}
```

- [ ] **Step 5: Commit CSS changes**

```bash
git add apps/web/app/globals.css
git commit -m "feat: add CSS styles for tabbed textarea layout"
```

---

### Task 2: Refactor EditForm with Tabbed Layout

**Files:**
- Modify: `apps/web/app/stories/[id]/bible/edit-form.tsx`

- [ ] **Step 1: Add activeTab state and tab configuration**

```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

interface Bible {
  worldRules: string;
  cultivationSystem: string;
  bloodlineSystem: string;
  styleGuide: string;
  forbiddenRules: string;
  endingDirection: string | null;
  compactSummary: string | null;
}

type TabId = 'world' | 'systems' | 'style' | 'summary';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: 'world', label: 'World', icon: '🌍' },
  { id: 'systems', label: 'Systems', icon: '⚔️' },
  { id: 'style', label: 'Style', icon: '✍️' },
  { id: 'summary', label: 'Summary', icon: '📝' },
];
```

- [ ] **Step 2: Add helper functions for counting**

```typescript
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function countChars(text: string): number {
  return text.length;
}
```

- [ ] **Step 3: Update EditForm component with tab state**

```typescript
export function EditForm({ storyId, bible }: { storyId: string; bible: Bible }) {
  const [data, setData] = useState({
    worldRules: bible.worldRules,
    cultivationSystem: bible.cultivationSystem,
    bloodlineSystem: bible.bloodlineSystem,
    styleGuide: bible.styleGuide,
    forbiddenRules: bible.forbiddenRules,
    endingDirection: bible.endingDirection ?? '',
    compactSummary: bible.compactSummary ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('world');
  const router = useRouter();

  function bind<K extends keyof typeof data>(k: K) {
    return {
      value: data[k],
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setData({ ...data, [k]: e.target.value }),
    };
  }

  async function save() {
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/api/stories/${storyId}/bible`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
```

- [ ] **Step 4: Add render helper for textarea with count**

```typescript
  function renderTextareaWithCount(
    key: keyof typeof data,
    label: string,
    rows: number,
    placeholder: string,
    wordLimit?: number
  ) {
    const value = data[key];
    const words = countWords(value);
    const chars = countChars(value);
    const isWarning = wordLimit && words > wordLimit;

    return (
      <div className="textarea-group">
        <label>{label}</label>
        <textarea
          rows={rows}
          {...bind(key)}
          placeholder={placeholder}
        />
        <div className={`textarea-count ${isWarning ? 'warning' : ''}`}>
          <span>{words} words</span>
          <span>{wordLimit ? `${words} / ${wordLimit} words` : `${chars} characters`}</span>
        </div>
      </div>
    );
  }
```

- [ ] **Step 5: Add tab content rendering**

```typescript
  function renderTabContent() {
    switch (activeTab) {
      case 'world':
        return (
          <div className="tab-panel active">
            {renderTextareaWithCount(
              'worldRules',
              'World Rules',
              8,
              'Describe the world rules, setting, and environment...'
            )}
          </div>
        );

      case 'systems':
        return (
          <div className="tab-panel active">
            {renderTextareaWithCount(
              'cultivationSystem',
              'Cultivation System',
              6,
              'Describe the cultivation system...'
            )}
            {renderTextareaWithCount(
              'bloodlineSystem',
              'Bloodline System',
              6,
              'Describe the bloodline system...'
            )}
          </div>
        );

      case 'style':
        return (
          <div className="tab-panel active">
            {renderTextareaWithCount(
              'styleGuide',
              'Style Guide',
              6,
              'Describe the writing style guide...'
            )}
            {renderTextareaWithCount(
              'forbiddenRules',
              'Forbidden Rules',
              6,
              'List forbidden rules and elements...'
            )}
          </div>
        );

      case 'summary':
        return (
          <div className="tab-panel active">
            {renderTextareaWithCount(
              'endingDirection',
              'Ending Direction',
              4,
              'Describe the planned ending direction...'
            )}
            {renderTextareaWithCount(
              'compactSummary',
              'Compact Summary (≤ 1500 words)',
              8,
              'Write a compact summary for HOT cache...',
              1500
            )}
          </div>
        );
    }
  }
```

- [ ] **Step 6: Update return statement with tabbed layout**

```typescript
  return (
    <div className="card">
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {renderTabContent()}
      </div>

      {err && <p className="error">{err}</p>}
      <button className="primary" onClick={save} disabled={saving} style={{ marginTop: 12 }}>
        {saving ? 'Saving...' : 'Save (creates new version)'}
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Commit component changes**

```bash
git add apps/web/app/stories/[id]/bible/edit-form.tsx
git commit -m "feat: implement tabbed textarea layout with word count"
```

---

### Task 3: Add Auto-expanding Textarea Behavior

**Files:**
- Modify: `apps/web/app/stories/[id]/bible/edit-form.tsx`

- [ ] **Step 1: Add useRef and useEffect imports**

```typescript
'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
```

- [ ] **Step 2: Add auto-expand function**

```typescript
  function autoExpand(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
```

- [ ] **Step 3: Update renderTextareaWithCount to include auto-expand**

```typescript
  function renderTextareaWithCount(
    key: keyof typeof data,
    label: string,
    rows: number,
    placeholder: string,
    wordLimit?: number
  ) {
    const value = data[key];
    const words = countWords(value);
    const chars = countChars(value);
    const isWarning = wordLimit && words > wordLimit;

    return (
      <div className="textarea-group">
        <label>{label}</label>
        <textarea
          rows={rows}
          {...bind(key)}
          placeholder={placeholder}
          onInput={(e) => autoExpand(e.currentTarget)}
        />
        <div className={`textarea-count ${isWarning ? 'warning' : ''}`}>
          <span>{words} words</span>
          <span>{wordLimit ? `${words} / ${wordLimit} words` : `${chars} characters`}</span>
        </div>
      </div>
    );
  }
```

- [ ] **Step 4: Commit auto-expand changes**

```bash
git add apps/web/app/stories/[id]/bible/edit-form.tsx
git commit -m "feat: add auto-expanding textarea behavior"
```

---

### Task 4: Test and Verify

**Files:**
- None (testing only)

- [ ] **Step 1: Run TypeScript compiler to check for errors**

```bash
cd /Users/thuan.nv/workspaces/novel-writer/apps/web && npm run typecheck
```

Expected: No errors

- [ ] **Step 2: Run linter to check code quality**

```bash
cd /Users/thuan.nv/workspaces/novel-writer/apps/web && npm run lint
```

Expected: No errors

- [ ] **Step 3: Start dev server and test manually**

```bash
cd /Users/thuan.nv/workspaces/novel-writer && npm run dev
```

Expected: Server starts successfully, Bible page loads with tabbed interface

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: address any issues found during testing"
```

---

## Success Criteria

1. ✅ Textareas are properly sized and expand as needed
2. ✅ Related fields are grouped logically in tabs
3. ✅ Character/word counts update in real-time
4. ✅ Compact Summary shows word limit warning
5. ✅ Tab switching is smooth and intuitive
6. ✅ Form remains fully functional (save, validation)
7. ✅ Responsive design works on all screen sizes