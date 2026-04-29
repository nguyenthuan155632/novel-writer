# Bible Page Textarea Improvement Design

## Overview

Improve the Bible page textarea inputs by implementing tabbed sections with character/word count features. This addresses the current issues of small, simple textareas with poor visual hierarchy.

## Current State

The Bible edit form currently has:
- 7 plain textareas stacked vertically
- Basic styling with minimal visual hierarchy
- No character/word count
- No grouping of related fields
- Fixed row sizes that don't adapt to content

## Proposed Solution

### Tabbed Layout

Group the 7 fields into 4 logical tabs:

1. **World Tab**
   - World Rules

2. **Systems Tab**
   - Cultivation System
   - Bloodline System

3. **Style Tab**
   - Style Guide
   - Forbidden Rules

4. **Summary Tab**
   - Ending Direction
   - Compact Summary

### Textarea Improvements

- **Auto-expanding**: Textareas grow in height as content increases
- **Minimum height**: 200px for single fields, 180px for fields in pairs
- **Smooth transitions**: CSS transitions for height changes

### Character/Word Count

- Live word count displayed below each textarea
- Live character count displayed below each textarea
- Special handling for Compact Summary field:
  - Word limit: 1500 words
  - Visual warning when approaching/exceeding limit
  - Display format: "X / 1500 words"

### Visual Design

- Tab navigation with active state highlighting
- Clean card-based content area
- Consistent spacing and typography
- Responsive layout for mobile/desktop

## Technical Implementation

### Files to Modify

1. `apps/web/app/stories/[id]/bible/edit-form.tsx`
   - Add tab state management
   - Implement tabbed layout
   - Add character/word count logic
   - Add auto-expanding textarea behavior

2. `apps/web/app/globals.css`
   - Add tab styling
   - Add textarea improvements
   - Add count display styling

### Component Structure

```
EditForm
├── Tab Navigation (4 buttons)
├── Tab Content Area
│   ├── World Tab Content
│   ├── Systems Tab Content
│   ├── Style Tab Content
│   └── Summary Tab Content
└── Save Button
```

### State Management

- `activeTab`: Track which tab is currently selected
- Existing `data` state remains unchanged
- Count calculations derived from `data` values

### Auto-expanding Textarea

- Use `useRef` and `useEffect` to adjust height
- Reset height on content change
- Set minimum height based on field type

## Success Criteria

1. Textareas are properly sized and expand as needed
2. Related fields are grouped logically in tabs
3. Character/word counts update in real-time
4. Compact Summary shows word limit warning
5. Tab switching is smooth and intuitive
6. Form remains fully functional (save, validation)
7. Responsive design works on all screen sizes