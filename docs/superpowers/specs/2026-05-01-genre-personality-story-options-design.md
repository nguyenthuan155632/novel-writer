# Genre, Personality & Story Options — Design Spec

**Date:** 2026-05-01
**Status:** Approved (brainstorm phase) → ready for implementation plan
**Owners:** Novel Writer pipeline

## 1. Problem

Pipeline đang giả định mặc định "tiểu thuyết tiên hiệp/huyền huyễn" ở mọi tầng:

- `stories.genre` là free-text, default `'xianxia_fantasy'`; UI New Story dùng plain `<input>`.
- `story_bibles.cultivation_system` và `bloodline_system` là `NOT NULL` + Zod `min(50)` — không thể tạo bible cho Đô thị / Võ thuật / Dị năng mà không bịa.
- Cả 11 prompt (`bible-generator`, `saga-planner`, `arc-planner`, `packet-generator`, `writer`, `llm-validator`, `auto-fixer`, `canon-extractor`, `summary-compactor`, `arc-summary-compactor`, `high-stakes-reviewer`) đều mở đầu bằng "Bạn là … cho tiểu thuyết tiên hiệp/huyền huyễn".
- `realmJumpCheck` (severity=critical) và `newBloodlineSourceCheck` chạy trên mọi chương — vô nghĩa cho non-cultivation genre nhưng vẫn tốn cycle và tạo nhiễu log.
- `packet-auditor` cũng dùng `REALM_ORDER` cứng.
- Không có khái niệm "personality" cho main character ở story-level; `characters.personality` là free text, dễ drift sau vài chương.

Hệ quả: user chọn "Đô thị" sẽ vẫn nhận chương có tu tiên / linh căn / pháp bảo.

## 2. Goals

1. Genre + Main Character Personality trở thành **first-class contract** xuyên suốt pipeline, không hard-code rải rác.
2. Bible schema generic-hóa — power system tách khỏi giả định cultivation.
3. UI New Story có dropdown cho Genre, Personality, và 10 option phụ (Tone, Pacing, Conflict Type, Power System Style, World Era, Romance/Comedy/Dark Level, POV, Morality).
4. Validators gate theo genre family — không fire false-positive cho non-cultivation.
5. Backward compatible: story cũ (`genre='xianxia_fantasy'`) vẫn chạy đúng.
6. Lock genre sau khi bible đã sinh để bảo vệ canon.

## 3. Non-goals

- KHÔNG viết lại `realmJumpCheck` thành generic `powerProgressionJumpCheck` cho mọi family (defer; phase sau).
- KHÔNG thêm validator mới cho non-cultivation family (defer; phase sau).
- KHÔNG migrate `characters.currentRealm` / `bloodlines` table sang generic — giữ tiếp cho cultivation, chấp nhận trống cho non-cultivation.
- KHÔNG lock personality / story options sau khi tạo (chỉ warning).
- KHÔNG smoke e2e với real LLM trong CI.

## 4. Architecture overview

```
┌──────────────────────────────────────────────────────────────────┐
│ packages/core/src/catalog/  ◀── single source of truth          │
│   genres.ts (24)                                                  │
│   personalities.ts (20)                                           │
│   story-options.ts (10 × N)                                       │
│   schemas.ts (Zod refinements)                                    │
└──────┬─────────────────────────┬─────────────────────────┬──────┘
       │                         │                         │
       ▼                         ▼                         ▼
   apps/web/app                apps/api/src/routes      packages/ai
   stories/new/page.tsx        stories.ts (Zod)         prompts/v2 + contracts/
   stories/[id]/settings       story-settings.ts        validators (gated by family)
                                                        context/builder.ts
                                                        agents/bible-generator
                                                                 │
                                                                 ▼
                                                        apps/worker
                                                        loadStoryContext() →
                                                        GenreDef, PersonalityDef,
                                                        StoryOptions →
                                                        all agents
```

## 5. Data model changes

### 5.1 Migrations

**`0012_genre_personality.sql`** (additive):

```sql
ALTER TABLE stories
  ADD COLUMN main_character_personality text NOT NULL DEFAULT 'tram_on';

ALTER TABLE stories
  ADD COLUMN genre_locked_at timestamptz NULL;

ALTER TABLE stories
  ALTER COLUMN genre SET DEFAULT 'tien_hiep';

UPDATE stories SET genre = 'tien_hiep' WHERE genre = 'xianxia_fantasy';

UPDATE stories
  SET genre = 'tuy_chon'
  WHERE genre NOT IN (
    'tien_hiep','huyen_huyen','vo_thuat','cao_vo','do_thi','di_nang','mat_the',
    'khoa_huyen','kiem_hiep','tu_chan','di_gioi','he_thong','trong_sinh',
    'xuyen_khong','lich_su_gia_tuong','cung_dau','linh_di','trinh_tham',
    'quan_su','tay_huyen','dong_phuong_huyen_bi','vong_du','hac_am_fantasy',
    'do_thi_tu_tien','do_thi_di_nang','tuy_chon'
  );

-- Lock genre cho story đã có bible
UPDATE stories s SET genre_locked_at = NOW()
  WHERE EXISTS (SELECT 1 FROM story_bibles b WHERE b.story_id = s.id);
```

**`0013_bible_generic_power_system.sql`** (additive + backfill, không drop):

```sql
ALTER TABLE story_bibles
  ADD COLUMN power_system text NULL,
  ADD COLUMN power_system_kind text NOT NULL DEFAULT 'cultivation';

ALTER TABLE story_bibles
  ALTER COLUMN cultivation_system DROP NOT NULL,
  ALTER COLUMN bloodline_system DROP NOT NULL;

UPDATE story_bibles
  SET power_system = COALESCE(cultivation_system, '') || E'\n\n' || COALESCE(bloodline_system, '')
  WHERE power_system IS NULL;

UPDATE story_bibles
  SET power_system = '(legacy bible — chưa migrate)'
  WHERE power_system IS NULL OR length(trim(power_system)) < 50;

ALTER TABLE story_bibles
  ALTER COLUMN power_system SET NOT NULL;
```

`cultivation_system` và `bloodline_system` cố ý KHÔNG drop — giữ làm legacy field để Bible UI cũ tiếp tục đọc, và prompt v2 vẫn populate cho family `cultivation`.

### 5.2 Drizzle schema

`packages/db/src/schema/stories.ts`:

```ts
export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  premise: text('premise').notNull(),
  genre: text('genre').default('tien_hiep').notNull(),
  mainCharacterPersonality: text('main_character_personality').default('tram_on').notNull(),
  tone: text('tone'),
  targetChapterCount: integer('target_chapter_count').default(1000).notNull(),
  status: text('status').default('draft').notNull(),
  totalCostUsd: numeric('total_cost_usd', { precision: 12, scale: 6 }).default('0').notNull(),
  genreLockedAt: timestamp('genre_locked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

`packages/db/src/schema/story-bibles.ts`:

```ts
export const storyBibles = pgTable('story_bibles', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  version: integer('version').default(1).notNull(),
  worldRules: text('world_rules').notNull(),
  powerSystem: text('power_system').notNull(),
  powerSystemKind: text('power_system_kind').default('cultivation').notNull(),
  cultivationSystem: text('cultivation_system'),
  bloodlineSystem: text('bloodline_system'),
  styleGuide: text('style_guide').notNull(),
  forbiddenRules: text('forbidden_rules').notNull(),
  endingDirection: text('ending_direction'),
  compactSummary: text('compact_summary'),
  styleFewShots: jsonb('style_few_shots').$type<{ excerpt: string; sourceChapter?: number }[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### 5.3 `story_settings.overrides.storyOptions` shape

Không thêm column; reuse jsonb. Shape:

```ts
type StoryOptions = {
  tone?: ToneSlug;                    // 'serious' | 'humorous' | 'dark' | 'tragic' | 'soft'
  pacing?: PacingSlug;                // 'slow' | 'medium' | 'fast' | 'climax_heavy'
  mainConflictType?: ConflictSlug;    // 'revenge' | 'survival' | 'power_struggle' | 'mystery' | 'growth'
  powerSystemStyle?: PowerStyleSlug;  // 'realm' | 'level' | 'skill' | 'ability' | 'martial' | 'tech'
  worldEra?: EraSlug;                 // 'ancient' | 'modern' | 'future' | 'otherworld' | 'post_apocalypse'
  romanceLevel?: LevelSlug;           // 'none' | 'light' | 'medium' | 'heavy'
  comedyLevel?: LevelSlug;            // same
  darkLevel?: DarkLevelSlug;          // 'bright' | 'neutral' | 'dark' | 'extreme_dark'
  pov?: PovSlug;                      // 'third_limited' | 'third_omniscient' | 'first'
  protagonistMorality?: MoralitySlug; // 'righteous' | 'pragmatic' | 'antihero' | 'villain'
};
```

Tất cả field optional ở DB; Zod sẽ default sensible value khi render prompt (xem §6.5).

## 6. Catalog module

`packages/core/src/catalog/`:

### 6.1 Types & families

`genre-families.ts`:

```ts
export type GenreFamily =
  | 'cultivation'    // tiên hiệp, huyền huyễn, tu chân, đô thị tu tiên
  | 'martial'        // võ thuật, kiếm hiệp, cao võ
  | 'ability'        // dị năng, đô thị dị năng
  | 'tech'           // khoa huyễn
  | 'urban'          // đô thị (thuần)
  | 'historical'     // lịch sử giả tưởng, cung đấu, quân sự
  | 'horror'         // linh dị, hắc ám fantasy
  | 'mystery'        // trinh thám
  | 'system'         // hệ thống
  | 'reincarnation'  // trọng sinh, xuyên không
  | 'mixed'          // dị giới, võng du, tây huyền, đông phương huyền bí, mạt thế
  | 'none';          // tuy_chon — không ràng buộc family
```

### 6.2 `GenreDef` shape

```ts
export type GenreSlug =
  | 'tien_hiep' | 'huyen_huyen' | 'vo_thuat' | 'cao_vo' | 'do_thi' | 'di_nang'
  | 'mat_the' | 'khoa_huyen' | 'kiem_hiep' | 'tu_chan' | 'di_gioi' | 'he_thong'
  | 'trong_sinh' | 'xuyen_khong' | 'lich_su_gia_tuong' | 'cung_dau' | 'linh_di'
  | 'trinh_tham' | 'quan_su' | 'tay_huyen' | 'dong_phuong_huyen_bi' | 'vong_du'
  | 'hac_am_fantasy' | 'do_thi_tu_tien' | 'do_thi_di_nang' | 'tuy_chon';

export type GenreDef = {
  slug: GenreSlug;
  viLabel: string;
  viDescription: string;
  family: GenreFamily;
  allowedTropes: string[];
  discouragedTropes: string[];
  toneGuidance: string;
  worldbuildingGuidance: string;
  examplePremises: string[];
};
```

Implementer phải viết tay đủ 25 entry (24 + `tuy_chon`). Mẫu cho 4 entry quan trọng nhất — implementer nhân theo:

```ts
{
  slug: 'tien_hiep',
  viLabel: 'Tiên hiệp',
  viDescription: 'Tu luyện cảnh giới, tông môn, pháp bảo, huyết mạch, khí vận, đại đạo.',
  family: 'cultivation',
  allowedTropes: [
    'tu luyện', 'cảnh giới', 'đột phá', 'tông môn', 'pháp bảo',
    'huyết mạch', 'linh khí', 'đan dược', 'bí cảnh', 'khí vận', 'phi thăng',
  ],
  discouragedTropes: ['súng đạn hiện đại', 'điện thoại di động', 'AI', 'internet'],
  toneGuidance: 'Cinematic, có nội tâm; "show, don\'t tell"; tránh harem mặc định và "ding hệ thống".',
  worldbuildingGuidance: 'Thế giới có cảnh giới rõ ràng, tông môn-thế gia, đại lục/châu lục/thiên giới.',
  examplePremises: [
    'Một phế vật bị đuổi khỏi gia tộc, vô tình thừa kế truyền thừa thượng cổ.',
  ],
},
{
  slug: 'do_thi',
  viLabel: 'Đô thị',
  viDescription: 'Bối cảnh thành phố hiện đại, conflict tiền bạc/quyền lực/bí mật/gia đình.',
  family: 'urban',
  allowedTropes: [
    'công ty', 'gia tộc hiện đại', 'tổ chức ngầm', 'thương trường',
    'âm mưu chính trị', 'truyền thông', 'mạng xã hội',
  ],
  discouragedTropes: [
    'tu tiên', 'linh căn', 'cảnh giới', 'tông môn', 'pháp bảo',
    'huyết mạch tiên đạo', 'phi thăng', 'tiên giới',
  ],
  toneGuidance: 'Hiện thực gần đời thường, dialogue tự nhiên, tiết tấu vừa phải.',
  worldbuildingGuidance: 'Thành phố lớn, công ty/tập đoàn, gia đình, xã hội. KHÔNG bắt buộc có siêu năng lực.',
  examplePremises: [
    'Một nhân viên trẻ phát hiện sếp mình đang tham ô và bị cuốn vào âm mưu lớn hơn.',
  ],
},
{
  slug: 'di_nang',
  viLabel: 'Dị năng',
  viDescription: 'Năng lực đặc biệt, tổ chức ngầm, thí nghiệm, xã hội hiện đại hoặc bán hiện đại.',
  family: 'ability',
  allowedTropes: [
    'siêu năng lực', 'awakening', 'tổ chức bí mật', 'cơ quan chính phủ ẩn',
    'thí nghiệm', 'mutant', 'năng lực phụ',
  ],
  discouragedTropes: [
    'tu tiên', 'cảnh giới', 'tông môn', 'pháp bảo', 'phi thăng',
    'cổ trang huyền huyễn',
  ],
  toneGuidance: 'Pha trộn realism + supernatural; conflict gắn với khám phá năng lực và tổ chức.',
  worldbuildingGuidance: 'Hiện đại hoặc bán hiện đại; có "thế giới ngầm" của người có năng lực.',
  examplePremises: [
    'Một sinh viên y khoa bỗng dưng thức tỉnh năng lực chữa lành và bị săn đuổi.',
  ],
},
{
  slug: 'cao_vo',
  viLabel: 'Cao võ',
  viDescription: 'Thế giới võ lực cá nhân cao, hệ thống cấp bậc chiến lực, học viện/quân đội/võ đạo.',
  family: 'martial',
  allowedTropes: [
    'cấp chiến lực', 'võ giả', 'học viện võ', 'dị thú', 'chiến trường',
    'kỹ năng võ', 'nội lực', 'hấp thụ năng lượng',
  ],
  discouragedTropes: [
    'tu tiên thuần', 'phi thăng tiên giới', 'pháp bảo cổ điển', 'linh căn tu chân',
  ],
  toneGuidance: 'Hành động dồn dập, có phân tích chiến đấu, tránh triết lý đạo quá nhiều.',
  worldbuildingGuidance: 'Có hệ thống cấp bậc võ giả rõ ràng (vd 9 cấp); có học viện hoặc quân đoàn võ.',
  examplePremises: [
    'Một thiếu niên nghèo gia nhập học viện võ đạo bằng tài năng dị biệt.',
  ],
},
```

`tuy_chon` (sentinel):

```ts
{
  slug: 'tuy_chon',
  viLabel: 'Tuỳ chọn (do bible quyết định)',
  viDescription: 'Không ràng buộc thể loại — model bám sát bible làm nguồn duy nhất.',
  family: 'none',
  allowedTropes: [],
  discouragedTropes: [],
  toneGuidance: 'Bám sát bible đã được duyệt; không thiên về thể loại nào.',
  worldbuildingGuidance: 'Bible là nguồn duy nhất; không tự ý đưa trope mới.',
  examplePremises: [],
},
```

### 6.3 `PersonalityDef` shape

```ts
export type PersonalitySlug =
  | 'calm_rational' | 'cold_quiet' | 'enthusiastic_righteous' | 'cunning_pragmatic'
  | 'humorous_slick' | 'overbearing_decisive' | 'patient_deep' | 'ruthless_antihero'
  | 'kind_loyal' | 'lonely_paranoid' | 'arrogant_confident' | 'smart_strategist'
  | 'naive_growing' | 'tram_on' | 'mildly_unhinged' | 'lazy_talented'
  | 'cautious_survivalist' | 'vengeful_obsessed' | 'righteous_not_naive'
  | 'redeemed_villain';

export type PersonalityDef = {
  slug: PersonalitySlug;
  viLabel: string;
  viDescription: string;
  voiceHints: string;          // ngôn ngữ nội tâm
  decisionStyle: string;       // cách ra quyết định
  dialogueStyle: string;       // cách nói chuyện
  conflictResponse: string;    // cách phản ứng khi gặp conflict
  driftSignals: string[];      // dấu hiệu personality drift (validator dùng)
};
```

Mẫu 3 entry (implementer nhân cho 20):

```ts
{
  slug: 'calm_rational',
  viLabel: 'Điềm tĩnh, lý trí',
  viDescription: 'Ưu tiên phân tích, ít cảm tính, ra quyết định dựa trên trade-off.',
  voiceHints: 'Câu ngắn, nhiều quan sát, ít tính từ cảm xúc. Hay dùng "có lẽ", "khả năng".',
  decisionStyle: 'Cân nhắc 2-3 phương án trước khi action; không bốc đồng.',
  dialogueStyle: 'Cẩn trọng, ít cảm thán, không lảm nhảm.',
  conflictResponse: 'Quan sát → đánh giá → counter có chủ đích. Rút lui khi bất lợi.',
  driftSignals: [
    'lảm nhảm dài dòng', 'ra quyết định bốc đồng', 'cảm thán cường điệu',
    'thề thốt sến súa',
  ],
},
{
  slug: 'cunning_pragmatic',
  viLabel: 'Gian xảo, thực dụng',
  viDescription: 'Lợi-ích-cá-nhân là kim chỉ nam; sẵn sàng dùng thủ đoạn nếu hiệu quả.',
  voiceHints: 'Hài hước đen, mỉa mai, hay tính toán cost-benefit thầm trong nội tâm.',
  decisionStyle: 'Chọn phương án ít rủi ro/nhiều lợi ích nhất; sẵn sàng phản bội nếu cần.',
  dialogueStyle: 'Lươn lẹo, nói nửa câu, hay đặt câu hỏi để thăm dò.',
  conflictResponse: 'Tìm điểm yếu đối thủ; ưu tiên đòn bẩy thông tin trước đòn vũ lực.',
  driftSignals: [
    'hành xử thánh mẫu', 'hi sinh vô lý vì người lạ', 'thẳng thắn lý tưởng hoá',
  ],
},
{
  slug: 'humorous_slick',
  viLabel: 'Hài hước, lươn lẹo',
  viDescription: 'Phá băng bằng đùa cợt, dùng hài để xoay chuyển tình thế.',
  voiceHints: 'Wordplay, ẩn dụ vui, chêm câu đùa khi căng thẳng.',
  decisionStyle: 'Trực giác + tự tin; hay improv khi gặp tình huống bất ngờ.',
  dialogueStyle: 'Pun, châm biếm, gọi đối thủ bằng nickname.',
  conflictResponse: 'Đùa để hạ căng thẳng → tìm sơ hở → ra đòn bất ngờ.',
  driftSignals: ['nghiêm trọng hoá quá mức', 'mất hài cả chương'],
},
```

`tram_on` (default cho story cũ):

```ts
{
  slug: 'tram_on',
  viLabel: 'Trầm ổn, có trách nhiệm',
  viDescription: 'Bình tĩnh, đáng tin cậy, ra quyết định có suy xét.',
  voiceHints: 'Câu cân bằng, không cường điệu; nội tâm có cân nhắc.',
  decisionStyle: 'Trách nhiệm trước, lợi ích cá nhân sau.',
  dialogueStyle: 'Lịch sự, rõ ràng, không lươn lẹo.',
  conflictResponse: 'Đối mặt trực tiếp nhưng không liều lĩnh.',
  driftSignals: ['bốc đồng', 'tránh né trách nhiệm', 'cảm xúc cường điệu'],
},
```

### 6.4 Story options enums

`story-options.ts` — mỗi enum là `{ slug, viLabel }` typed `as const`. Đầy đủ 10 enum:

```ts
export const TONES = [
  { slug: 'serious',  viLabel: 'Nghiêm túc' },
  { slug: 'humorous', viLabel: 'Hài hước' },
  { slug: 'dark',     viLabel: 'U tối' },
  { slug: 'tragic',   viLabel: 'Bi tráng' },
  { slug: 'soft',     viLabel: 'Nhẹ nhàng' },
] as const;

export const PACINGS = [
  { slug: 'slow',         viLabel: 'Chậm chắc' },
  { slug: 'medium',       viLabel: 'Vừa phải' },
  { slug: 'fast',         viLabel: 'Nhanh' },
  { slug: 'climax_heavy', viLabel: 'Liên tục cao trào' },
] as const;

export const MAIN_CONFLICT_TYPES = [
  { slug: 'revenge',        viLabel: 'Báo thù' },
  { slug: 'survival',       viLabel: 'Sinh tồn' },
  { slug: 'power_struggle', viLabel: 'Tranh quyền' },
  { slug: 'mystery',        viLabel: 'Khám phá bí mật' },
  { slug: 'growth',         viLabel: 'Trưởng thành' },
] as const;

export const POWER_SYSTEM_STYLES = [
  { slug: 'realm',   viLabel: 'Cảnh giới' },
  { slug: 'level',   viLabel: 'Cấp độ' },
  { slug: 'skill',   viLabel: 'Kỹ năng' },
  { slug: 'ability', viLabel: 'Dị năng' },
  { slug: 'martial', viLabel: 'Võ học' },
  { slug: 'tech',    viLabel: 'Công nghệ' },
] as const;

export const WORLD_ERAS = [
  { slug: 'ancient',          viLabel: 'Cổ đại' },
  { slug: 'modern',           viLabel: 'Hiện đại' },
  { slug: 'future',           viLabel: 'Tương lai' },
  { slug: 'otherworld',       viLabel: 'Dị giới' },
  { slug: 'post_apocalypse',  viLabel: 'Hậu tận thế' },
] as const;

export const ROMANCE_LEVELS = [
  { slug: 'none',   viLabel: 'Không có' },
  { slug: 'light',  viLabel: 'Nhẹ' },
  { slug: 'medium', viLabel: 'Vừa' },
  { slug: 'heavy',  viLabel: 'Nhiều' },
] as const;

export const COMEDY_LEVELS = [
  { slug: 'none',   viLabel: 'Không' },
  { slug: 'light',  viLabel: 'Nhẹ' },
  { slug: 'medium', viLabel: 'Vừa' },
  { slug: 'heavy',  viLabel: 'Nhiều' },
] as const;

export const DARK_LEVELS = [
  { slug: 'bright',       viLabel: 'Sáng' },
  { slug: 'neutral',      viLabel: 'Trung tính' },
  { slug: 'dark',         viLabel: 'U tối' },
  { slug: 'extreme_dark', viLabel: 'Cực dark' },
] as const;

export const POVS = [
  { slug: 'third_limited',    viLabel: 'Ngôi ba giới hạn' },
  { slug: 'third_omniscient', viLabel: 'Ngôi ba toàn tri' },
  { slug: 'first',            viLabel: 'Ngôi nhất' },
] as const;

export const MORALITIES = [
  { slug: 'righteous', viLabel: 'Chính đạo' },
  { slug: 'pragmatic', viLabel: 'Thực dụng' },
  { slug: 'antihero',  viLabel: 'Phản anh hùng' },
  { slug: 'villain',   viLabel: 'Phản diện' },
] as const;
```

### 6.5 Zod schemas

`schemas.ts`:

```ts
import { z } from 'zod';
import { GENRES } from './genres.ts';
import { PERSONALITIES } from './personalities.ts';
import { TONES, PACINGS, /* ... */ } from './story-options.ts';

const slugsOf = <T extends { slug: string }>(arr: readonly T[]) =>
  arr.map(x => x.slug) as [string, ...string[]];

export const GenreSlugSchema = z.enum(slugsOf(GENRES));
export const PersonalitySlugSchema = z.enum(slugsOf(PERSONALITIES));

export const StoryOptionsSchema = z.object({
  tone: z.enum(slugsOf(TONES)).optional(),
  pacing: z.enum(slugsOf(PACINGS)).optional(),
  mainConflictType: z.enum(slugsOf(MAIN_CONFLICT_TYPES)).optional(),
  powerSystemStyle: z.enum(slugsOf(POWER_SYSTEM_STYLES)).optional(),
  worldEra: z.enum(slugsOf(WORLD_ERAS)).optional(),
  romanceLevel: z.enum(slugsOf(ROMANCE_LEVELS)).optional(),
  comedyLevel: z.enum(slugsOf(COMEDY_LEVELS)).optional(),
  darkLevel: z.enum(slugsOf(DARK_LEVELS)).optional(),
  pov: z.enum(slugsOf(POVS)).optional(),
  protagonistMorality: z.enum(slugsOf(MORALITIES)).optional(),
});

export type StoryOptions = z.infer<typeof StoryOptionsSchema>;

export function findGenre(slug: string): GenreDef {
  const g = GENRES.find(x => x.slug === slug);
  if (!g) throw new Error(`Unknown genre: ${slug}`);
  return g;
}

export function findPersonality(slug: string): PersonalityDef {
  const p = PERSONALITIES.find(x => x.slug === slug);
  if (!p) throw new Error(`Unknown personality: ${slug}`);
  return p;
}
```

### 6.6 Export

`packages/core/src/index.ts` re-export:

```ts
export {
  GENRES, PERSONALITIES, TONES, PACINGS, MAIN_CONFLICT_TYPES,
  POWER_SYSTEM_STYLES, WORLD_ERAS, ROMANCE_LEVELS, COMEDY_LEVELS,
  DARK_LEVELS, POVS, MORALITIES,
  GenreSlugSchema, PersonalitySlugSchema, StoryOptionsSchema,
  findGenre, findPersonality,
  type GenreSlug, type GenreDef, type GenreFamily,
  type PersonalitySlug, type PersonalityDef, type StoryOptions,
} from './catalog/index.ts';
```

## 7. Prompt v2 family

### 7.1 Contract render helpers

`packages/ai/src/prompts/contracts/`:

```
contracts/
  genre-contract.ts        // renderGenreContract(genreDef, storyOptions)
  personality-contract.ts  // renderPersonalityContract(personalityDef)
  story-options-block.ts   // renderStoryOptionsBlock(storyOptions)
```

`renderGenreContract`:

```ts
export function renderGenreContract(g: GenreDef, opts: StoryOptions): string {
  return [
    '# GENRE CONTRACT (BẮT BUỘC)',
    `Selected genre: ${g.viLabel} (${g.slug}) — family: ${g.family}`,
    `Description: ${g.viDescription}`,
    g.allowedTropes.length > 0
      ? `Allowed tropes: ${g.allowedTropes.join(', ')}`
      : '',
    g.discouragedTropes.length > 0
      ? `Avoid unless explicitly in canon: ${g.discouragedTropes.join(', ')}`
      : '',
    `Tone guidance: ${g.toneGuidance}`,
    `Worldbuilding guidance: ${g.worldbuildingGuidance}`,
    '',
    '# PRIORITY RULES',
    '- Genre đã chọn là ràng buộc ưu tiên cao.',
    '- Khi xung đột giữa default template và genre option, GENRE thắng.',
    '- Khi xung đột giữa genre và canon đã tồn tại, CANON thắng nhưng giữ consistency.',
    '- KHÔNG tự ý đưa trope của thể loại khác vào nếu chưa có trong canon.',
  ].filter(Boolean).join('\n');
}
```

`renderPersonalityContract`:

```ts
export function renderPersonalityContract(p: PersonalityDef): string {
  return [
    '# PROTAGONIST PERSONALITY CONTRACT',
    `Selected: ${p.viLabel} (${p.slug})`,
    `Description: ${p.viDescription}`,
    `Voice hints: ${p.voiceHints}`,
    `Decision style: ${p.decisionStyle}`,
    `Dialogue style: ${p.dialogueStyle}`,
    `Conflict response: ${p.conflictResponse}`,
    p.driftSignals.length > 0
      ? `Drift signals to avoid: ${p.driftSignals.join('; ')}`
      : '',
  ].filter(Boolean).join('\n');
}
```

`renderStoryOptionsBlock` — render compact, missing field hiển thị `(không chỉ định)`:

```ts
export function renderStoryOptionsBlock(o: StoryOptions): string {
  const label = <T extends { slug: string; viLabel: string }>(
    list: readonly T[], slug: string | undefined,
  ) => slug ? (list.find(x => x.slug === slug)?.viLabel ?? slug) : '(không chỉ định)';

  return [
    '# STORY OPTIONS',
    `Tone: ${label(TONES, o.tone)} | Pacing: ${label(PACINGS, o.pacing)} | Main conflict: ${label(MAIN_CONFLICT_TYPES, o.mainConflictType)}`,
    `Power system style: ${label(POWER_SYSTEM_STYLES, o.powerSystemStyle)} | World era: ${label(WORLD_ERAS, o.worldEra)} | POV: ${label(POVS, o.pov)}`,
    `Romance: ${label(ROMANCE_LEVELS, o.romanceLevel)} | Comedy: ${label(COMEDY_LEVELS, o.comedyLevel)} | Dark: ${label(DARK_LEVELS, o.darkLevel)} | Morality: ${label(MORALITIES, o.protagonistMorality)}`,
  ].join('\n');
}
```

**Lý do không hard-code defaults ở backend:** universal default sẽ sai cho một số genre (vd `worldEra='otherworld'` sai cho `do_thi`, đúng cho `tien_hiep`). Backend giữ optional; UI form nên tính sensible default theo genre (xem §11.1) — user có thể override.

### 7.2 Prompt v2 — danh sách & nơi inject

| Prompt | File mới | Inject Genre? | Inject Personality? | Inject StoryOptions? | Note |
|---|---|---|---|---|---|
| bible-generator | `bible-generator.v2.ts` | ✓ | ✓ | ✓ | Prompt instruct LLM populate `power_system` cho mọi genre, `cultivation_system`/`bloodline_system` chỉ khi family=cultivation |
| saga-planner | `saga-planner.v2.ts` | ✓ | – | partial (tone/pacing) | Bỏ "tiêu thuyết tiên hiệp" khỏi system |
| arc-planner | `arc-planner.v2.ts` | ✓ | – | partial | Tương tự |
| packet-generator | `packet-generator.v2.ts` | ✓ | ✓ | ✓ | Inject ở user message (sau `# BIBLE`) |
| writer | `writer.v2.ts` | ✓ (qua serialized context) | ✓ (qua serialized context) | ✓ (qua serialized context) | System prompt thành "Bạn là tác giả tiểu thuyết {genreLabel} tiếng Việt" |
| llm-validator | `llm-validator.v2.ts` | ✓ | ✓ | – | Add criteria: kiểm tra genre drift (`discouragedTropes` xuất hiện) + personality drift (`driftSignals`) |
| auto-fixer | `auto-fixer.v2.ts` | ✓ (qua serialized context) | ✓ (qua serialized context) | ✓ (qua serialized context) | – |
| canon-extractor | `canon-extractor.v2.ts` | – (không cần — chỉ trích canon) | – | – | Bỏ ref tiên hiệp khỏi system |
| summary-compactor | `summary-compactor.v2.ts` | – | – | – | Bỏ ref tiên hiệp |
| arc-summary-compactor | `arc-summary-compactor.v2.ts` | – | – | – | Bỏ ref tiên hiệp |
| high-stakes-reviewer | `high-stakes-reviewer.v2.ts` | ✓ | ✓ | – | Add criteria: drift |

### 7.3 Bible generator v2 — system prompt thay thế

```
Bạn là editor / world-builder cho tiểu thuyết {genreLabel} tiếng Việt.
Tuân thủ Genre Contract và Personality Contract bên dưới như ràng buộc bắt buộc.

{genreContract}

{personalityContract}

{storyOptionsBlock}

Premise (ý tưởng người dùng):
{premise}

Mục tiêu độ dài: {target_chapter_count} chương

Yêu cầu output: JSON tuân theo schema bắt buộc, mỗi field tiếng Việt:
- world_rules (≥ 200 từ): luật thế giới, không gian, lịch sử nền, phù hợp genre.
- power_system (≥ 200 từ): hệ thống sức mạnh chính của thế giới — phải phù hợp `power_system_kind`.
- power_system_kind: một trong cultivation | martial | ability | tech | historical | none.
- cultivation_system (chỉ điền nếu power_system_kind='cultivation', ≥ 200 từ): cảnh giới, đột phá, vật phẩm, hạn chế.
- bloodline_system (chỉ điền nếu genre dùng huyết mạch, ≥ 200 từ): phân loại, nguồn gốc, kế thừa.
- style_guide (≥ 100 từ): phong cách viết, POV (theo storyOptions.pov), từ vựng nên/không nên.
- forbidden_rules (≥ 5 quy tắc): những gì TUYỆT ĐỐI không được. Phải bao gồm `discouragedTropes` của genre.
- ending_direction (≥ 100 từ).
- compact_summary (≤ 1500 từ).

Trả lời JSON thuần, không markdown.
```

### 7.4 Writer v2 — system prompt

```
Bạn là tác giả tiểu thuyết {genreLabel} tiếng Việt.
Tuân BIBLE, GENRE CONTRACT, PROTAGONIST PERSONALITY CONTRACT, STORY OPTIONS, STYLE GUIDE, POWER SYSTEM tuyệt đối.
Viết ~2000-3000 từ. Đầu ra theo định dạng:

TITLE: <tiêu đề>

<nội dung>
```

(Genre Contract, Personality Contract, Story Options đã có trong serialized context — system prompt chỉ cần liệt kê.)

### 7.5 LLM validator v2 — bổ sung criteria

Add 2 mục vào system prompt:

```
6. Genre drift — kiểm tra trope bị `discouragedTropes` của genre xuất hiện không có lý do canon. Nếu có → severity=medium hoặc high.
7. Personality drift — kiểm tra main character có hành xử trùng với `driftSignals` của personality không. Nếu có và không có character development hợp lý → severity=medium.
```

### 7.6 Xóa v1

11 file `*.v1.ts` xóa luôn sau khi v2 ready (commit riêng để dễ revert nếu cần).

## 8. Pipeline wiring

### 8.1 Worker `loadStoryContext`

`apps/worker/src/services/story-config.ts` đã có `loadEffectiveStoryConfig`. Thêm:

```ts
export type StoryDomainContext = {
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions: StoryOptions; // with defaults applied
  genreFamily: GenreFamily;
};

export async function loadStoryDomainContext(
  db: Db, storyId: string,
): Promise<StoryDomainContext> {
  const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
  if (!story) throw new Error(`story not found: ${storyId}`);

  const genreDef = findGenre(story.genre);
  const personalityDef = findPersonality(story.mainCharacterPersonality);

  const [settings] = await db.select().from(storySettings)
    .where(eq(storySettings.storyId, storyId));
  const rawOpts = (settings?.overrides as Record<string, unknown> | undefined)
    ?.storyOptions ?? {};
  const storyOptions = StoryOptionsSchema.parse(rawOpts);

  return { genreDef, personalityDef, storyOptions, genreFamily: genreDef.family };
}
```

`generate-chapter.ts` gọi 1 lần ở đầu job, truyền xuống mọi agent + buildContext + buildChecks + auditPacket.

### 8.2 Context builder

`packages/ai/src/context/builder.ts` `buildContext` nhận thêm `domain: StoryDomainContext`:

```ts
function buildHotTier(
  bible: { ... },
  domain: StoryDomainContext,
  cfg: ContextConfig,
): HotTier {
  const powerSystemText =
    bible.powerSystem ??
    [bible.cultivationSystem, bible.bloodlineSystem].filter(Boolean).join('\n\n');

  return {
    systemRules: `${bible.worldRules}\n\n# QUY TẮC CẤM\n${bible.forbiddenRules}`,
    bibleCompact: bible.compactSummary ?? '',
    styleGuide: bible.styleGuide,
    powerSystem: powerSystemText,
    powerSystemKind: bible.powerSystemKind ?? 'cultivation',
    genreContract: renderGenreContract(domain.genreDef, domain.storyOptions),
    personalityContract: renderPersonalityContract(domain.personalityDef),
    storyOptionsBlock: renderStoryOptionsBlock(domain.storyOptions),
    styleFewShots: ...,
  };
}
```

`HotTier` type cập nhật. `computeHotHash` tự động pick lên field mới (cache invalidates đúng khi user đổi options).

### 8.3 Writer serialization

`apps/worker/src/jobs/generate-chapter.ts::serializeContextForWriter` thêm 3 section ở đầu (sau SYSTEM RULES, trước STYLE GUIDE):

```ts
if (ctx.hot.genreContract)       parts.push(ctx.hot.genreContract);
if (ctx.hot.personalityContract) parts.push(ctx.hot.personalityContract);
if (ctx.hot.storyOptionsBlock)   parts.push(ctx.hot.storyOptionsBlock);
if (ctx.hot.styleGuide)          parts.push(`# STYLE GUIDE\n${ctx.hot.styleGuide}`);
if (ctx.hot.powerSystem)         parts.push(`# POWER SYSTEM (${ctx.hot.powerSystemKind})\n${ctx.hot.powerSystem}`);
```

(Block đã có header `# GENRE CONTRACT` etc. trong renderer, không cần wrap thêm.)

### 8.4 Bible-generator agent

`packages/ai/src/agents/bible-generator.ts::generateBible` nhận thêm `genreDef`, `personalityDef`, `storyOptions`. API route `POST /api/stories/:id/bible` load `loadStoryDomainContext` rồi truyền vào.

`bible.ts` (API route) sau khi insert bible thành công → set `genre_locked_at = NOW()` trên `stories`:

```ts
await db.update(stories)
  .set({ genreLockedAt: new Date() })
  .where(eq(stories.id, story.id));
```

## 9. Validators gating

### 9.1 Deterministic runner

`packages/ai/src/validators/deterministic/runner.ts`:

```ts
export function buildChecks(
  forbiddenRulesText: string,
  genreFamily: GenreFamily,
): DeterministicCheck[] {
  const isCultivation = genreFamily === 'cultivation';

  const allChecks: DeterministicCheck[] = [
    deadCharacterCheck,
    ...(isCultivation ? [realmJumpCheck, newBloodlineSourceCheck] : []),
    lockedFactCheck,
    makeForbiddenMoveCheck(forbiddenRulesText),
    wordCountCheck,
    unknownCharacterCheck,
    unknownLocationCheck,
    cliffhangerCheck,
    conflictPresenceCheck,
    styleRedFlagsCheck,
    repetitionCheck,
  ];

  return allChecks.sort(...);
}
```

### 9.2 Packet auditor

`packages/ai/src/validators/packet-auditor.ts::auditPacket` nhận thêm `{ genreFamily }`:

```ts
export function auditPacket(input: AuditInput, ctx: { genreFamily: GenreFamily }): AuditResult {
  // ... unchanged checks (dead character, missing conflict, missing cliffhanger, overdue TP)

  if (ctx.genreFamily === 'cultivation') {
    // realm-jump check (existing logic)
  }

  // ...
}
```

Worker truyền `genreFamily` từ `loadStoryDomainContext`.

## 10. API & validation

### 10.1 `POST /api/stories`

`apps/api/src/routes/stories.ts`:

```ts
const CreateStorySchema = z.object({
  title: z.string().min(1).max(200),
  premise: z.string().min(20).max(5000),
  genre: GenreSlugSchema.default('tien_hiep'),
  mainCharacterPersonality: PersonalitySlugSchema.default('tram_on'),
  tone: z.string().nullish(),
  storyOptions: StoryOptionsSchema.default({}),
  targetChapterCount: z.number().int().min(1).max(10000).default(1000),
});

app.post('/api/stories', async (req, reply) => {
  const body = CreateStorySchema.parse(req.body);
  const [row] = await db.insert(stories).values({
    title: body.title,
    premise: body.premise,
    genre: body.genre,
    mainCharacterPersonality: body.mainCharacterPersonality,
    tone: body.tone ?? null,
    targetChapterCount: body.targetChapterCount,
  }).returning();

  await db.insert(storySettings).values({
    storyId: row.id,
    overrides: { storyOptions: body.storyOptions },
    updatedAt: new Date(),
  });

  return reply.status(201).send(row);
});
```

### 10.2 `PATCH /api/stories/:id` (mới)

```ts
const PatchStorySchema = z.object({
  genre: GenreSlugSchema.optional(),
  mainCharacterPersonality: PersonalitySlugSchema.optional(),
  tone: z.string().nullish(),
  storyOptions: StoryOptionsSchema.partial().optional(),
});

app.patch('/api/stories/:id', async (req, reply) => {
  const id = z.string().uuid().parse(req.params.id);
  const body = PatchStorySchema.parse(req.body);
  const [story] = await db.select().from(stories).where(eq(stories.id, id));
  if (!story) return reply.status(404).send({ error: 'not_found' });

  if (body.genre && body.genre !== story.genre && story.genreLockedAt) {
    return reply.status(409).send({
      error: 'genre_locked',
      message: 'Genre đã được khoá vì bible đã sinh. Không thể đổi.',
    });
  }

  // ... update stories + merge storyOptions vào settings
});
```

UI chỗ Settings hiển thị warning khi thay đổi personality/storyOptions trên story đã có chương.

## 11. UI changes

### 11.1 New Story form

`apps/web/app/stories/new/page.tsx` — form mới:

```
Title*
Premise*  (≥ 20 chars, textarea)
Genre*           [dropdown 25 options]   helper: "Quyết định phong cách thế giới, hệ thống sức mạnh, trope và tone tổng thể."
Main Character Personality*  [dropdown 20 options]  helper: "Ảnh hưởng đến cách nhân vật chính suy nghĩ, đối thoại và ra quyết định."

▼ Tuỳ chọn nâng cao  (collapsible, default closed)
  Tone
  Pacing
  Main Conflict Type
  Power System Style
  World Era
  Romance Level
  Comedy Level
  Dark Level
  POV
  Protagonist Morality

Target chapter count (number)

[Submit]
```

Implementation note: dropdown options đọc từ `import { GENRES, PERSONALITIES, ... } from '@novel/core'`. Description nhỏ đặt dưới label bằng `<small>` (tránh thêm tooltip lib).

**Genre-aware sensible defaults (client-side):** khi user chọn genre, form pre-fill 10 option phụ với mapping:

```ts
const GENRE_DEFAULT_OPTIONS: Partial<Record<GenreSlug, Partial<StoryOptions>>> = {
  tien_hiep:      { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'realm',   worldEra: 'otherworld', pov: 'third_limited', protagonistMorality: 'pragmatic' },
  huyen_huyen:    { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'realm',   worldEra: 'otherworld', pov: 'third_limited', protagonistMorality: 'pragmatic' },
  do_thi:         { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'skill',   worldEra: 'modern',     pov: 'third_limited', protagonistMorality: 'pragmatic' },
  di_nang:        { tone: 'serious',  pacing: 'fast',   powerSystemStyle: 'ability', worldEra: 'modern',     pov: 'third_limited', protagonistMorality: 'pragmatic' },
  cao_vo:         { tone: 'serious',  pacing: 'fast',   powerSystemStyle: 'martial', worldEra: 'otherworld', pov: 'third_limited', protagonistMorality: 'righteous' },
  vo_thuat:       { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'martial', worldEra: 'ancient',    pov: 'third_limited', protagonistMorality: 'righteous' },
  khoa_huyen:     { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'tech',    worldEra: 'future',     pov: 'third_limited', protagonistMorality: 'pragmatic' },
  // ... implementer fill rest 18 entries (or fall back to {} = none, user fills manually)
};
```

User có thể override bất kỳ field nào sau khi đổi genre. Khi submit, payload chỉ gồm field user actually picked (Schema.optional, không default ở backend).

Payload submit:

```ts
{
  title, premise,
  genre, mainCharacterPersonality, tone: null,
  storyOptions: { tone, pacing, mainConflictType, ... },
  targetChapterCount,
}
```

### 11.2 Story Settings page

`apps/web/app/stories/[id]/settings/page.tsx` — mirror form với:

- Genre dropdown disabled khi `story.genreLockedAt != null`, tooltip giải thích.
- Banner ở trên: "Story này đã có bible — đổi personality/storyOptions chỉ ảnh hưởng đến chương sinh sau."
- Submit gọi `PATCH /api/stories/:id`.

### 11.3 Bible UI (existing)

`apps/web/app/stories/[id]/bible/edit-form.tsx` cần thêm field `power_system` + `power_system_kind`. `cultivation_system` và `bloodline_system` hiển thị có điều kiện (chỉ khi `power_system_kind === 'cultivation'`).

## 12. Tests (vitest)

Phải có:

| File | Coverage |
|---|---|
| `packages/core/test/catalog/genres.test.ts` | slug uniqueness, family mapping covered, Zod parse, 25 entries có đủ field bắt buộc |
| `packages/core/test/catalog/personalities.test.ts` | slug uniqueness, 20 entries đầy đủ, default `tram_on` tồn tại |
| `packages/core/test/catalog/story-options.test.ts` | Slug uniqueness mỗi enum; StoryOptionsSchema parse partial input không reject; reject slug không thuộc enum |
| `packages/ai/test/prompts/contracts/genre-contract.test.ts` | snapshot 4 genre đại diện (tien_hiep, do_thi, di_nang, cao_vo) |
| `packages/ai/test/prompts/contracts/personality-contract.test.ts` | snapshot 3 personality đại diện |
| `packages/ai/test/prompts/bible-generator.v2.test.ts` | render với genre=do_thi → KHÔNG chứa "tiên hiệp", "huyền huyễn", "cảnh giới"; render với genre=tien_hiep → chứa allowedTropes |
| `packages/ai/test/prompts/writer.v2.test.ts` | system prompt chứa `genreLabel`; serialized context chứa `voiceHints` của personality |
| `packages/ai/test/prompts/llm-validator.v2.test.ts` | system prompt chứa criteria 6 (genre drift) và 7 (personality drift) |
| `packages/ai/test/validators/deterministic/runner.test.ts` | `buildChecks(rules, 'ability')` không chứa `realm_jump`, `new_bloodline_source`; `buildChecks(rules, 'cultivation')` chứa cả hai |
| `packages/ai/test/validators/packet-auditor.test.ts` | realm-jump issue chỉ fire khi `genreFamily='cultivation'` |
| `apps/api/test/stories.test.ts` | POST với genre không hợp lệ → 400; default genre/personality đúng; POST đầy đủ + GET trả storyOptions từ settings; PATCH genre khi locked → 409 |
| `apps/api/test/bible.test.ts` (cập nhật) | POST bible → `genre_locked_at` được set |
| `apps/web/test/...` (nếu có harness) | form submit payload chứa storyOptions |

KHÔNG có real-LLM call trong CI. Manual smoke test sau deploy.

## 13. Manual smoke test (after deploy)

1. Tạo story `genre=do_thi`, `personality=cunning_pragmatic`. Generate bible. Verify:
   - `power_system_kind = 'urban'` hoặc `'none'`.
   - `cultivation_system` và `bloodline_system` trống (NULL).
   - Bible content KHÔNG đề cập tu tiên / cảnh giới / tông môn.
2. Generate chapter 1. Verify:
   - Validator không fire `realm_jump`.
   - Nội dung chương bám đô thị, dialogue tự nhiên, không có pháp bảo.
3. Tạo story `genre=cao_vo`, `personality=overbearing_decisive`. Generate bible + chapter 1. Verify thuần võ học, có cấp chiến lực, không có phi thăng tiên giới.
4. Tạo story `genre=di_nang`, `personality=humorous_slick`. Generate bible + chapter 1. Verify dị năng + hài hước.
5. Tạo story `genre=tien_hiep` để verify backward compat — vẫn ra tiên hiệp như cũ.
6. Tạo story `genre=tien_hiep`, generate bible. Vào settings page → verify Genre dropdown disabled.

## 14. Rollout sequence

1. **PR 1 — catalog:** Add `packages/core/src/catalog/*` + tests. No behavior change yet.
2. **PR 2 — DB migrations:** `0012_genre_personality.sql` + `0013_bible_generic_power_system.sql` + drizzle schema updates + backfill verification.
3. **PR 3 — prompt v2 family + contracts:** Add `prompts/contracts/*` + 11 v2 prompts; KHÔNG xoá v1 yet; agents vẫn dùng v1.
4. **PR 4 — wiring + validator gating:** `loadStoryDomainContext`, builder/serializer/agent/auditor wiring, switch agents từ v1 sang v2. Update tests.
5. **PR 5 — API + UI:** New Story form dropdown, Settings page edits, PATCH endpoint, Bible UI conditional fields.
6. **PR 6 — cleanup:** xoá `*.v1.ts` (11 file), xoá hard-coded "tiên hiệp/huyền huyễn" còn sót.

(Một plan duy nhất; commit theo step.)

## 15. Risk register

| Rủi ro | Mức | Mitigate |
|---|---|---|
| Bible LLM v2 quên populate `cultivation_system` cho family=cultivation → UI bible cũ trống | Medium | Zod refinement: nếu `power_system_kind==='cultivation'`, `cultivation_system` required min(50). Prompt yêu cầu rõ. |
| Story đang chạy mid-flight đổi prompt v2 → tone giật chương kế tiếp | Low | Genre đã backfill `tien_hiep` cho story cũ → contract tự nhiên không drift. Validator catch nếu drift. |
| Catalog quá detail → token cost prompt tăng | Low | Genre Contract render gọn (~120 token); chỉ inject vào prompt cần (writer/packet/validator/bible/high-stakes), bỏ qua compactor. |
| 10 option phụ rỗng cho story cũ → block hiện toàn `(không chỉ định)` | Low | `renderStoryOptionsBlock` xử lý missing gracefully; LLM bám bible cho field thiếu. UI Settings cho user fill sau. |
| User backfill chọn sai mapping `xianxia_fantasy → tien_hiep` (thực ra là huyen_huyen) | Very Low | Cho phép user vào Settings sửa genre TRƯỚC khi bible sinh (chưa lock). Note trong release. |
| Migration backfill `power_system` từ `cultivation_system + bloodline_system` cho text rỗng → vi phạm `length >= 50` | Low | Migration có fallback `'(legacy bible — chưa migrate)'`. Bible UI hiển thị banner "cần regenerate". |
| 11 file `.v1.ts` xoá quá sớm → llm_calls log hiển thị `promptVersion='v1'` cho row cũ trông kỳ | Negligible | log row cũ giữ string `'v1'`; chỉ là metadata. Không ảnh hưởng generation. |

## 16. Acceptance criteria checklist

- [ ] New Story form có Genre dropdown (25 options).
- [ ] New Story form có Main Character Personality dropdown (20 options).
- [ ] New Story form có 10 option phụ trong section "Tuỳ chọn nâng cao".
- [ ] Genre lưu xuống `stories.genre` đúng slug.
- [ ] Personality lưu xuống `stories.main_character_personality` đúng slug.
- [ ] StoryOptions lưu xuống `story_settings.overrides.storyOptions`.
- [ ] Payload frontend → backend có đầy đủ fields; backend Zod-validate.
- [ ] 11 prompt v2 inject Genre Contract và Personality Contract đúng nơi.
- [ ] Không còn hard-code "tiên hiệp/huyền huyễn" ở prompt generic (`rg "tiên hiệp|huyền huyễn"` chỉ còn trong genre catalog).
- [ ] Story cũ (`xianxia_fantasy`) backfill → `tien_hiep`, vẫn chạy đúng.
- [ ] `realmJumpCheck` không register cho non-cultivation family.
- [ ] Bible v2 schema cho phép non-cultivation: `power_system` required, `cultivation_system`/`bloodline_system` optional.
- [ ] `genreLockedAt` set sau khi bible sinh; PATCH genre khi locked → 409.
- [ ] Manual smoke test đạt cho 3 genre: `tien_hiep`, `do_thi`, `di_nang`.
- [ ] Manual smoke test đạt cho 3 personality: `calm_rational`, `cunning_pragmatic`, `humorous_slick`.
- [ ] All vitest pass.

## 17. Open questions (defer)

- Có nên thêm validator `non_cultivation_trope_intrusion` (regex tìm "tu tiên|cảnh giới|pháp bảo|huyết mạch tiên đạo" cho non-cultivation genre)? **Defer** — LLM validator v2 đã cover qua criteria genre drift; deterministic check thêm về sau nếu LLM validator không bắt được.
- Power-progression-jump check generic cho `martial` / `ability` family? **Defer to phase 2.**
- Migrate `characters.currentRealm` thành generic `currentTier`? **Defer** — không trong scope spec này.
