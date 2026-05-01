# Genre, Personality & Story Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-01-genre-personality-story-options-design.md`

**Goal:** Make Genre + Main Character Personality first-class contracts across the entire pipeline (catalog, schema, prompts, validators, UI), removing all hard-coded "tiên hiệp/huyền huyễn" assumptions and supporting 25 genres + 20 personalities + 10 secondary story options.

**Architecture:** Single-source-of-truth catalog in `@novel/core/catalog`. DB stores genre + personality as columns on `stories`, 10 secondary options as `story_settings.overrides.storyOptions` jsonb. Bible schema gets a generic `power_system` (cultivation/bloodline kept as nullable legacy). All 11 prompts replaced by v2 versions that inject pre-rendered Genre Contract + Personality Contract blocks. Deterministic validators gate cultivation-specific checks by `genreFamily`. UI form gets 12 dropdowns plus genre-locking after bible generation.

**Tech Stack:** TypeScript monorepo (pnpm workspaces), Drizzle ORM (PostgreSQL), Zod, Vitest, Fastify (API), Next.js App Router (web).

---

## File Structure

### New files

```
packages/core/src/catalog/
  index.ts
  genre-families.ts
  genres.ts
  personalities.ts
  story-options.ts
  schemas.ts

packages/core/test/catalog/
  genres.test.ts
  personalities.test.ts
  story-options.test.ts
  schemas.test.ts

packages/db/migrations/
  0012_genre_personality.sql
  0013_bible_generic_power_system.sql

packages/ai/src/prompts/contracts/
  genre-contract.ts
  personality-contract.ts
  story-options-block.ts

packages/ai/test/prompts/contracts/
  genre-contract.test.ts
  personality-contract.test.ts
  story-options-block.test.ts

packages/ai/src/prompts/
  bible-generator.v2.ts
  saga-planner.v2.ts
  arc-planner.v2.ts
  packet-generator.v2.ts
  writer.v2.ts
  llm-validator.v2.ts
  auto-fixer.v2.ts
  canon-extractor.v2.ts
  summary-compactor.v2.ts
  arc-summary-compactor.v2.ts
  high-stakes-reviewer.v2.ts

packages/ai/test/prompts/
  bible-generator.v2.test.ts
  writer.v2.test.ts
  llm-validator.v2.test.ts

packages/ai/src/
  story-domain.ts

packages/ai/test/
  story-domain.test.ts
```

### Modified files

```
packages/core/src/index.ts                                  // re-export catalog
packages/db/src/schema/stories.ts                           // + mainCharacterPersonality, genreLockedAt
packages/db/src/schema/story-bibles.ts                      // + powerSystem, powerSystemKind; cult/blood nullable
packages/ai/src/schemas/bible.ts                            // BibleV2Schema
packages/ai/src/context/types.ts                            // HotTier + new fields
packages/ai/src/context/builder.ts                          // accept domain, render contracts
packages/ai/src/agents/bible-generator.ts                   // accept domain, use v2
packages/ai/src/agents/writer.ts                            // accept domain, use v2
packages/ai/src/agents/llm-validator.ts                     // use v2
packages/ai/src/agents/auto-fixer.ts                        // use v2
packages/ai/src/agents/packet-generator.ts                  // accept domain, use v2
packages/ai/src/agents/saga-planner.ts                      // accept domain, use v2
packages/ai/src/agents/arc-planner.ts                       // accept domain, use v2
packages/ai/src/agents/canon-extractor.ts                   // use v2
packages/ai/src/agents/summary-compactor.ts                 // use v2
packages/ai/src/agents/arc-summary-compactor.ts             // use v2
packages/ai/src/agents/high-stakes-reviewer.ts              // accept domain, use v2
packages/ai/src/validators/deterministic/runner.ts          // gate by genreFamily
packages/ai/src/validators/packet-auditor.ts                // gate by genreFamily
packages/ai/src/index.ts                                    // re-export contracts + StoryDomainContext
apps/worker/src/jobs/generate-chapter.ts                    // load + thread domain (imports from @novel/ai)
apps/api/src/routes/stories.ts                              // catalog-validated CreateSchema, PATCH
apps/api/src/routes/bible.ts                                // set genre_locked_at after insert
apps/web/app/stories/new/page.tsx                           // dropdown form
apps/web/app/stories/[id]/settings/page.tsx                 // settings dropdown editor
apps/web/app/stories/[id]/bible/edit-form.tsx               // conditional cult/blood fields
```

### Deleted (PR 6)

```
packages/ai/src/prompts/bible-generator.v1.ts
packages/ai/src/prompts/saga-planner.v1.ts
packages/ai/src/prompts/arc-planner.v1.ts
packages/ai/src/prompts/packet-generator.v1.ts
packages/ai/src/prompts/writer.v1.ts
packages/ai/src/prompts/llm-validator.v1.ts
packages/ai/src/prompts/auto-fixer.v1.ts
packages/ai/src/prompts/canon-extractor.v1.ts
packages/ai/src/prompts/summary-compactor.v1.ts
packages/ai/src/prompts/arc-summary-compactor.v1.ts
packages/ai/src/prompts/high-stakes-reviewer.v1.ts
```

---

# PR 1 — Catalog module (`@novel/core/catalog`)

Builds the single source of truth. No behavior change in pipeline yet — pure additive.

## Task 1: Catalog scaffold (types + helpers)

**Files:**
- Create: `packages/core/src/catalog/genre-families.ts`
- Create: `packages/core/src/catalog/index.ts`

- [ ] **Step 1: Write `genre-families.ts`**

```ts
export type GenreFamily =
  | 'cultivation'
  | 'martial'
  | 'ability'
  | 'tech'
  | 'urban'
  | 'historical'
  | 'horror'
  | 'mystery'
  | 'system'
  | 'reincarnation'
  | 'mixed'
  | 'none';

export const GENRE_FAMILIES: readonly GenreFamily[] = [
  'cultivation', 'martial', 'ability', 'tech', 'urban',
  'historical', 'horror', 'mystery', 'system', 'reincarnation',
  'mixed', 'none',
] as const;
```

- [ ] **Step 2: Write `index.ts` (will re-export everything as we build)**

```ts
export * from './genre-families.ts';
export * from './genres.ts';
export * from './personalities.ts';
export * from './story-options.ts';
export * from './schemas.ts';
```

(`genres.ts`, `personalities.ts`, `story-options.ts`, `schemas.ts` will fail to import until later tasks — that's expected and OK as a stub. We will not run TS compile until Task 5.)

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/catalog/genre-families.ts packages/core/src/catalog/index.ts
git commit -m "core: add catalog scaffold and GenreFamily type"
```

---

## Task 2: GENRES catalog (25 entries)

**Files:**
- Create: `packages/core/src/catalog/genres.ts`
- Test: `packages/core/test/catalog/genres.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/test/catalog/genres.test.ts
import { describe, it, expect } from 'vitest';
import { GENRES, type GenreSlug } from '../../src/catalog/genres.ts';
import { GENRE_FAMILIES } from '../../src/catalog/genre-families.ts';

describe('GENRES catalog', () => {
  it('has exactly 25 entries (24 user-facing + tuy_chon sentinel)', () => {
    expect(GENRES).toHaveLength(25);
  });

  it('every slug is unique', () => {
    const slugs = GENRES.map(g => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every entry has all required fields populated', () => {
    for (const g of GENRES) {
      expect(g.slug).toMatch(/^[a-z_]+$/);
      expect(g.viLabel.length).toBeGreaterThan(0);
      expect(g.viDescription.length).toBeGreaterThan(20);
      expect(GENRE_FAMILIES).toContain(g.family);
      expect(Array.isArray(g.allowedTropes)).toBe(true);
      expect(Array.isArray(g.discouragedTropes)).toBe(true);
      expect(g.toneGuidance.length).toBeGreaterThan(20);
      expect(g.worldbuildingGuidance.length).toBeGreaterThan(20);
      expect(Array.isArray(g.examplePremises)).toBe(true);
    }
  });

  it('contains the sentinel "tuy_chon"', () => {
    const tc = GENRES.find(g => g.slug === 'tuy_chon');
    expect(tc).toBeDefined();
    expect(tc?.family).toBe('none');
  });

  it('contains "tien_hiep" (legacy default) with family=cultivation', () => {
    const t = GENRES.find(g => g.slug === 'tien_hiep');
    expect(t).toBeDefined();
    expect(t?.family).toBe('cultivation');
  });

  it('every GenreFamily value is represented by at least one genre except "none" which only "tuy_chon" uses', () => {
    const families = new Set(GENRES.map(g => g.family));
    expect(families.has('cultivation')).toBe(true);
    expect(families.has('martial')).toBe(true);
    expect(families.has('ability')).toBe(true);
    expect(families.has('tech')).toBe(true);
    expect(families.has('urban')).toBe(true);
    expect(families.has('historical')).toBe(true);
    expect(families.has('horror')).toBe(true);
    expect(families.has('mystery')).toBe(true);
    expect(families.has('system')).toBe(true);
    expect(families.has('reincarnation')).toBe(true);
    expect(families.has('mixed')).toBe(true);
    expect(families.has('none')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/core test catalog/genres`
Expected: FAIL — `GENRES` not exported (file doesn't exist yet).

- [ ] **Step 3: Write the catalog file**

```ts
// packages/core/src/catalog/genres.ts
import type { GenreFamily } from './genre-families.ts';

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

export const GENRES: readonly GenreDef[] = [
  {
    slug: 'tien_hiep',
    viLabel: 'Tiên hiệp',
    viDescription: 'Tu luyện cảnh giới, tông môn, pháp bảo, huyết mạch, khí vận, đại đạo.',
    family: 'cultivation',
    allowedTropes: ['tu luyện', 'cảnh giới', 'đột phá', 'tông môn', 'pháp bảo', 'huyết mạch', 'linh khí', 'đan dược', 'bí cảnh', 'khí vận', 'phi thăng'],
    discouragedTropes: ['súng đạn hiện đại', 'điện thoại di động', 'AI', 'internet'],
    toneGuidance: 'Cinematic, có nội tâm; "show, don\'t tell"; tránh harem mặc định và "ding hệ thống".',
    worldbuildingGuidance: 'Thế giới có cảnh giới rõ ràng, tông môn-thế gia, đại lục/châu lục/thiên giới.',
    examplePremises: ['Một phế vật bị đuổi khỏi gia tộc, vô tình thừa kế truyền thừa thượng cổ.'],
  },
  {
    slug: 'huyen_huyen',
    viLabel: 'Huyền huyễn',
    viDescription: 'Thế giới huyền ảo có hệ thống huyết mạch/đạo/luật tắc, mạnh hơn tiên hiệp về quy mô vũ trụ.',
    family: 'cultivation',
    allowedTropes: ['huyết mạch thần thoại', 'thiên đạo', 'luật tắc', 'thế giới', 'thần ma', 'đại đế', 'long tộc', 'thần thú', 'thượng cổ truyền thừa'],
    discouragedTropes: ['súng đạn hiện đại', 'AI', 'điện thoại', 'công ty hiện đại'],
    toneGuidance: 'Vĩ mô, có cảm giác thiên địa rộng lớn; tránh tu vi cảnh giới quá kỹ thuật như tiên hiệp thuần.',
    worldbuildingGuidance: 'Có nhiều thế giới/đại lục; hệ thống huyết mạch là trục chính, không nhất thiết tu luyện theo cảnh giới linh khí.',
    examplePremises: ['Một thiếu niên thức tỉnh huyết mạch thần long bị tuyệt diệt thượng cổ.'],
  },
  {
    slug: 'vo_thuat',
    viLabel: 'Võ thuật',
    viDescription: 'Giang hồ, môn phái, võ công, nội lực — không có tu tiên / tiên giới.',
    family: 'martial',
    allowedTropes: ['giang hồ', 'võ công', 'môn phái', 'nội lực', 'kinh mạch', 'ám khí', 'thần binh', 'tâm pháp', 'khinh công'],
    discouragedTropes: ['tu tiên', 'cảnh giới linh khí', 'pháp bảo', 'phi thăng', 'huyết mạch tiên đạo'],
    toneGuidance: 'Tinh tế, có triết lý võ học; conflict gắn với danh dự, ân oán giang hồ.',
    worldbuildingGuidance: 'Bối cảnh cổ trang/cận đại; có đại môn phái và tà giáo; không có cảnh giới tu tiên.',
    examplePremises: ['Một thiếu niên mồ côi vô tình học được tuyệt thế võ công, dấn thân vào ân oán giang hồ.'],
  },
  {
    slug: 'cao_vo',
    viLabel: 'Cao võ',
    viDescription: 'Thế giới võ lực cá nhân cao, hệ thống cấp bậc chiến lực, học viện/quân đội/võ đạo.',
    family: 'martial',
    allowedTropes: ['cấp chiến lực', 'võ giả', 'học viện võ', 'dị thú', 'chiến trường', 'kỹ năng võ', 'nội lực', 'hấp thụ năng lượng'],
    discouragedTropes: ['tu tiên thuần', 'phi thăng tiên giới', 'pháp bảo cổ điển', 'linh căn tu chân'],
    toneGuidance: 'Hành động dồn dập, có phân tích chiến đấu, tránh triết lý đạo quá nhiều.',
    worldbuildingGuidance: 'Có hệ thống cấp bậc võ giả rõ ràng (vd 9 cấp); có học viện hoặc quân đoàn võ.',
    examplePremises: ['Một thiếu niên nghèo gia nhập học viện võ đạo bằng tài năng dị biệt.'],
  },
  {
    slug: 'do_thi',
    viLabel: 'Đô thị',
    viDescription: 'Bối cảnh thành phố hiện đại, conflict tiền bạc/quyền lực/bí mật/gia đình.',
    family: 'urban',
    allowedTropes: ['công ty', 'gia tộc hiện đại', 'tổ chức ngầm', 'thương trường', 'âm mưu chính trị', 'truyền thông', 'mạng xã hội'],
    discouragedTropes: ['tu tiên', 'linh căn', 'cảnh giới', 'tông môn', 'pháp bảo', 'huyết mạch tiên đạo', 'phi thăng', 'tiên giới'],
    toneGuidance: 'Hiện thực gần đời thường, dialogue tự nhiên, tiết tấu vừa phải.',
    worldbuildingGuidance: 'Thành phố lớn, công ty/tập đoàn, gia đình, xã hội. KHÔNG bắt buộc có siêu năng lực.',
    examplePremises: ['Một nhân viên trẻ phát hiện sếp mình đang tham ô và bị cuốn vào âm mưu lớn hơn.'],
  },
  {
    slug: 'di_nang',
    viLabel: 'Dị năng',
    viDescription: 'Năng lực đặc biệt, tổ chức ngầm, thí nghiệm, xã hội hiện đại hoặc bán hiện đại.',
    family: 'ability',
    allowedTropes: ['siêu năng lực', 'awakening', 'tổ chức bí mật', 'cơ quan chính phủ ẩn', 'thí nghiệm', 'mutant', 'năng lực phụ'],
    discouragedTropes: ['tu tiên', 'cảnh giới', 'tông môn', 'pháp bảo', 'phi thăng', 'cổ trang huyền huyễn'],
    toneGuidance: 'Pha trộn realism + supernatural; conflict gắn với khám phá năng lực và tổ chức.',
    worldbuildingGuidance: 'Hiện đại hoặc bán hiện đại; có "thế giới ngầm" của người có năng lực.',
    examplePremises: ['Một sinh viên y khoa bỗng dưng thức tỉnh năng lực chữa lành và bị săn đuổi.'],
  },
  {
    slug: 'mat_the',
    viLabel: 'Mạt thế',
    viDescription: 'Hậu tận thế, sống sót giữa zombie/biến dị, tài nguyên khan hiếm.',
    family: 'mixed',
    allowedTropes: ['zombie', 'biến dị thú', 'cứ điểm sinh tồn', 'tài nguyên khan hiếm', 'bóng tối nhân tính', 'phe phái sinh tồn', 'thức tỉnh năng lực sau tận thế'],
    discouragedTropes: ['tu tiên cảnh giới truyền thống', 'tông môn cổ điển', 'cung đấu hậu cung'],
    toneGuidance: 'U tối, căng thẳng; tính người bị bào mòn; ít tiếng cười.',
    worldbuildingGuidance: 'Thế giới sau biến cố lớn (virus / thiên thạch / chiến tranh); cấu trúc xã hội sụp đổ.',
    examplePremises: ['Ngày tận thế thứ ba, một nhân viên văn phòng phát hiện mình thức tỉnh năng lực điều khiển nước.'],
  },
  {
    slug: 'khoa_huyen',
    viLabel: 'Khoa huyễn',
    viDescription: 'Sci-fi: tương lai gần/xa, công nghệ tiên tiến, vũ trụ học, AI, sinh học cải tạo.',
    family: 'tech',
    allowedTropes: ['mecha', 'AI', 'tinh hệ', 'tàu vũ trụ', 'cyberpunk', 'sinh học cải tạo', 'năng lượng đen', 'teleport công nghệ', 'chiến hạm', 'thuộc địa hành tinh'],
    discouragedTropes: ['tu tiên cảnh giới', 'huyết mạch tiên đạo', 'pháp bảo cổ điển', 'tông môn võ thuật'],
    toneGuidance: 'Logic công nghệ chặt; conflict gắn với khám phá, chiến tranh tinh hệ, đạo đức AI.',
    worldbuildingGuidance: 'Tương lai có công nghệ rõ ràng (cấp độ Kardashev); có thể có ngoài hành tinh, nội chiến tinh hệ.',
    examplePremises: ['Một kỹ sư AI phát hiện chương trình mình viết đã thức tỉnh tự ý thức.'],
  },
  {
    slug: 'kiem_hiep',
    viLabel: 'Kiếm hiệp',
    viDescription: 'Truyền thống Kim Dung/Cổ Long: giang hồ, kiếm khách, thi từ, cấu trúc cổ điển.',
    family: 'martial',
    allowedTropes: ['kiếm khách', 'môn phái lớn (Thiếu Lâm/Võ Đang)', 'tà giáo', 'bí kíp', 'tâm pháp kiếm', 'tửu lâu', 'giang hồ phong vận', 'ám khí', 'cao thủ ẩn cư'],
    discouragedTropes: ['cảnh giới tu tiên', 'phi thăng', 'pháp bảo cổ điển kiểu tiên hiệp', 'súng đạn'],
    toneGuidance: 'Có chất thi văn cổ; nhân vật có triết lý nhân sinh; conflict ân oán đậm chất nho-phật-đạo.',
    worldbuildingGuidance: 'Cổ trang Trung Hoa hoặc dị bản; có Đại Lý/Đại Tống/Tây Vực; có ngũ nhạc/cửu phái.',
    examplePremises: ['Một kiếm khách trẻ đi tìm sư phụ bị giết, vô tình bị cuốn vào tranh đoạt bí kíp tuyệt thế.'],
  },
  {
    slug: 'tu_chan',
    viLabel: 'Tu chân',
    viDescription: 'Tu chân thuần — cảnh giới chi tiết hơn tiên hiệp, ít chất thi văn, nhiều hệ thống.',
    family: 'cultivation',
    allowedTropes: ['cảnh giới tu chân chi tiết (luyện khí/trúc cơ/kim đan/...)', 'pháp bảo', 'đan dược', 'tông môn nhỏ', 'lệch thiên', 'bí cảnh', 'truyền thừa thượng cổ'],
    discouragedTropes: ['súng đạn', 'AI', 'thành phố hiện đại', 'tổ chức ngầm hiện đại'],
    toneGuidance: 'Trung thành với cảnh giới đột phá; conflict đa phần là tài nguyên / pháp bảo / truyền thừa.',
    worldbuildingGuidance: 'Thế giới tu chân có cảnh giới rõ ràng, tông môn nhiều cấp; thiên đạo nghiêm khắc.',
    examplePremises: ['Một phế vật mạch loạn vô tình nhận truyền thừa từ một thượng cổ chân nhân.'],
  },
  {
    slug: 'di_gioi',
    viLabel: 'Dị giới',
    viDescription: 'Western fantasy hoặc isekai: hiệp sĩ, ma pháp sư, đế quốc, dị tộc, dungeon.',
    family: 'mixed',
    allowedTropes: ['ma pháp', 'hiệp sĩ', 'đế quốc', 'elf/dwarf/orc', 'dungeon', 'thánh nữ', 'long', 'kỵ sĩ', 'guild phiêu lưu giả'],
    discouragedTropes: ['tu tiên cảnh giới Đông phương', 'tông môn', 'pháp bảo Đông phương', 'phi thăng tiên giới'],
    toneGuidance: 'Có chất Tây phương fantasy; conflict thường là chiến tranh đế quốc, ma vương, dungeon exploration.',
    worldbuildingGuidance: 'Đại lục Tây phương fantasy; có ma pháp, magic circle, mana, hệ thống job/class.',
    examplePremises: ['Một học sinh Nhật Bản tỉnh dậy trong thân thể một quý tộc trẻ ở đế quốc ma pháp.'],
  },
  {
    slug: 'he_thong',
    viLabel: 'Hệ thống',
    viDescription: 'Nhân vật chính có "system" gắn vào não — task/reward/stat panel/skill.',
    family: 'system',
    allowedTropes: ['system panel', 'daily quest', 'reward', 'skill book', 'level up', 'achievement', 'inventory', 'check-in', 'reincarnation host'],
    discouragedTropes: ['phong cách thuần văn học không có UI system', 'tu tiên không system'],
    toneGuidance: 'Có cảm giác game-ified; nhịp nhanh, reward-driven; có thể hài hước.',
    worldbuildingGuidance: 'Bối cảnh đa dạng (đô thị, dị giới, tu tiên đều được) miễn có "system" rõ ràng.',
    examplePremises: ['Một nhân viên giao hàng bị xe tông, tỉnh dậy với "Hệ thống Gánh team" trong đầu.'],
  },
  {
    slug: 'trong_sinh',
    viLabel: 'Trọng sinh',
    viDescription: 'Nhân vật chính chết và sống lại trong quá khứ với ký ức tương lai.',
    family: 'reincarnation',
    allowedTropes: ['ký ức tương lai', 'báo thù người phản bội', 'sửa chữa sai lầm', 'tận dụng thông tin', 'nhân quả', 'kiếp trước/kiếp này'],
    discouragedTropes: ['mất ký ức tương lai sớm vô lý', 'tự sự không tận dụng prophecy'],
    toneGuidance: 'Có cảm giác "bù đắp" nhanh chóng; conflict gắn với quá khứ đã thay đổi.',
    worldbuildingGuidance: 'Thế giới có thể là bất kỳ (đô thị/tiên hiệp/dị giới); trục là nhân vật chính có lợi thế thông tin.',
    examplePremises: ['Một CEO bị vợ hãm hại trọng sinh về thời sinh viên, quyết tâm thay đổi vận mệnh.'],
  },
  {
    slug: 'xuyen_khong',
    viLabel: 'Xuyên không',
    viDescription: 'Nhân vật chính từ thế giới hiện đại xuyên về cổ đại / dị giới / game.',
    family: 'reincarnation',
    allowedTropes: ['xuyên không bằng tai nạn / system / cổ vật', 'ưu thế kiến thức hiện đại', 'mâu thuẫn văn hoá', 'xây dựng thế lực', 'phát minh thời đại'],
    discouragedTropes: ['quên gốc gác hiện đại quá nhanh', 'không có cú sốc văn hoá'],
    toneGuidance: 'Có cảm giác fish-out-of-water giai đoạn đầu; sau đó nhân vật trở thành nhân vật chủ chốt thời đại.',
    worldbuildingGuidance: 'Phần lớn ở thế giới đến (cổ đại Trung Hoa / dị giới / game), giữ chút ký ức hiện đại.',
    examplePremises: ['Một bác sĩ trẻ xuyên không về thời chiến quốc với toàn bộ kiến thức y học hiện đại.'],
  },
  {
    slug: 'lich_su_gia_tuong',
    viLabel: 'Lịch sử giả tưởng',
    viDescription: 'Thế giới dựa trên lịch sử có thật nhưng nhánh thay đổi (alt-history).',
    family: 'historical',
    allowedTropes: ['triều đại lịch sử', 'nhân vật lịch sử có thật', 'chiến trận lớn', 'biến cố alt-history', 'chính trị triều đình', 'binh pháp'],
    discouragedTropes: ['tu tiên cảnh giới', 'pháp bảo huyền huyễn', 'năng lực siêu nhiên không có context lịch sử'],
    toneGuidance: 'Có cảm giác sử thi; chú trọng chi tiết thời đại (trang phục, lễ chế, ngôn ngữ).',
    worldbuildingGuidance: 'Phải research lịch sử cẩn thận; alt-history phải có "điểm rẽ" (point of divergence) rõ ràng.',
    examplePremises: ['Một sử gia trẻ trọng sinh thành Lưu Bang trước khi khởi binh chống Tần.'],
  },
  {
    slug: 'cung_dau',
    viLabel: 'Cung đấu',
    viDescription: 'Đấu đá hậu cung / triều đình; conflict tâm cơ, chính trị.',
    family: 'historical',
    allowedTropes: ['hậu cung', 'phi tần', 'tâm cơ', 'âm mưu chính trị', 'phái hệ triều đình', 'tỳ nữ thân tín', 'thái hậu', 'sủng ái hoàng đế'],
    discouragedTropes: ['tu tiên', 'năng lực siêu nhiên', 'súng đạn', 'công nghệ hiện đại'],
    toneGuidance: 'Tinh tế, có chiều sâu tâm lý; conflict ngầm nhiều hơn xung đột công khai.',
    worldbuildingGuidance: 'Triều đình cổ trang Đông phương; có cấp bậc phi tần rõ ràng; gia tộc lớn ngoài cung.',
    examplePremises: ['Một thiên kim tiểu thư bị gia tộc dùng làm con cờ tiến cung, dần dần lộ ra dã tâm.'],
  },
  {
    slug: 'linh_di',
    viLabel: 'Linh dị',
    viDescription: 'Truyện ma / kinh dị / linh hồn — bầu không khí ám ảnh, jump scare.',
    family: 'horror',
    allowedTropes: ['ma quỷ', 'thầy pháp', 'âm dương sư', 'oan hồn', 'lễ nghi cổ', 'cõi âm', 'bùa chú', 'ngôi nhà ma', 'thân nguyền'],
    discouragedTropes: ['tu tiên cảnh giới truyền thống', 'pháp bảo nhẹ nhàng', 'cảnh hài hước phá tan không khí'],
    toneGuidance: 'Ám ảnh, slow burn, dùng âm thanh/mùi/ánh sáng tạo bầu không khí.',
    worldbuildingGuidance: 'Có hệ thống tâm linh (âm dương / ngũ hành); cõi âm và cõi dương ranh giới mỏng.',
    examplePremises: ['Một sinh viên báo chí tình nguyện ở một làng cổ và phát hiện cả làng đã chết hơn trăm năm.'],
  },
  {
    slug: 'trinh_tham',
    viLabel: 'Trinh thám',
    viDescription: 'Phá án, suy luận logic, manh mối, twist cuối.',
    family: 'mystery',
    allowedTropes: ['vụ án', 'manh mối', 'suy luận logic', 'thám tử', 'cảnh sát', 'hung thủ', 'phá án', 'hiện trường', 'pháp y'],
    discouragedTropes: ['tu tiên giải đố bằng phép thuật', 'năng lực ngoại cảm dễ dãi (trừ khi xuyên suốt)', 'kết thúc deus ex machina'],
    toneGuidance: 'Logic chặt; manh mối phải fair (reader có thể tự suy ra); twist cuối phải có foreshadowing.',
    worldbuildingGuidance: 'Hiện đại hoặc bán hiện đại; có hệ thống cảnh sát/pháp y rõ ràng.',
    examplePremises: ['Một thám tử tư trẻ nhận vụ án tự sát của một nữ doanh nhân, phát hiện không phải tự sát.'],
  },
  {
    slug: 'quan_su',
    viLabel: 'Quân sự',
    viDescription: 'Chiến tranh hiện đại / cổ đại, binh pháp, chỉ huy chiến trận.',
    family: 'historical',
    allowedTropes: ['binh pháp', 'tướng lĩnh', 'chiến trận', 'hậu cần', 'tình báo quân sự', 'đặc nhiệm', 'liên minh quân sự', 'bộ tham mưu'],
    discouragedTropes: ['tu tiên 1-vs-vạn', 'pháp bảo phá thành', 'hậu cung yêu nhau giữa chiến trận'],
    toneGuidance: 'Logic chiến thuật; tôn trọng tổn thất nhân mạng; không lý tưởng hoá chiến tranh.',
    worldbuildingGuidance: 'Có cấp bậc quân đội rõ ràng; có học viện quân sự / binh đoàn / hậu cần.',
    examplePremises: ['Một sỹ quan trẻ được giao chỉ huy đơn vị tan tác và phải rebuild trong 3 tháng.'],
  },
  {
    slug: 'tay_huyen',
    viLabel: 'Tây huyền',
    viDescription: 'Western fantasy có chất ma pháp Đông-Tây pha trộn; mạnh hơn dị giới về quy mô vũ trụ.',
    family: 'mixed',
    allowedTropes: ['ma pháp đa hệ', 'thần ma chiến', 'long', 'thiên thần / ác quỷ', 'magic academy', 'tinh tinh thiên thể', 'mana', 'phù văn'],
    discouragedTropes: ['tu tiên Đông phương thuần', 'tông môn nội lực'],
    toneGuidance: 'Có quy mô vũ trụ; conflict bao gồm phe phái thần ma; nhịp epic.',
    worldbuildingGuidance: 'Đại lục có nhiều chủng tộc; ma pháp có hệ thống học thuật; có thần điện và ác quỷ giới.',
    examplePremises: ['Một cô bé mồ côi vô tình thừa kế ma lực của một thần đã chết.'],
  },
  {
    slug: 'dong_phuong_huyen_bi',
    viLabel: 'Đông phương huyền bí',
    viDescription: 'Pha trộn võ thuật + linh dị + tu tiên nhẹ + thầy bói/phong thuỷ.',
    family: 'mixed',
    allowedTropes: ['phong thuỷ', 'bói toán', 'thầy pháp', 'âm dương sư', 'võ thuật cổ', 'long mạch', 'cổ thuật', 'di chỉ thượng cổ', 'biểu tượng huyền học'],
    discouragedTropes: ['tu tiên cảnh giới chi tiết kiểu tu chân', 'súng đạn hiện đại lạm dụng'],
    toneGuidance: 'Bí ẩn, có chiều sâu văn hoá Đông phương; nhịp chậm rãi xen action.',
    worldbuildingGuidance: 'Cổ trang hoặc cận hiện đại có yếu tố huyền học truyền thống.',
    examplePremises: ['Một thầy phong thuỷ trẻ kế thừa nghề gia tộc, được giao xem long mạch một mỏ vàng.'],
  },
  {
    slug: 'vong_du',
    viLabel: 'Võng du',
    viDescription: 'Bối cảnh trong game online / VR; nhân vật chính chơi game.',
    family: 'tech',
    allowedTropes: ['VR helmet', 'guild', 'PVP', 'PVE', 'level', 'item drop', 'auction house', 'beta tester', 'hidden quest', 'top player'],
    discouragedTropes: ['rời game vĩnh viễn quá sớm', 'tu tiên cảnh giới ngoài game'],
    toneGuidance: 'Có cảm giác game-y; thuật ngữ game; nhịp nhanh; có pacing PVE/PVP.',
    worldbuildingGuidance: 'Game online (MMORPG) hoặc VR; có hệ thống job/skill/level rõ ràng.',
    examplePremises: ['Một game thủ pro trở lại sau khi giải nghệ vào ngày game ra phiên bản mới.'],
  },
  {
    slug: 'hac_am_fantasy',
    viLabel: 'Hắc ám fantasy',
    viDescription: 'Grimdark — fantasy nhưng đen tối, đạo đức xám, không có anh hùng thuần.',
    family: 'horror',
    allowedTropes: ['đạo đức xám', 'hi sinh không cần thiết', 'phản anh hùng', 'thế giới sụp đổ', 'thần đã chết', 'lời nguyền cổ', 'phe phái đều xấu'],
    discouragedTropes: ['anh hùng cứu thế giới đơn thuần', 'happy ending dễ dãi', 'romance dễ dãi'],
    toneGuidance: 'U tối, không lý tưởng hoá; tránh cliché "ánh sáng thắng bóng tối".',
    worldbuildingGuidance: 'Fantasy nhưng có yếu tố grimdark — đế quốc tàn ác, magic có giá đắt, thần đã chết hoặc thờ ơ.',
    examplePremises: ['Một sát thủ đã giết quá nhiều người được giao nhiệm vụ cuối: ám sát chính sư phụ mình.'],
  },
  {
    slug: 'do_thi_tu_tien',
    viLabel: 'Đô thị tu tiên',
    viDescription: 'Tu tiên trong bối cảnh đô thị hiện đại — pha trộn cảnh giới + công ty/gia đình.',
    family: 'cultivation',
    allowedTropes: ['cảnh giới tu tiên ẩn', 'tông môn ẩn thế hiện đại', 'pháp bảo trong đô thị', 'huyền môn', 'gia tộc tu tiên', 'thí luyện hiện đại', 'cao thủ ẩn cư trong thành phố'],
    discouragedTropes: ['hoàn toàn cổ trang không có yếu tố hiện đại', 'sci-fi quá đậm'],
    toneGuidance: 'Pha trộn không khí đô thị + tu tiên; conflict thường là tu giả vs phàm nhân, hoặc tông môn nhỏ vs gia tộc lớn.',
    worldbuildingGuidance: 'Thành phố hiện đại có "thế giới tu giả" ẩn; tông môn vận hành dưới vỏ bọc công ty/gia tộc.',
    examplePremises: ['Một sinh viên nghèo vô tình nhận truyền thừa của một tu sĩ cổ đại trong căn nhà cũ.'],
  },
  {
    slug: 'do_thi_di_nang',
    viLabel: 'Đô thị dị năng',
    viDescription: 'Năng lực đặc biệt + bối cảnh đô thị hiện đại — gần dị năng nhưng đậm chất thành phố.',
    family: 'ability',
    allowedTropes: ['siêu năng lực', 'awakening', 'tổ chức ngầm hiện đại', 'cơ quan chính phủ ẩn', 'experiment', 'mutant', 'gia tộc dị năng', 'năng lực gia phả'],
    discouragedTropes: ['tu tiên cảnh giới', 'tông môn cổ điển', 'pháp bảo cổ điển'],
    toneGuidance: 'Hiện đại hoá; conflict gắn với khám phá năng lực + tổ chức ngầm; ít chất tu tiên.',
    worldbuildingGuidance: 'Thành phố hiện đại có "thế giới ngầm" của người có năng lực; có cơ quan quản lý.',
    examplePremises: ['Một nhân viên IT bị tai nạn ở phòng thí nghiệm bí mật, thức tỉnh năng lực điều khiển kim loại.'],
  },
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
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novel/core test catalog/genres`
Expected: PASS — all 6 assertions green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/catalog/genres.ts packages/core/test/catalog/genres.test.ts
git commit -m "core: add 25-entry GENRES catalog with rich contract metadata"
```

---

## Task 3: PERSONALITIES catalog (20 entries)

**Files:**
- Create: `packages/core/src/catalog/personalities.ts`
- Test: `packages/core/test/catalog/personalities.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/test/catalog/personalities.test.ts
import { describe, it, expect } from 'vitest';
import { PERSONALITIES } from '../../src/catalog/personalities.ts';

describe('PERSONALITIES catalog', () => {
  it('has exactly 20 entries', () => {
    expect(PERSONALITIES).toHaveLength(20);
  });

  it('every slug is unique', () => {
    const slugs = PERSONALITIES.map(p => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every entry has all required fields populated', () => {
    for (const p of PERSONALITIES) {
      expect(p.slug).toMatch(/^[a-z_]+$/);
      expect(p.viLabel.length).toBeGreaterThan(0);
      expect(p.viDescription.length).toBeGreaterThan(20);
      expect(p.voiceHints.length).toBeGreaterThan(20);
      expect(p.decisionStyle.length).toBeGreaterThan(20);
      expect(p.dialogueStyle.length).toBeGreaterThan(20);
      expect(p.conflictResponse.length).toBeGreaterThan(20);
      expect(Array.isArray(p.driftSignals)).toBe(true);
      expect(p.driftSignals.length).toBeGreaterThan(0);
    }
  });

  it('contains "tram_on" (default for legacy stories)', () => {
    expect(PERSONALITIES.find(p => p.slug === 'tram_on')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/core test catalog/personalities`
Expected: FAIL — file not found.

- [ ] **Step 3: Write the catalog file**

```ts
// packages/core/src/catalog/personalities.ts
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
  voiceHints: string;
  decisionStyle: string;
  dialogueStyle: string;
  conflictResponse: string;
  driftSignals: string[];
};

export const PERSONALITIES: readonly PersonalityDef[] = [
  {
    slug: 'calm_rational',
    viLabel: 'Điềm tĩnh, lý trí',
    viDescription: 'Ưu tiên phân tích, ít cảm tính, ra quyết định dựa trên trade-off.',
    voiceHints: 'Câu ngắn, nhiều quan sát, ít tính từ cảm xúc. Hay dùng "có lẽ", "khả năng".',
    decisionStyle: 'Cân nhắc 2-3 phương án trước khi action; không bốc đồng.',
    dialogueStyle: 'Cẩn trọng, ít cảm thán, không lảm nhảm.',
    conflictResponse: 'Quan sát → đánh giá → counter có chủ đích. Rút lui khi bất lợi.',
    driftSignals: ['lảm nhảm dài dòng', 'ra quyết định bốc đồng', 'cảm thán cường điệu', 'thề thốt sến súa'],
  },
  {
    slug: 'cold_quiet',
    viLabel: 'Lạnh lùng, ít nói',
    viDescription: 'Im lặng, biểu cảm tối thiểu, hành động dứt khoát; nội tâm sâu nhưng không phô.',
    voiceHints: 'Câu rất ngắn, mô tả dửng dưng, ít cảm thán.',
    decisionStyle: 'Quyết định nhanh, ít giải thích lý do; trust gut.',
    dialogueStyle: 'Trả lời 1-3 từ; tránh small talk; có thể im lặng cả đoạn.',
    conflictResponse: 'Hành động ngay, không cảnh báo; rút lui không màng giải thích.',
    driftSignals: ['nói chuyện dài dòng', 'cảm thán cường điệu', 'small talk vô bổ', 'giải thích quá nhiều'],
  },
  {
    slug: 'enthusiastic_righteous',
    viLabel: 'Nhiệt huyết, chính trực',
    viDescription: 'Nhiệt tình, đặt nguyên tắc lên trên; tin vào điều đúng đắn.',
    voiceHints: 'Câu sôi nổi, có nhiều "phải", "cần", "không thể"; cảm thán tích cực.',
    decisionStyle: 'Đặt nguyên tắc trước lợi ích; sẵn sàng đứng ra ngay cả khi bất lợi.',
    dialogueStyle: 'Thẳng thắn, lý tưởng hoá; hay khuyên người khác.',
    conflictResponse: 'Đối mặt trực tiếp; tuyên bố lập trường rõ; không lùi bước về nguyên tắc.',
    driftSignals: ['lươn lẹo vì lợi ích', 'im lặng khi thấy bất công', 'nói nửa câu nửa chừng'],
  },
  {
    slug: 'cunning_pragmatic',
    viLabel: 'Gian xảo, thực dụng',
    viDescription: 'Lợi-ích-cá-nhân là kim chỉ nam; sẵn sàng dùng thủ đoạn nếu hiệu quả.',
    voiceHints: 'Hài hước đen, mỉa mai, hay tính toán cost-benefit thầm trong nội tâm.',
    decisionStyle: 'Chọn phương án ít rủi ro/nhiều lợi ích nhất; sẵn sàng phản bội nếu cần.',
    dialogueStyle: 'Lươn lẹo, nói nửa câu, hay đặt câu hỏi để thăm dò.',
    conflictResponse: 'Tìm điểm yếu đối thủ; ưu tiên đòn bẩy thông tin trước đòn vũ lực.',
    driftSignals: ['hành xử thánh mẫu', 'hi sinh vô lý vì người lạ', 'thẳng thắn lý tưởng hoá'],
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
  {
    slug: 'overbearing_decisive',
    viLabel: 'Bá đạo, quyết đoán',
    viDescription: 'Áp đảo, ra quyết định nhanh và dứt khoát; ít tham khảo người khác.',
    voiceHints: 'Câu khẳng định mạnh; ít dùng "có thể", "có lẽ"; mệnh lệnh nhiều hơn yêu cầu.',
    decisionStyle: 'Quyết định ngay; không cần đồng thuận; chấp nhận hậu quả.',
    dialogueStyle: 'Áp đặt; ngắt lời; gọi người khác bằng cấp dưới.',
    conflictResponse: 'Áp đảo bằng khí thế hoặc vũ lực; không dao động.',
    driftSignals: ['xin phép', 'do dự', 'tham khảo người dưới quá nhiều', 'rút lui vì tự ti'],
  },
  {
    slug: 'patient_deep',
    viLabel: 'Nhẫn nhịn, thâm trầm',
    viDescription: 'Chịu đựng lâu dài, lập kế hoạch từ xa; đến lúc mới ra tay.',
    voiceHints: 'Câu chậm rãi; nội tâm nhiều suy ngẫm; mô tả thời gian dài.',
    decisionStyle: 'Plan dài hạn; chờ đúng thời cơ; không bị khiêu khích.',
    dialogueStyle: 'Lịch sự với mọi đối tượng; ít lộ thái độ; nói nửa vời.',
    conflictResponse: 'Nuốt giận; ghi nhớ; chờ thời cơ phản công có chủ đích.',
    driftSignals: ['phản ứng bốc đồng', 'để lộ thái độ thật quá sớm', 'để cảm xúc lấn át kế hoạch'],
  },
  {
    slug: 'ruthless_antihero',
    viLabel: 'Tàn nhẫn, phản anh hùng',
    viDescription: 'Sẵn sàng dùng thủ đoạn tàn ác để đạt mục tiêu; không màng đạo đức xã hội.',
    voiceHints: 'Câu lạnh lùng có tính phán quyết; ít từ cảm xúc tích cực.',
    decisionStyle: 'Tính toán cost theo mục tiêu cá nhân; đạo đức công cộng không phải priority.',
    dialogueStyle: 'Trực tiếp, không che giấu mục đích; có thể đe doạ thẳng.',
    conflictResponse: 'Loại bỏ vĩnh viễn nếu cần; không nương tay; không thương lượng nếu bất lợi.',
    driftSignals: ['hối hận quá sớm', 'tha thứ vô lý', 'làm việc thiện không có mục đích chiến lược'],
  },
  {
    slug: 'kind_loyal',
    viLabel: 'Tốt bụng, trọng tình nghĩa',
    viDescription: 'Đặt người thân/bạn bè lên trên mình; trọng tình hơn lý.',
    voiceHints: 'Câu ấm áp; nội tâm nghĩ về người khác trước; cảm thán thiện chí.',
    decisionStyle: 'Ưu tiên người thân; sẵn sàng hi sinh lợi ích cá nhân.',
    dialogueStyle: 'Quan tâm; hỏi han; lắng nghe.',
    conflictResponse: 'Thiên về hoà giải; chỉ mạnh tay khi người thân bị tổn hại.',
    driftSignals: ['lạnh nhạt với bạn thân', 'tính toán tiền bạc với gia đình', 'phản bội bạn bè vì lợi'],
  },
  {
    slug: 'lonely_paranoid',
    viLabel: 'Cô độc, đa nghi',
    viDescription: 'Khó tin người; thích một mình; luôn cảnh giác.',
    voiceHints: 'Câu cẩn trọng; nội tâm hay đặt câu hỏi về động cơ người khác.',
    decisionStyle: 'Backup plan triple; không tin một nguồn thông tin duy nhất.',
    dialogueStyle: 'Ít chia sẻ thông tin; trả lời câu hỏi bằng câu hỏi; thử người đối thoại.',
    conflictResponse: 'Đề phòng từ trước; chuẩn bị exit; không trust ai dễ dàng.',
    driftSignals: ['tin người mới quá nhanh', 'chia sẻ thông tin nhạy cảm', 'kết bạn vô tư', 'giao tài sản cho người lạ'],
  },
  {
    slug: 'arrogant_confident',
    viLabel: 'Kiêu ngạo, tự tin',
    viDescription: 'Tin vào năng lực bản thân; coi người khác thấp hơn; không sợ ai.',
    voiceHints: 'Câu khẳng định cao; có chút khinh thường người khác; nội tâm tự tán dương.',
    decisionStyle: 'Tin gut feeling; ít tham khảo; coi rủi ro nhỏ.',
    dialogueStyle: 'Phán xét; thẳng thừng; gọi người khác bằng nickname xem thường.',
    conflictResponse: 'Đối đầu trực tiếp; không xuống nước; ăn miếng trả miếng.',
    driftSignals: ['xin lỗi vô cớ', 'nhường người yếu hơn', 'tự ti', 'do dự khi phải khoe tài'],
  },
  {
    slug: 'smart_strategist',
    viLabel: 'Thông minh, mưu lược',
    viDescription: 'Tính toán nhiều bước; thấy bức tranh lớn; ra quyết định dựa trên model.',
    voiceHints: 'Câu logic; nội tâm phân tích nhiều biến; hay so sánh tình huống với case study.',
    decisionStyle: 'Multi-step planning; weight rủi ro/lợi ích; tính toán phản ứng đối thủ.',
    dialogueStyle: 'Sử dụng câu hỏi dẫn dắt; ít lộ ý đồ; điều khiển dòng hội thoại.',
    conflictResponse: 'Thiết lập leverage trước khi va chạm; thắng từ outside; tránh trận đối đầu trực diện.',
    driftSignals: ['phản ứng bốc đồng', 'không có kế hoạch B', 'lộ ý đồ quá sớm', 'tin vào may mắn'],
  },
  {
    slug: 'naive_growing',
    viLabel: 'Ngây thơ nhưng trưởng thành dần',
    viDescription: 'Bắt đầu thuần khiết, dần học cách thực tế qua các va chạm.',
    voiceHints: 'Giai đoạn đầu: câu hỏi nhiều, ngạc nhiên; giai đoạn sau: chín chắn dần.',
    decisionStyle: 'Đầu: cảm tính, dễ tin. Sau: cẩn trọng hơn, học từ sai lầm.',
    dialogueStyle: 'Đầu: ngây thơ, hỏi nhiều. Sau: ít hỏi hơn, có chính kiến.',
    conflictResponse: 'Đầu: bị động, lúng túng. Sau: chủ động hơn.',
    driftSignals: ['stagnant không trưởng thành sau nhiều va chạm', 'quá chín chắn từ chương đầu', 'mất nét ngây thơ quá nhanh không có sự kiện'],
  },
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
  {
    slug: 'mildly_unhinged',
    viLabel: 'Điên nhẹ, khó đoán',
    viDescription: 'Tâm lý không hoàn toàn ổn định; phản ứng bất thường; charm pha với nguy hiểm.',
    voiceHints: 'Câu xen kẽ logic và phi logic; cảm thán bất ngờ; nội tâm hỗn loạn nhẹ.',
    decisionStyle: 'Trực giác bốc đồng; không nhất quán giữa các lần tương tự.',
    dialogueStyle: 'Cười không đúng lúc; nói chủ đề lệch; có moment lạnh sống lưng.',
    conflictResponse: 'Bất ngờ; đối thủ không đoán được; có thể tự gây tổn thương.',
    driftSignals: ['quá ổn định cả nhiều chương', 'phản ứng predictable', 'mất chất "điên" trong action'],
  },
  {
    slug: 'lazy_talented',
    viLabel: 'Cá mặn, lười nhưng có tài',
    viDescription: 'Có năng lực thật nhưng lười biếng; chỉ nỗ lực khi bắt buộc.',
    voiceHints: 'Câu uể oải; cảm thán "phiền phức"; nội tâm muốn nằm ngủ.',
    decisionStyle: 'Chọn giải pháp ít tốn năng lượng nhất; trì hoãn đến phút cuối.',
    dialogueStyle: 'Lười biếng; nói cộc; than vãn; mỉa mai sự cần mẫn của người khác.',
    conflictResponse: 'Né tránh nếu được; nếu phải, dùng full skill và end nhanh để về nghỉ.',
    driftSignals: ['cần mẫn không lý do', 'tự nguyện làm việc tốn sức', 'mất thái độ "phiền phức"'],
  },
  {
    slug: 'cautious_survivalist',
    viLabel: 'Cẩn thận, sống sót là trên hết',
    viDescription: 'Ưu tiên sống sót; risk-averse; backup plan nhiều lớp.',
    voiceHints: 'Câu cẩn trọng; nội tâm hay đánh giá rủi ro; kế hoạch chi tiết.',
    decisionStyle: 'Chọn an toàn hơn glory; rút lui nếu rủi ro chết cao.',
    dialogueStyle: 'Cẩn thận về thông tin; ít hứa hẹn; hỏi câu hỏi an toàn.',
    conflictResponse: 'Tránh nếu có thể; nếu phải, đảm bảo có exit; không màng danh dự.',
    driftSignals: ['liều lĩnh vì danh dự', 'không có exit plan', 'chấp nhận rủi ro chết vì người lạ'],
  },
  {
    slug: 'vengeful_obsessed',
    viLabel: 'Báo thù, chấp niệm sâu',
    viDescription: 'Có một mối thù hoặc mục tiêu ám ảnh chi phối mọi quyết định.',
    voiceHints: 'Câu mang tone căm hận khi nhắc đối tượng; nội tâm hay quay về ký ức cũ.',
    decisionStyle: 'Mọi action đo bằng "có giúp gần báo thù không"; sacrifice khác miễn báo thù được.',
    dialogueStyle: 'Lạnh khi nói chuyện về thù; tránh chủ đề khi nguy cơ lộ; có moment bùng phát.',
    conflictResponse: 'Nếu liên quan thù: tất tay. Nếu không: né, dồn năng lượng cho mục tiêu chính.',
    driftSignals: ['quên báo thù vì romance dễ dãi', 'tha thứ kẻ thù không có lý do mạnh', 'mất focus vào mục tiêu'],
  },
  {
    slug: 'righteous_not_naive',
    viLabel: 'Chính đạo nhưng không ngu',
    viDescription: 'Trung thực và đứng về lẽ phải, nhưng đủ thông minh để không bị lợi dụng.',
    voiceHints: 'Câu chân thành nhưng có kiểm tra; cảm thán có ngữ cảnh.',
    decisionStyle: 'Đúng-sai làm trục, nhưng tính cả hậu quả; không hi sinh vô lý.',
    dialogueStyle: 'Thẳng thắn nhưng chọn timing; không phán xét vội.',
    conflictResponse: 'Đứng về lẽ phải nhưng có chuẩn bị; không lao vào bẫy.',
    driftSignals: ['hi sinh vô lý vì người lạ', 'bỏ qua bẫy hiển nhiên', 'tin vào lời hứa đối thủ'],
  },
  {
    slug: 'redeemed_villain',
    viLabel: 'Phản diện cải tà quy chính',
    viDescription: 'Từng làm điều ác, đang trên đường chuộc lỗi nhưng quá khứ vẫn ám ảnh.',
    voiceHints: 'Câu mang gánh nặng; nội tâm hay quay về ký ức tội lỗi; ít cảm thán tích cực.',
    decisionStyle: 'Cố gắng làm điều đúng, nhưng dùng kỹ năng cũ khi cần; không từ chối phương pháp tàn nhẫn.',
    dialogueStyle: 'Cẩn trọng khi đề cập quá khứ; có moment thật; không tự bào chữa.',
    conflictResponse: 'Cố giải quyết hoà bình trước; nếu cần, dùng kỹ năng phản diện cũ — và sau đó tự dằn vặt.',
    driftSignals: ['không bao giờ nhắc quá khứ', 'không có dằn vặt', 'rơi vào điều ác mà không có lý do mạnh'],
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novel/core test catalog/personalities`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/catalog/personalities.ts packages/core/test/catalog/personalities.test.ts
git commit -m "core: add 20-entry PERSONALITIES catalog with voice/decision/drift fields"
```

---

## Task 4: Story options (10 enums)

**Files:**
- Create: `packages/core/src/catalog/story-options.ts`
- Test: `packages/core/test/catalog/story-options.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/test/catalog/story-options.test.ts
import { describe, it, expect } from 'vitest';
import {
  TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
  ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
} from '../../src/catalog/story-options.ts';

describe('story-options enums', () => {
  const enums = {
    TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
    ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
  };

  it.each(Object.entries(enums))('%s has unique slugs and non-empty viLabels', (_name, list) => {
    const slugs = list.map(x => x.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const item of list) {
      expect(item.slug).toMatch(/^[a-z_]+$/);
      expect(item.viLabel.length).toBeGreaterThan(0);
    }
  });

  it('expected counts per spec section 6.4', () => {
    expect(TONES).toHaveLength(5);
    expect(PACINGS).toHaveLength(4);
    expect(MAIN_CONFLICT_TYPES).toHaveLength(5);
    expect(POWER_SYSTEM_STYLES).toHaveLength(6);
    expect(WORLD_ERAS).toHaveLength(5);
    expect(ROMANCE_LEVELS).toHaveLength(4);
    expect(COMEDY_LEVELS).toHaveLength(4);
    expect(DARK_LEVELS).toHaveLength(4);
    expect(POVS).toHaveLength(3);
    expect(MORALITIES).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/core test catalog/story-options`
Expected: FAIL.

- [ ] **Step 3: Write the file**

```ts
// packages/core/src/catalog/story-options.ts
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
  { slug: 'ancient',         viLabel: 'Cổ đại' },
  { slug: 'modern',          viLabel: 'Hiện đại' },
  { slug: 'future',          viLabel: 'Tương lai' },
  { slug: 'otherworld',      viLabel: 'Dị giới' },
  { slug: 'post_apocalypse', viLabel: 'Hậu tận thế' },
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novel/core test catalog/story-options`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/catalog/story-options.ts packages/core/test/catalog/story-options.test.ts
git commit -m "core: add 10 secondary story option enums (tone, pacing, ...)"
```

---

## Task 5: Zod schemas + finder helpers

**Files:**
- Create: `packages/core/src/catalog/schemas.ts`
- Test: `packages/core/test/catalog/schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/test/catalog/schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  GenreSlugSchema, PersonalitySlugSchema, StoryOptionsSchema,
  findGenre, findPersonality,
} from '../../src/catalog/schemas.ts';

describe('GenreSlugSchema', () => {
  it('accepts a valid catalog slug', () => {
    expect(GenreSlugSchema.parse('tien_hiep')).toBe('tien_hiep');
    expect(GenreSlugSchema.parse('do_thi')).toBe('do_thi');
    expect(GenreSlugSchema.parse('tuy_chon')).toBe('tuy_chon');
  });

  it('rejects an unknown slug', () => {
    expect(() => GenreSlugSchema.parse('xianxia_fantasy')).toThrow();
    expect(() => GenreSlugSchema.parse('')).toThrow();
  });
});

describe('PersonalitySlugSchema', () => {
  it('accepts a valid catalog slug', () => {
    expect(PersonalitySlugSchema.parse('calm_rational')).toBe('calm_rational');
    expect(PersonalitySlugSchema.parse('tram_on')).toBe('tram_on');
  });

  it('rejects an unknown slug', () => {
    expect(() => PersonalitySlugSchema.parse('hero')).toThrow();
  });
});

describe('StoryOptionsSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(StoryOptionsSchema.parse({})).toEqual({});
  });

  it('accepts a partial object', () => {
    const parsed = StoryOptionsSchema.parse({ tone: 'serious', pov: 'first' });
    expect(parsed.tone).toBe('serious');
    expect(parsed.pov).toBe('first');
  });

  it('rejects unknown slug values', () => {
    expect(() => StoryOptionsSchema.parse({ tone: 'epic' })).toThrow();
  });
});

describe('findGenre / findPersonality', () => {
  it('findGenre returns the def for a known slug', () => {
    expect(findGenre('tien_hiep').viLabel).toBe('Tiên hiệp');
  });

  it('findGenre throws for unknown', () => {
    expect(() => findGenre('xianxia_fantasy')).toThrow(/Unknown genre/);
  });

  it('findPersonality returns the def for a known slug', () => {
    expect(findPersonality('tram_on').viLabel).toBe('Trầm ổn, có trách nhiệm');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/core test catalog/schemas`
Expected: FAIL.

- [ ] **Step 3: Write the file**

```ts
// packages/core/src/catalog/schemas.ts
import { z } from 'zod';
import { GENRES, type GenreDef, type GenreSlug } from './genres.ts';
import { PERSONALITIES, type PersonalityDef, type PersonalitySlug } from './personalities.ts';
import {
  TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
  ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
} from './story-options.ts';

function slugsOf<T extends { slug: string }>(arr: readonly T[]): [string, ...string[]] {
  const slugs = arr.map(x => x.slug);
  if (slugs.length === 0) throw new Error('catalog list cannot be empty');
  return slugs as [string, ...string[]];
}

export const GenreSlugSchema = z.enum(slugsOf(GENRES));
export const PersonalitySlugSchema = z.enum(slugsOf(PERSONALITIES));

export const StoryOptionsSchema = z.object({
  tone:                z.enum(slugsOf(TONES)).optional(),
  pacing:              z.enum(slugsOf(PACINGS)).optional(),
  mainConflictType:    z.enum(slugsOf(MAIN_CONFLICT_TYPES)).optional(),
  powerSystemStyle:    z.enum(slugsOf(POWER_SYSTEM_STYLES)).optional(),
  worldEra:            z.enum(slugsOf(WORLD_ERAS)).optional(),
  romanceLevel:        z.enum(slugsOf(ROMANCE_LEVELS)).optional(),
  comedyLevel:         z.enum(slugsOf(COMEDY_LEVELS)).optional(),
  darkLevel:           z.enum(slugsOf(DARK_LEVELS)).optional(),
  pov:                 z.enum(slugsOf(POVS)).optional(),
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novel/core test catalog`
Expected: ALL catalog tests PASS (genres + personalities + story-options + schemas).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/catalog/schemas.ts packages/core/test/catalog/schemas.test.ts
git commit -m "core: add catalog Zod schemas and finder helpers"
```

---

## Task 6: Re-export catalog from `@novel/core`

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add exports at the end of `packages/core/src/index.ts`**

```ts
// At the end of packages/core/src/index.ts (after existing exports):
export {
  GENRES, type GenreDef, type GenreSlug,
  PERSONALITIES, type PersonalityDef, type PersonalitySlug,
  GENRE_FAMILIES, type GenreFamily,
  TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
  ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
  GenreSlugSchema, PersonalitySlugSchema, StoryOptionsSchema, type StoryOptions,
  findGenre, findPersonality,
} from './catalog/index.ts';
```

- [ ] **Step 2: Build the package to verify exports compile**

Run: `pnpm --filter @novel/core build`
Expected: success.

- [ ] **Step 3: Run all core tests**

Run: `pnpm --filter @novel/core test`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "core: re-export catalog module from package root"
```

---

# PR 2 — DB migrations + Drizzle schema

## Task 7: Migration `0012_genre_personality.sql`

**Files:**
- Create: `packages/db/migrations/0012_genre_personality.sql`

- [ ] **Step 1: Write the migration**

```sql
-- packages/db/migrations/0012_genre_personality.sql

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

UPDATE stories s SET genre_locked_at = NOW()
  WHERE EXISTS (SELECT 1 FROM story_bibles b WHERE b.story_id = s.id);
```

- [ ] **Step 2: Run migration locally against dev DB**

Run: `pnpm --filter @novel/db migrate`
Expected: success — 1 new migration applied.

- [ ] **Step 3: Verify with psql**

```bash
psql $DATABASE_URL -c "\d stories" | grep -E "main_character_personality|genre_locked_at|genre "
```

Expected output (3 lines):
```
 genre                       | text                     |           | not null | 'tien_hiep'::text
 main_character_personality  | text                     |           | not null | 'tram_on'::text
 genre_locked_at             | timestamp with time zone |           |          |
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/migrations/0012_genre_personality.sql
git commit -m "db: migrate stories with personality column and genre lock timestamp"
```

---

## Task 8: Migration `0013_bible_generic_power_system.sql`

**Files:**
- Create: `packages/db/migrations/0013_bible_generic_power_system.sql`

- [ ] **Step 1: Write the migration**

```sql
-- packages/db/migrations/0013_bible_generic_power_system.sql

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
  SET power_system = '(legacy bible — chưa migrate, cần regenerate hoặc edit thủ công)'
  WHERE power_system IS NULL OR length(trim(power_system)) < 50;

ALTER TABLE story_bibles
  ALTER COLUMN power_system SET NOT NULL;
```

- [ ] **Step 2: Run migration**

Run: `pnpm --filter @novel/db migrate`
Expected: success.

- [ ] **Step 3: Verify with psql**

```bash
psql $DATABASE_URL -c "\d story_bibles" | grep -E "power_system|cultivation_system|bloodline_system"
```

Expected:
```
 cultivation_system | text                     |           |          |
 bloodline_system   | text                     |           |          |
 power_system       | text                     |           | not null |
 power_system_kind  | text                     |           | not null | 'cultivation'::text
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/migrations/0013_bible_generic_power_system.sql
git commit -m "db: migrate story_bibles with generic power_system field"
```

---

## Task 9: Update Drizzle schema (stories + story-bibles)

**Files:**
- Modify: `packages/db/src/schema/stories.ts`
- Modify: `packages/db/src/schema/story-bibles.ts`
- Test: `packages/db/test/schema.test.ts` (extend)

- [ ] **Step 1: Write a test that the schema selects new columns**

Append to `packages/db/test/schema.test.ts`:

```ts
import { stories, storyBibles } from '../src/schema/index.ts';

describe('schema columns added in 0012/0013', () => {
  it('stories table has mainCharacterPersonality + genreLockedAt', () => {
    const cols = Object.keys(stories);
    expect(cols).toContain('mainCharacterPersonality');
    expect(cols).toContain('genreLockedAt');
  });

  it('story_bibles has powerSystem + powerSystemKind; cult/blood nullable', () => {
    const cols = Object.keys(storyBibles);
    expect(cols).toContain('powerSystem');
    expect(cols).toContain('powerSystemKind');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/db test schema`
Expected: FAIL — `mainCharacterPersonality` not present.

- [ ] **Step 3: Update `stories.ts`**

```ts
// packages/db/src/schema/stories.ts
import { pgTable, uuid, text, integer, timestamp, numeric } from 'drizzle-orm/pg-core';

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

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
```

- [ ] **Step 4: Update `story-bibles.ts`**

```ts
// packages/db/src/schema/story-bibles.ts
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

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

export type StoryBible = typeof storyBibles.$inferSelect;
export type NewStoryBible = typeof storyBibles.$inferInsert;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @novel/db test schema`
Expected: PASS.

- [ ] **Step 6: Type-check the whole monorepo (catches downstream breakages)**

Run: `pnpm -r build`
Expected: API/worker may fail at sites still referring to required `cultivationSystem` insert — that is expected. Note compile errors but DO NOT fix them in this task; PR 4 wires them.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/schema/stories.ts packages/db/src/schema/story-bibles.ts packages/db/test/schema.test.ts
git commit -m "db: update drizzle schema for genre/personality/power-system fields"
```

---

# PR 3 — Prompt v2 family + contracts

## Task 10: Contract render helpers

**Files:**
- Create: `packages/ai/src/prompts/contracts/genre-contract.ts`
- Create: `packages/ai/src/prompts/contracts/personality-contract.ts`
- Create: `packages/ai/src/prompts/contracts/story-options-block.ts`
- Test: `packages/ai/test/prompts/contracts/genre-contract.test.ts`
- Test: `packages/ai/test/prompts/contracts/personality-contract.test.ts`
- Test: `packages/ai/test/prompts/contracts/story-options-block.test.ts`

- [ ] **Step 1: Write tests for genre-contract**

```ts
// packages/ai/test/prompts/contracts/genre-contract.test.ts
import { describe, it, expect } from 'vitest';
import { findGenre } from '@novel/core';
import { renderGenreContract } from '../../../src/prompts/contracts/genre-contract.ts';

describe('renderGenreContract', () => {
  it('includes label, family, allowed and discouraged tropes for "do_thi"', () => {
    const out = renderGenreContract(findGenre('do_thi'), {});
    expect(out).toContain('GENRE CONTRACT');
    expect(out).toContain('Đô thị');
    expect(out).toContain('family: urban');
    expect(out).toContain('Allowed tropes:');
    expect(out).toContain('công ty');
    expect(out).toContain('Avoid unless explicitly in canon:');
    expect(out).toContain('tu tiên');
    expect(out).toContain('PRIORITY RULES');
  });

  it('omits "Avoid unless..." line when discouragedTropes is empty (tuy_chon)', () => {
    const out = renderGenreContract(findGenre('tuy_chon'), {});
    expect(out).toContain('Tuỳ chọn');
    expect(out).not.toContain('Avoid unless explicitly in canon:');
  });
});
```

- [ ] **Step 2: Write tests for personality-contract**

```ts
// packages/ai/test/prompts/contracts/personality-contract.test.ts
import { describe, it, expect } from 'vitest';
import { findPersonality } from '@novel/core';
import { renderPersonalityContract } from '../../../src/prompts/contracts/personality-contract.ts';

describe('renderPersonalityContract', () => {
  it('renders all fields for cunning_pragmatic', () => {
    const out = renderPersonalityContract(findPersonality('cunning_pragmatic'));
    expect(out).toContain('PROTAGONIST PERSONALITY CONTRACT');
    expect(out).toContain('Gian xảo, thực dụng');
    expect(out).toContain('Voice hints:');
    expect(out).toContain('Decision style:');
    expect(out).toContain('Dialogue style:');
    expect(out).toContain('Conflict response:');
    expect(out).toContain('Drift signals to avoid:');
    expect(out).toContain('hành xử thánh mẫu');
  });
});
```

- [ ] **Step 3: Write tests for story-options-block**

```ts
// packages/ai/test/prompts/contracts/story-options-block.test.ts
import { describe, it, expect } from 'vitest';
import { renderStoryOptionsBlock } from '../../../src/prompts/contracts/story-options-block.ts';

describe('renderStoryOptionsBlock', () => {
  it('shows viLabels for set fields and "(không chỉ định)" for missing', () => {
    const out = renderStoryOptionsBlock({ tone: 'serious', pov: 'first' });
    expect(out).toContain('STORY OPTIONS');
    expect(out).toContain('Tone: Nghiêm túc');
    expect(out).toContain('POV: Ngôi nhất');
    expect(out).toContain('Pacing: (không chỉ định)');
    expect(out).toContain('Romance: (không chỉ định)');
  });

  it('handles fully empty input', () => {
    const out = renderStoryOptionsBlock({});
    expect(out).toContain('Tone: (không chỉ định)');
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm --filter @novel/ai test prompts/contracts`
Expected: FAIL — files not found.

- [ ] **Step 5: Implement `genre-contract.ts`**

```ts
// packages/ai/src/prompts/contracts/genre-contract.ts
import type { GenreDef, StoryOptions } from '@novel/core';

export function renderGenreContract(g: GenreDef, _opts: StoryOptions): string {
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

- [ ] **Step 6: Implement `personality-contract.ts`**

```ts
// packages/ai/src/prompts/contracts/personality-contract.ts
import type { PersonalityDef } from '@novel/core';

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

- [ ] **Step 7: Implement `story-options-block.ts`**

```ts
// packages/ai/src/prompts/contracts/story-options-block.ts
import {
  TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
  ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
  type StoryOptions,
} from '@novel/core';

export function renderStoryOptionsBlock(o: StoryOptions): string {
  const label = <T extends { slug: string; viLabel: string }>(
    list: readonly T[], slug: string | undefined,
  ): string => slug ? (list.find(x => x.slug === slug)?.viLabel ?? slug) : '(không chỉ định)';

  return [
    '# STORY OPTIONS',
    `Tone: ${label(TONES, o.tone)} | Pacing: ${label(PACINGS, o.pacing)} | Main conflict: ${label(MAIN_CONFLICT_TYPES, o.mainConflictType)}`,
    `Power system style: ${label(POWER_SYSTEM_STYLES, o.powerSystemStyle)} | World era: ${label(WORLD_ERAS, o.worldEra)} | POV: ${label(POVS, o.pov)}`,
    `Romance: ${label(ROMANCE_LEVELS, o.romanceLevel)} | Comedy: ${label(COMEDY_LEVELS, o.comedyLevel)} | Dark: ${label(DARK_LEVELS, o.darkLevel)} | Morality: ${label(MORALITIES, o.protagonistMorality)}`,
  ].join('\n');
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm --filter @novel/ai test prompts/contracts`
Expected: PASS (all 3 test files).

- [ ] **Step 9: Commit**

```bash
git add packages/ai/src/prompts/contracts/ packages/ai/test/prompts/contracts/
git commit -m "ai: add genre/personality/story-options contract render helpers"
```

---

## Task 11: Bible v2 schema (Zod + JSON schema)

**Files:**
- Modify: `packages/ai/src/schemas/bible.ts`
- Test: `packages/ai/test/schemas/bible.test.ts` (extend)

- [ ] **Step 1: Append a failing test**

Append to `packages/ai/test/schemas/bible.test.ts`:

```ts
import { BibleV2Schema, bibleV2JsonSchema } from '../../src/schemas/bible.ts';

describe('BibleV2Schema', () => {
  it('accepts a non-cultivation bible (urban genre, no cultivation_system)', () => {
    const ok = BibleV2Schema.parse({
      world_rules: 'x'.repeat(60),
      power_system: 'A modern urban world without cultivation. '.repeat(5),
      power_system_kind: 'urban',
      style_guide: 'x'.repeat(120),
      forbidden_rules: 'rule one rule two rule three',
      ending_direction: 'x'.repeat(110),
      compact_summary: 'x'.repeat(100),
    });
    expect(ok.power_system_kind).toBe('urban');
    expect(ok.cultivation_system).toBeUndefined();
  });

  it('rejects cultivation kind missing cultivation_system', () => {
    expect(() => BibleV2Schema.parse({
      world_rules: 'x'.repeat(60),
      power_system: 'x'.repeat(60),
      power_system_kind: 'cultivation',
      // cultivation_system intentionally missing
      style_guide: 'x'.repeat(120),
      forbidden_rules: 'rule one rule two rule three',
      ending_direction: 'x'.repeat(110),
      compact_summary: 'x'.repeat(100),
    })).toThrow(/cultivation_system/);
  });

  it('exports a JSON schema with the same required fields', () => {
    expect(bibleV2JsonSchema.required).toEqual(expect.arrayContaining([
      'world_rules', 'power_system', 'power_system_kind',
      'style_guide', 'forbidden_rules', 'ending_direction', 'compact_summary',
    ]));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/ai test schemas/bible`
Expected: FAIL — BibleV2Schema not exported.

- [ ] **Step 3: Update `packages/ai/src/schemas/bible.ts` (append; keep V1 for migration period)**

```ts
// packages/ai/src/schemas/bible.ts
import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const BibleSchema = z.object({
  world_rules: z.string().min(50),
  cultivation_system: z.string().min(50),
  bloodline_system: z.string().min(50),
  style_guide: z.string().min(50),
  forbidden_rules: z.string().min(20),
  ending_direction: z.string().min(20),
  compact_summary: z.string().min(50).max(2000),
});

export type Bible = z.infer<typeof BibleSchema>;

export const bibleJsonSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'world_rules', 'cultivation_system', 'bloodline_system',
    'style_guide', 'forbidden_rules', 'ending_direction', 'compact_summary',
  ],
  properties: {
    world_rules: { type: 'string' },
    cultivation_system: { type: 'string' },
    bloodline_system: { type: 'string' },
    style_guide: { type: 'string' },
    forbidden_rules: { type: 'string' },
    ending_direction: { type: 'string' },
    compact_summary: { type: 'string' },
  },
};

export const POWER_SYSTEM_KINDS = [
  'cultivation', 'martial', 'ability', 'tech', 'urban',
  'historical', 'horror', 'mystery', 'system', 'reincarnation', 'mixed', 'none',
] as const;

export const BibleV2Schema = z.object({
  world_rules: z.string().min(50),
  power_system: z.string().min(50),
  power_system_kind: z.enum(POWER_SYSTEM_KINDS),
  cultivation_system: z.string().min(50).optional(),
  bloodline_system: z.string().min(50).optional(),
  style_guide: z.string().min(50),
  forbidden_rules: z.string().min(20),
  ending_direction: z.string().min(20),
  compact_summary: z.string().min(50).max(2000),
}).superRefine((bible, ctx) => {
  if (bible.power_system_kind === 'cultivation' && !bible.cultivation_system) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cultivation_system'],
      message: 'cultivation_system is required when power_system_kind=cultivation',
    });
  }
});

export type BibleV2 = z.infer<typeof BibleV2Schema>;

export const bibleV2JsonSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'world_rules', 'power_system', 'power_system_kind',
    'style_guide', 'forbidden_rules', 'ending_direction', 'compact_summary',
  ],
  properties: {
    world_rules: { type: 'string' },
    power_system: { type: 'string' },
    power_system_kind: { type: 'string', enum: [...POWER_SYSTEM_KINDS] },
    cultivation_system: { type: 'string' },
    bloodline_system: { type: 'string' },
    style_guide: { type: 'string' },
    forbidden_rules: { type: 'string' },
    ending_direction: { type: 'string' },
    compact_summary: { type: 'string' },
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novel/ai test schemas/bible`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/schemas/bible.ts packages/ai/test/schemas/bible.test.ts
git commit -m "ai: add BibleV2Schema with generic power_system + conditional cultivation"
```

---

## Task 12: Prompt v2 — `bible-generator.v2.ts`

**Files:**
- Create: `packages/ai/src/prompts/bible-generator.v2.ts`
- Test: `packages/ai/test/prompts/bible-generator.v2.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/ai/test/prompts/bible-generator.v2.test.ts
import { describe, it, expect } from 'vitest';
import { findGenre, findPersonality } from '@novel/core';
import { bibleGeneratorPromptV2, type BibleGeneratorV2Input } from '../../src/prompts/bible-generator.v2.ts';

const baseInput = (genreSlug: string): BibleGeneratorV2Input => ({
  premise: 'Một nhân vật ly kỳ bị cuốn vào âm mưu lớn.',
  target_chapter_count: 1000,
  genreDef: findGenre(genreSlug),
  personalityDef: findPersonality('tram_on'),
  storyOptions: {},
});

describe('bibleGeneratorPromptV2', () => {
  it('rendered prompt for genre=do_thi does NOT contain "tiên hiệp" or "huyền huyễn"', () => {
    const out = bibleGeneratorPromptV2.render(baseInput('do_thi') as unknown as Record<string, unknown>);
    expect(out.toLowerCase()).not.toContain('tiên hiệp');
    expect(out.toLowerCase()).not.toContain('huyền huyễn');
    expect(out).toContain('Đô thị');
    expect(out).toContain('GENRE CONTRACT');
  });

  it('rendered prompt for genre=tien_hiep contains the contract and allowed tropes', () => {
    const out = bibleGeneratorPromptV2.render(baseInput('tien_hiep') as unknown as Record<string, unknown>);
    expect(out).toContain('Tiên hiệp');
    expect(out).toContain('cảnh giới');
    expect(out).toContain('power_system_kind');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novel/ai test prompts/bible-generator.v2`
Expected: FAIL.

- [ ] **Step 3: Implement the prompt**

```ts
// packages/ai/src/prompts/bible-generator.v2.ts
import type { GenreDef, PersonalityDef, StoryOptions } from '@novel/core';
import { registerPrompt, type PromptTemplate } from './registry.ts';
import { renderGenreContract } from './contracts/genre-contract.ts';
import { renderPersonalityContract } from './contracts/personality-contract.ts';
import { renderStoryOptionsBlock } from './contracts/story-options-block.ts';

export interface BibleGeneratorV2Input {
  premise: string;
  target_chapter_count: number;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions: StoryOptions;
}

const TEMPLATE = (i: BibleGeneratorV2Input): string => {
  const genreContract = renderGenreContract(i.genreDef, i.storyOptions);
  const personalityContract = renderPersonalityContract(i.personalityDef);
  const storyOptionsBlock = renderStoryOptionsBlock(i.storyOptions);

  return `Bạn là editor / world-builder cho tiểu thuyết ${i.genreDef.viLabel} tiếng Việt.
Tuân thủ Genre Contract và Personality Contract bên dưới như ràng buộc bắt buộc.

${genreContract}

${personalityContract}

${storyOptionsBlock}

Premise (ý tưởng người dùng):
${i.premise}

Mục tiêu độ dài: ${i.target_chapter_count} chương

Yêu cầu output: JSON tuân theo schema bắt buộc, mỗi field tiếng Việt:
- world_rules (≥ 200 từ): luật thế giới, không gian, lịch sử nền, phù hợp genre.
- power_system (≥ 200 từ): hệ thống sức mạnh chính của thế giới — phải phù hợp power_system_kind.
- power_system_kind: một trong cultivation | martial | ability | tech | urban | historical | horror | mystery | system | reincarnation | mixed | none. Chọn theo genre family.
- cultivation_system (CHỈ điền nếu power_system_kind='cultivation', ≥ 200 từ): cảnh giới, đột phá, vật phẩm, hạn chế.
- bloodline_system (CHỈ điền nếu genre dùng huyết mạch, ≥ 200 từ): phân loại, nguồn gốc, kế thừa.
- style_guide (≥ 100 từ): phong cách viết, POV theo storyOptions, từ vựng nên/không nên.
- forbidden_rules (≥ 5 quy tắc): những gì TUYỆT ĐỐI không được. Phải bao gồm tất cả discouragedTropes của genre đã liệt kê ở Genre Contract.
- ending_direction (≥ 100 từ).
- compact_summary (≤ 1500 từ).

Ràng buộc:
- KHÔNG đưa trope ngoài genre vào (xem "Avoid unless explicitly in canon").
- Power phải có cost / risk / limitation.
- Phong cách "show, don't tell" cinematic.
- Giữ tính nhất quán nội bộ — không có rules mâu thuẫn.

Trả lời JSON thuần, không markdown, không giải thích thêm.`;
};

export const bibleGeneratorPromptV2: PromptTemplate = {
  agentRole: 'bible_generator',
  version: 'v2',
  render: (input) => TEMPLATE(input as unknown as BibleGeneratorV2Input),
};

registerPrompt(bibleGeneratorPromptV2);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novel/ai test prompts/bible-generator.v2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/prompts/bible-generator.v2.ts packages/ai/test/prompts/bible-generator.v2.test.ts
git commit -m "ai: add bible-generator v2 prompt with genre+personality contracts"
```

---

## Task 13: Prompt v2 — `saga-planner.v2.ts`

**Files:**
- Create: `packages/ai/src/prompts/saga-planner.v2.ts`

- [ ] **Step 1: Implement (no separate test — will be covered by agent integration)**

```ts
// packages/ai/src/prompts/saga-planner.v2.ts
import type { GenreDef, StoryOptions } from '@novel/core';
import { registerPrompt, type DualPromptTemplate } from './registry.ts';
import { renderGenreContract } from './contracts/genre-contract.ts';
import { renderStoryOptionsBlock } from './contracts/story-options-block.ts';

export const sagaPlannerPromptV2: DualPromptTemplate = {
  agentRole: 'saga_planner',
  version: 'v2',
  build: (input) => {
    const targetChapters = Number(input.targetChapters) || 1000;
    const genreDef = input.genreDef as GenreDef;
    const storyOptions = (input.storyOptions ?? {}) as StoryOptions;

    let sagaCount = '5-8', sagaLength = '80-200', seedCount = '10-30', seedDistance = '20';
    if (targetChapters < 50) {
      sagaCount = '1-2'; sagaLength = '10-30'; seedCount = '3-8'; seedDistance = '3';
    } else if (targetChapters < 200) {
      sagaCount = '2-4'; sagaLength = '25-60'; seedCount = '5-15'; seedDistance = '10';
    } else if (targetChapters < 1500) {
      sagaCount = '5-10'; sagaLength = '80-200'; seedCount = '10-30'; seedDistance = '20';
    } else {
      sagaCount = '10-15'; sagaLength = '150-300'; seedCount = '20-50'; seedDistance = '40';
    }

    return {
      system: `Bạn là kiến trúc sư cốt truyện cho một bộ tiểu thuyết ${genreDef.viLabel} dài khoảng ${targetChapters} chương bằng tiếng Việt.

${renderGenreContract(genreDef, storyOptions)}

${renderStoryOptionsBlock(storyOptions)}

Nhiệm vụ: Đọc Bible (compact_summary) và đề ra ${sagaCount} SAGA bao trùm toàn bộ tiểu thuyết, mỗi saga ${sagaLength} chương. Đồng thời gieo ${seedCount} hạt mầm (planted seeds) — chi tiết, lời tiên tri, vật phẩm, nhân vật phụ — sẽ được kích hoạt và trả lời ở các chương sau. Mỗi seed phải có cửa sổ gieo (plantWindowStart..plantWindowEnd) và chương trả lời (payoffChapter).

QUY TẮC:
- Sagas KHÔNG ĐƯỢC chồng lấn về chapter range. Tổng cộng phải bao trùm toàn bộ tiểu thuyết.
- Mỗi saga có 2-8 turning points (sự kiện then chốt).
- payoffChapter PHẢI lớn hơn plantWindowEnd ít nhất ${seedDistance} chương.
- Seeds importance: minor (chi tiết bổ trợ), major (ảnh hưởng nhiều chương), climax (payoff cho saga / toàn truyện).
- Sagas và seeds PHẢI bám đúng Genre Contract — không tự ý đưa trope của thể loại khác.
- Trả về JSON đúng schema. KHÔNG giải thích gì thêm.`,
      user: `Tiểu thuyết mục tiêu: ${targetChapters} chương.\n\nBible (compact):\n${String(input.bibleCompact)}\n\nLập kế hoạch saga + planted seeds.`,
    };
  },
};

registerPrompt(sagaPlannerPromptV2);
```

- [ ] **Step 2: Quick smoke test**

Create `packages/ai/test/prompts/saga-planner.v2.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { findGenre } from '@novel/core';
import { sagaPlannerPromptV2 } from '../../src/prompts/saga-planner.v2.ts';

describe('sagaPlannerPromptV2', () => {
  it('renders without "tiên hiệp" for non-cultivation genre', () => {
    const built = sagaPlannerPromptV2.build({
      targetChapters: 200,
      bibleCompact: 'Bible compact text',
      genreDef: findGenre('do_thi'),
      storyOptions: {},
    });
    expect(built.system.toLowerCase()).not.toContain('tiên hiệp');
    expect(built.system).toContain('Đô thị');
  });
});
```

- [ ] **Step 3: Run + commit**

Run: `pnpm --filter @novel/ai test prompts/saga-planner.v2`
Expected: PASS.

```bash
git add packages/ai/src/prompts/saga-planner.v2.ts packages/ai/test/prompts/saga-planner.v2.test.ts
git commit -m "ai: add saga-planner v2 with genre contract"
```

---

## Task 14: Prompt v2 — `arc-planner.v2.ts`

**Files:**
- Create: `packages/ai/src/prompts/arc-planner.v2.ts`

- [ ] **Step 1: Implement**

```ts
// packages/ai/src/prompts/arc-planner.v2.ts
import type { GenreDef, StoryOptions } from '@novel/core';
import { registerPrompt, type DualPromptTemplate } from './registry.ts';
import { renderGenreContract } from './contracts/genre-contract.ts';
import { renderStoryOptionsBlock } from './contracts/story-options-block.ts';

export const arcPlannerPromptV2: DualPromptTemplate = {
  agentRole: 'arc_planner',
  version: 'v2',
  build: (input) => {
    const sagaStart = Number(input.sagaStart) || 1;
    const sagaEnd = Number(input.sagaEnd) || 100;
    const sagaLength = Math.max(1, sagaEnd - sagaStart + 1);
    const genreDef = input.genreDef as GenreDef;
    const storyOptions = (input.storyOptions ?? {}) as StoryOptions;

    let arcCount = '2-5', arcLength = '15-50';
    if (sagaLength < 20)        { arcCount = '1-2'; arcLength = '5-10'; }
    else if (sagaLength < 50)   { arcCount = '2-4'; arcLength = '10-25'; }
    else if (sagaLength > 150)  { arcCount = '4-8'; arcLength = '30-60'; }

    return {
      system: `Bạn là biên kịch cấp arc cho tiểu thuyết ${genreDef.viLabel} tiếng Việt. Chia nhỏ một SAGA thành ${arcCount} ARC, mỗi arc ${arcLength} chương.

${renderGenreContract(genreDef, storyOptions)}

${renderStoryOptionsBlock(storyOptions)}

YÊU CẦU:
- Tổng các arc PHẢI bao trùm toàn bộ chapter range của saga, không chồng lấn.
- Mỗi arc có 1-8 expectedChanges (sự kiện trạng thái cụ thể).
- Nếu unresolved seeds nằm trong saga này, hãy ưu tiên gán payoff vào arc tương ứng (seedsToResolveInArc).
- Bám đúng Genre Contract — không tự ý đưa trope của thể loại khác.
- Trả về JSON đúng schema. Không giải thích.`,
      user: `SAGA "${String(input.sagaTitle)}" (ch ${String(input.sagaStart)}-${String(input.sagaEnd)}):\n${String(input.sagaPremise)}\n\nTurning points:\n${Array.isArray(input.turningPoints) ? (input.turningPoints as string[]).map((t, i) => `${i + 1}. ${t}`).join('\n') : ''}\n\nTrạng thái hiện tại:\n${String(input.currentState)}\n\nSeeds chưa giải quyết:\n${Array.isArray(input.unresolvedSeeds) ? (input.unresolvedSeeds as {seedKey: string; description: string; payoffChapter: number}[]).map((s) => `- ${s.seedKey} (payoff ch ${s.payoffChapter}): ${s.description}`).join('\n') : '(none)'}`,
    };
  },
};

registerPrompt(arcPlannerPromptV2);
```

- [ ] **Step 2: Smoke test**

Create `packages/ai/test/prompts/arc-planner.v2.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { findGenre } from '@novel/core';
import { arcPlannerPromptV2 } from '../../src/prompts/arc-planner.v2.ts';

describe('arcPlannerPromptV2', () => {
  it('embeds genre contract and avoids tien hiep wording for di_nang', () => {
    const built = arcPlannerPromptV2.build({
      sagaStart: 1, sagaEnd: 100, sagaLength: 100,
      sagaTitle: 'Saga 1', sagaPremise: 'p', turningPoints: [],
      currentState: 'init', unresolvedSeeds: [],
      genreDef: findGenre('di_nang'), storyOptions: {},
    });
    expect(built.system.toLowerCase()).not.toContain('tiên hiệp');
    expect(built.system).toContain('Dị năng');
  });
});
```

- [ ] **Step 3: Run + commit**

Run: `pnpm --filter @novel/ai test prompts/arc-planner.v2`
Expected: PASS.

```bash
git add packages/ai/src/prompts/arc-planner.v2.ts packages/ai/test/prompts/arc-planner.v2.test.ts
git commit -m "ai: add arc-planner v2 with genre contract"
```

---

## Task 15: Prompt v2 — `packet-generator.v2.ts`

**Files:**
- Create: `packages/ai/src/prompts/packet-generator.v2.ts`

- [ ] **Step 1: Implement**

```ts
// packages/ai/src/prompts/packet-generator.v2.ts
import type { GenreDef, PersonalityDef, StoryOptions } from '@novel/core';
import { registerPrompt, type DualPromptTemplate } from './registry.ts';
import { renderGenreContract } from './contracts/genre-contract.ts';
import { renderPersonalityContract } from './contracts/personality-contract.ts';
import { renderStoryOptionsBlock } from './contracts/story-options-block.ts';

export type PacketGeneratorV2PromptInput = {
  bibleCompact: string;
  arcSummary: string;
  recentChapterSummaries: { chapterNumber: number; summary: string }[];
  activeCharacters: { name: string; currentRealm?: string; status: string; faction?: string }[];
  openThreads: { title: string; state: string }[];
  duePlantedSeeds: { id: string; seedText: string; payoffDescription: string; plantWindowEnd: number }[];
  overdueThreads: { title: string; introducedChapter: number }[];
  forbiddenRules: string;
  chapterNumber: number;
  arcGoals: string;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions: StoryOptions;
};

export const packetGeneratorPromptV2: DualPromptTemplate = {
  agentRole: 'packet_generator',
  version: 'v2',
  build: (input) => {
    const genreDef = input.genreDef as GenreDef;
    const personalityDef = input.personalityDef as PersonalityDef;
    const storyOptions = (input.storyOptions ?? {}) as StoryOptions;
    const recent = input.recentChapterSummaries as { chapterNumber: number; summary: string }[];
    const chars = input.activeCharacters as { name: string; currentRealm?: string; status: string; faction?: string }[];
    const threads = input.openThreads as { title: string; state: string }[];
    const seeds = input.duePlantedSeeds as { id: string; seedText: string; payoffDescription: string; plantWindowEnd: number }[];
    const overdue = input.overdueThreads as { title: string; introducedChapter: number }[];

    return {
      system: `Bạn là planner chương cho tiểu thuyết ${genreDef.viLabel} tiếng Việt. Trả JSON đúng schema. KHÔNG viết nội dung chương — chỉ kế hoạch.

${renderGenreContract(genreDef, storyOptions)}

${renderPersonalityContract(personalityDef)}

${renderStoryOptionsBlock(storyOptions)}`,
      user: [
        `# BIBLE`, input.bibleCompact, '',
        `# ARC HIỆN TẠI`, input.arcSummary, '',
        `# ARC GOALS`, input.arcGoals, '',
        `# 5 CHƯƠNG GẦN NHẤT`,
        ...recent.map(s => `- Ch${s.chapterNumber}: ${s.summary}`),
        '',
        `# NHÂN VẬT ĐANG HOẠT ĐỘNG`,
        ...chars.map(c => `- ${c.name} [${c.status}] realm=${c.currentRealm ?? '-'} faction=${c.faction ?? '-'}`),
        '',
        `# THREADS ĐANG MỞ`,
        ...threads.map(t => `- ${t.title} [${t.state}]`),
        '',
        `# SEEDS NÊN PLANT TRONG CHƯƠNG NÀY`,
        ...seeds.map(s => `- (id=${s.id}) MUST plant: "${s.seedText}" — pays off: ${s.payoffDescription} — window ends ch${s.plantWindowEnd}`),
        '',
        overdue.length > 0 ? `# THREAD QUÁ HẠN — cần resolve sớm:` : '',
        ...overdue.map(t => `- ${t.title} (intro ch${t.introducedChapter})`),
        '',
        `# CẤM`, input.forbiddenRules, '',
        `# YÊU CẦU`,
        `Lập kế hoạch chương ${String(input.chapterNumber)}. BÁM ĐÚNG GENRE CONTRACT và PERSONALITY CONTRACT ở trên.`,
        `BẮT BUỘC: ít nhất 1 conflict + 1 cliffhanger.`,
        `BẮT BUỘC: requiredEvents phải gồm các "MUST plant" seed ở trên (gắn đúng seedId). NẾU KHÔNG có seedId dạng UUID từ mục "# SEEDS NÊN PLANT", TUYỆT ĐỐI KHÔNG tự bịa seedId (bỏ trống trường seedId).`,
        `GIỚI HẠN ĐỘ DÀI: goal <= 500 ký tự; conflict <= 500; cliffhanger <= 500; mỗi requiredEvents.description <= 500.`,
        `Viết ngắn gọn, trọn ý, không lặp.`,
        `forbiddenMoves: liệt kê những đòn từ # CẤM mà chương này nên tránh dùng.`,
        `Trả về JSON theo schema ChapterPacket.`,
      ].filter(Boolean).join('\n'),
    };
  },
};

registerPrompt(packetGeneratorPromptV2);
```

- [ ] **Step 2: Smoke test**

Create `packages/ai/test/prompts/packet-generator.v2.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { findGenre, findPersonality } from '@novel/core';
import { packetGeneratorPromptV2 } from '../../src/prompts/packet-generator.v2.ts';

describe('packetGeneratorPromptV2', () => {
  it('system prompt embeds genre + personality + storyOptions blocks', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [],
      overdueThreads: [], forbiddenRules: 'no harem', chapterNumber: 1, arcGoals: 'g',
      genreDef: findGenre('cao_vo'),
      personalityDef: findPersonality('overbearing_decisive'),
      storyOptions: { tone: 'serious' },
    });
    expect(built.system).toContain('GENRE CONTRACT');
    expect(built.system).toContain('Cao võ');
    expect(built.system).toContain('PERSONALITY CONTRACT');
    expect(built.system).toContain('Bá đạo, quyết đoán');
    expect(built.system).toContain('Tone: Nghiêm túc');
  });
});
```

- [ ] **Step 3: Run + commit**

Run: `pnpm --filter @novel/ai test prompts/packet-generator.v2`
Expected: PASS.

```bash
git add packages/ai/src/prompts/packet-generator.v2.ts packages/ai/test/prompts/packet-generator.v2.test.ts
git commit -m "ai: add packet-generator v2 with full contract injection"
```

---

## Task 16: Prompt v2 — `writer.v2.ts`

**Files:**
- Create: `packages/ai/src/prompts/writer.v2.ts`
- Test: `packages/ai/test/prompts/writer.v2.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/ai/test/prompts/writer.v2.test.ts
import { describe, it, expect } from 'vitest';
import { findGenre } from '@novel/core';
import { writerPromptV2 } from '../../src/prompts/writer.v2.ts';

describe('writerPromptV2', () => {
  it('system prompt includes the chosen genre label and not "tiên hiệp/huyền huyễn"', () => {
    const built = writerPromptV2.build({
      serializedContext: 'CTX',
      genreDef: findGenre('do_thi'),
    });
    expect(built.system.toLowerCase()).not.toContain('tiên hiệp');
    expect(built.system.toLowerCase()).not.toContain('huyền huyễn');
    expect(built.system).toContain('Đô thị');
    expect(built.user).toBe('CTX');
  });
});
```

- [ ] **Step 2: Run test to fail**

Run: `pnpm --filter @novel/ai test prompts/writer.v2`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/ai/src/prompts/writer.v2.ts
import type { GenreDef } from '@novel/core';
import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export interface WriterV2PromptInput {
  serializedContext: string;
  genreDef: GenreDef;
}

export const writerPromptV2: DualPromptTemplate = {
  agentRole: 'writer',
  version: 'v2',
  build: (input) => {
    const { serializedContext, genreDef } = input as unknown as WriterV2PromptInput;
    return {
      system: `Bạn là tác giả tiểu thuyết ${genreDef.viLabel} tiếng Việt. Tuân BIBLE, GENRE CONTRACT, PROTAGONIST PERSONALITY CONTRACT, STORY OPTIONS, STYLE GUIDE, POWER SYSTEM tuyệt đối. Viết ~2000-3000 từ. Đầu ra theo định dạng:\n\nTITLE: <tiêu đề>\n\n<nội dung>`,
      user: serializedContext,
    };
  },
};

registerPrompt(writerPromptV2);
```

- [ ] **Step 4: Run + commit**

Run: `pnpm --filter @novel/ai test prompts/writer.v2`
Expected: PASS.

```bash
git add packages/ai/src/prompts/writer.v2.ts packages/ai/test/prompts/writer.v2.test.ts
git commit -m "ai: add writer v2 prompt with dynamic genre label"
```

---

## Task 17: Prompt v2 — `llm-validator.v2.ts`

**Files:**
- Create: `packages/ai/src/prompts/llm-validator.v2.ts`
- Test: `packages/ai/test/prompts/llm-validator.v2.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/ai/test/prompts/llm-validator.v2.test.ts
import { describe, it, expect } from 'vitest';
import { findGenre, findPersonality } from '@novel/core';
import { llmValidatorPromptV2 } from '../../src/prompts/llm-validator.v2.ts';

describe('llmValidatorPromptV2', () => {
  it('system prompt enumerates 7 criteria including genre drift and personality drift', () => {
    const built = llmValidatorPromptV2.build({
      serializedContext: 'C', chapterContent: 'x', chapterTitle: 't', chapterNumber: 1,
      genreDef: findGenre('do_thi'),
      personalityDef: findPersonality('cunning_pragmatic'),
    });
    expect(built.system).toMatch(/6\.\s*Genre drift/);
    expect(built.system).toMatch(/7\.\s*Personality drift/);
    expect(built.system).toContain('Đô thị');
    expect(built.system).toContain('Gian xảo, thực dụng');
  });
});
```

- [ ] **Step 2: Run to fail; implement**

Run: `pnpm --filter @novel/ai test prompts/llm-validator.v2` (FAIL).

```ts
// packages/ai/src/prompts/llm-validator.v2.ts
import type { GenreDef, PersonalityDef } from '@novel/core';
import { registerPrompt, type DualPromptTemplate } from './registry.ts';
import { renderGenreContract } from './contracts/genre-contract.ts';
import { renderPersonalityContract } from './contracts/personality-contract.ts';

export interface LlmValidatorV2PromptInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
}

export const llmValidatorPromptV2: DualPromptTemplate = {
  agentRole: 'llm_validator',
  version: 'v2',
  build: (input) => {
    const i = input as unknown as LlmValidatorV2PromptInput;
    return {
      system: `Bạn là biên tập viên kiểm duyệt cho tiểu thuyết ${i.genreDef.viLabel} tiếng Việt.
Nhiệm vụ: đánh giá chương "${i.chapterTitle}" (chương ${i.chapterNumber}) theo tiêu chí canon-nhất quán, logic cốt truyện, phong cách viết, bám sát kế hoạch arc/saga, và tuân Genre + Personality Contract.

${renderGenreContract(i.genreDef, {})}

${renderPersonalityContract(i.personalityDef)}

Kiểm tra:
1. Canon nhất quán — nhân vật đã chết không xuất hiện, fact đã lock không trái phép.
2. Logic cốt truyện — mâu thuẫn nội bộ, seed unresolved, plot hole.
3. Phong cách — đúng STYLE GUIDE, không lặp từ, không exposition dump, show-don't-tell.
4. Bám sát kế hoạch — arc expected changes, turning points, cảnh giới lệch tiến độ. Filler chương → severity=high.
5. Mức độ nghiêm trọng: low / medium / high / critical.
6. Genre drift — kiểm tra trope bị "Avoid unless explicitly in canon" của Genre Contract xuất hiện không có lý do canon. Nếu có → severity=medium hoặc high.
7. Personality drift — kiểm tra main character có hành xử trùng với "Drift signals to avoid" của Personality Contract không. Nếu có và không có character development hợp lý → severity=medium.

Trả về JSON theo schema yêu cầu.`,
      user: `--- CANON CONTEXT ---\n${i.serializedContext}\n\n--- CHAPTER CONTENT ---\n${i.chapterContent}`,
    };
  },
};

registerPrompt(llmValidatorPromptV2);
```

- [ ] **Step 3: Run + commit**

Run: `pnpm --filter @novel/ai test prompts/llm-validator.v2`
Expected: PASS.

```bash
git add packages/ai/src/prompts/llm-validator.v2.ts packages/ai/test/prompts/llm-validator.v2.test.ts
git commit -m "ai: add llm-validator v2 with genre and personality drift criteria"
```

---

## Task 18: Prompt v2 — `auto-fixer.v2.ts`

**Files:**
- Create: `packages/ai/src/prompts/auto-fixer.v2.ts`

- [ ] **Step 1: Implement**

```ts
// packages/ai/src/prompts/auto-fixer.v2.ts
import type { GenreDef } from '@novel/core';
import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export interface AutoFixerV2PromptInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  issues: { code: string; severity: string; message: string }[];
  genreDef: GenreDef;
}

export const autoFixerPromptV2: DualPromptTemplate = {
  agentRole: 'auto_fixer',
  version: 'v2',
  build: (input) => {
    const i = input as unknown as AutoFixerV2PromptInput;
    const issueList = i.issues.map((x, idx) => `${idx + 1}. [${x.severity}] ${x.code}: ${x.message}`).join('\n');
    return {
      system: `Bạn là biên tập viên sửa chữa cho tiểu thuyết ${i.genreDef.viLabel} tiếng Việt.
Nhiệm vụ: sửa chương "${i.chapterTitle}" (chương ${i.chapterNumber}) dựa trên các vấn đề được chỉ ra.
Tuân BIBLE, GENRE CONTRACT, PROTAGONIST PERSONALITY CONTRACT, STORY OPTIONS, STYLE GUIDE, POWER SYSTEM tuyệt đối. Giữ nguyên câu chuyện, chỉ sửa các vấn đề.
Đầu ra theo định dạng:\n\nTITLE: <tiêu đề>\n\n<nội dung đã sửa>`,
      user: `--- CANON CONTEXT ---\n${i.serializedContext}\n\n--- VẤN ĐỀ CẦN SỬA ---\n${issueList}\n\n--- NỘI DUNG GỐC ---\n${i.chapterContent}`,
    };
  },
};

registerPrompt(autoFixerPromptV2);
```

- [ ] **Step 2: Smoke test + commit**

Run: `pnpm --filter @novel/ai build` to verify it compiles.
Expected: success.

```bash
git add packages/ai/src/prompts/auto-fixer.v2.ts
git commit -m "ai: add auto-fixer v2 with dynamic genre label"
```

---

## Task 19: Prompt v2 — `canon-extractor.v2.ts`

**Files:**
- Create: `packages/ai/src/prompts/canon-extractor.v2.ts`

- [ ] **Step 1: Implement (no genre injection — canon extraction is genre-agnostic)**

```ts
// packages/ai/src/prompts/canon-extractor.v2.ts
import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export type CanonExtractorV2PromptInput = {
  chapterNumber: number;
  chapterContent: string;
  bibleCompact: string;
  canonSnapshot: string;
  plantedSeeds: { id: string; seedText: string; payoffDescription: string; status: string }[];
  recentSummary: string;
};

export const canonExtractorPromptV2: DualPromptTemplate = {
  agentRole: 'canon_extractor',
  version: 'v2',
  build: (input) => ({
    system: `Bạn là canon-extractor cho một tiểu thuyết tiếng Việt. Phân tích chương vừa viết, trích xuất mọi thay đổi canon.
Quy tắc:
- Chỉ trích những gì CHẮC CHẮN xảy ra trong chương, KHÔNG suy diễn.
- Realm regression (nếu có hệ thống cảnh giới) phải có intentionalRegression=true CHỈ KHI có đoạn nội tâm/hội thoại giải thích.
- Thread chỉ resolve khi có scene closure rõ ràng.
- Canon fact importance='locked' chỉ dành cho quy tắc thế giới cốt lõi.
- Trả JSON đúng schema ExtractorOutput.`,
    user: [
      `# CHƯƠNG ${String(input.chapterNumber)}`,
      input.chapterContent,
      '',
      `# BIBLE (tóm tắt)`,
      input.bibleCompact,
      '',
      `# CANON SNAPSHOT (hiện tại)`,
      input.canonSnapshot,
      '',
      `# SEEDS ĐÃ PLANT`,
      ...(input.plantedSeeds as { id: string; seedText: string; payoffDescription: string; status: string }[]).map(s =>
        `- (id=${s.id}) "${s.seedText}" — payoff: ${s.payoffDescription} [${s.status}]`
      ),
      '',
      `# TÓM TẮT CHƯƠNG TRƯỚC`,
      input.recentSummary,
      '',
      `Trích xuất canon changes. Trả JSON theo ExtractorOutput schema.`,
    ].filter(Boolean).join('\n'),
  }),
};

registerPrompt(canonExtractorPromptV2);
```

- [ ] **Step 2: Build + commit**

Run: `pnpm --filter @novel/ai build`
Expected: success.

```bash
git add packages/ai/src/prompts/canon-extractor.v2.ts
git commit -m "ai: add canon-extractor v2 (genre-agnostic)"
```

---

## Task 20: Prompt v2 — `summary-compactor.v2.ts`

**Files:**
- Create: `packages/ai/src/prompts/summary-compactor.v2.ts`

- [ ] **Step 1: Implement**

```ts
// packages/ai/src/prompts/summary-compactor.v2.ts
import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export type SummaryCompactorV2PromptInput = {
  chapterNumber: number;
  chapterContent: string;
  previousSummary: string;
  bibleCompact: string;
};

export const summaryCompactorPromptV2: DualPromptTemplate = {
  agentRole: 'summary_compactor',
  version: 'v2',
  build: (input) => ({
    system: `Bạn là summary-compactor cho một tiểu thuyết tiếng Việt. Tóm tắt chương vừa viết thành bản chi tiết (tối đa 2000 ký tự Unicode).
Quy tắc:
- Chỉ tóm tắt những gì THỰC SỰ xảy ra.
- keyEvents là sự kiện quan trọng nhất, ưu tiên conflict, đột phá, plot twist.
- charactersPresent là nhân vật CÓ MẶT trong chương.
- moodShift so với chương trước (nếu có).
- Trả JSON đúng schema.`,
    user: [
      `# CHƯƠNG ${String(input.chapterNumber)}`,
      input.chapterContent,
      '',
      `# TÓM TẮT CHƯƠNG TRƯỚC`,
      input.previousSummary,
      '',
      `# BIBLE (tham khảo)`,
      input.bibleCompact,
      '',
      `Tóm tắt chương. Trả JSON theo SummaryCompactorOutput schema.`,
    ].filter(Boolean).join('\n'),
  }),
};

registerPrompt(summaryCompactorPromptV2);
```

- [ ] **Step 2: Build + commit**

```bash
git add packages/ai/src/prompts/summary-compactor.v2.ts
git commit -m "ai: add summary-compactor v2 (genre-agnostic)"
```

---

## Task 21: Prompt v2 — `arc-summary-compactor.v2.ts`

**Files:**
- Create: `packages/ai/src/prompts/arc-summary-compactor.v2.ts`

- [ ] **Step 1: Implement**

```ts
// packages/ai/src/prompts/arc-summary-compactor.v2.ts
import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export const arcSummaryCompactorPromptV2: DualPromptTemplate = {
  agentRole: 'summary_compactor',
  version: 'arc_v2',
  build: (input) => ({
    system: `Bạn là biên tập tóm lược arc cho một tiểu thuyết dài tiếng Việt. Nhận tóm tắt từng chương, viết LẠI một bản tóm tắt arc dài tối đa 1200 từ tiếng Việt, giữ:
- mọi sự kiện có liên quan đến seeds/locked facts
- mọi đột phá / chuyển biến quan hệ chính (nếu có)
- diễn biến chính đã xảy ra (không tiên đoán tương lai)
Bỏ mô tả cảnh, chi tiết miêu tả nhỏ, dialog không quan trọng. Trả về plain text duy nhất, không markdown.`,
    user: `Arc: ${String(input.arcTitle)}\n\n${Array.isArray(input.perChapterSummaries) ? (input.perChapterSummaries as {chapterNumber: number; summary: string}[]).map((c) => `Ch ${c.chapterNumber}: ${c.summary}`).join('\n\n') : ''}`,
  }),
};

registerPrompt(arcSummaryCompactorPromptV2);
```

- [ ] **Step 2: Build + commit**

```bash
git add packages/ai/src/prompts/arc-summary-compactor.v2.ts
git commit -m "ai: add arc-summary-compactor v2 (genre-agnostic)"
```

---

## Task 22: Prompt v2 — `high-stakes-reviewer.v2.ts`

**Files:**
- Create: `packages/ai/src/prompts/high-stakes-reviewer.v2.ts`

- [ ] **Step 1: Implement**

```ts
// packages/ai/src/prompts/high-stakes-reviewer.v2.ts
import type { GenreDef, PersonalityDef } from '@novel/core';
import { registerPrompt, type DualPromptTemplate } from './registry.ts';
import { renderGenreContract } from './contracts/genre-contract.ts';
import { renderPersonalityContract } from './contracts/personality-contract.ts';

export const highStakesReviewerPromptV2: DualPromptTemplate = {
  agentRole: 'high_stakes_reviewer',
  version: 'v2',
  build: (input) => {
    const genreDef = input.genreDef as GenreDef;
    const personalityDef = input.personalityDef as PersonalityDef;
    return {
      system: `Bạn là biên tập trưởng (chief editor) cho tiểu thuyết ${genreDef.viLabel} dài bằng tiếng Việt. Bạn KHÔNG viết lại — chỉ đánh giá.

${renderGenreContract(genreDef, {})}

${renderPersonalityContract(personalityDef)}

Nhiệm vụ: Đọc TOÀN BỘ chương vừa hoàn thành cùng arc summary và bible. Đánh giá liệu chương này:
- Giữ vững giọng văn và quy tắc thế giới (bible)
- Tiến triển arc một cách hợp lý
- Không gây mâu thuẫn lớn với canon
- Có nhịp độ phù hợp (không cố nhồi nhét, cũng không lê thê)
- Tuân Genre Contract (không drift sang trope thể loại khác)
- Tuân Personality Contract (main character không drift)

Trả về JSON đúng schema. KHÔNG viết lại nội dung. Nếu approve=true, concerns vẫn có thể chứa các chú ý nhỏ. Nếu approve=false, ít nhất một concern phải severity high hoặc critical.

Mỗi recommendedAction PHẢI là một trong:
- rewrite_chapter
- patch_with_auto_fixer
- edit_canon
- plant_followup_seed
- no_action`,
      user: `BIBLE (compact):\n${String(input.bibleCompact)}\n\nARC SUMMARY:\n${String(input.arcSummary)}\n\nCHƯƠNG (${String(input.chapterTitle)}):\n${String(input.chapterContent)}`,
    };
  },
};

registerPrompt(highStakesReviewerPromptV2);
```

- [ ] **Step 2: Build + commit**

```bash
git add packages/ai/src/prompts/high-stakes-reviewer.v2.ts
git commit -m "ai: add high-stakes-reviewer v2 with genre+personality contracts"
```

---

# PR 4 — Pipeline wiring + validators

## Task 23: `loadStoryDomainContext` (in `@novel/ai` for both worker + api)

**Files:**
- Create: `packages/ai/src/story-domain.ts`
- Test: `packages/ai/test/story-domain.test.ts`

Rationale: this loader is used by both `apps/worker` (chapter pipeline) and `apps/api` (bible POST). Putting it in `@novel/ai` avoids cross-app imports.

- [ ] **Step 1: Failing test**

Pattern note: this project mocks `@novel/db` per-test (see `apps/worker/test/services/story-config.test.ts`). Follow that pattern.

```ts
// packages/ai/test/story-domain.test.ts
import { describe, expect, it, vi } from 'vitest';

const storiesRows: Array<Record<string, unknown>> = [];
const settingsRows: Array<Record<string, unknown>> = [];

vi.mock('@novel/db', () => {
  const select = (rows: Array<Record<string, unknown>>) => ({
    from: () => ({ where: async () => rows }),
  });
  return {
    getDb: () => ({
      select: () => {
        let next: 'stories' | 'settings' = 'stories';
        return {
          from: (table: { __name?: string }) => {
            next = table.__name === 'story_settings' ? 'settings' : 'stories';
            return { where: async () => (next === 'stories' ? storiesRows : settingsRows) };
          },
        };
      },
    }),
  };
});

vi.mock('@novel/db/schema', () => ({
  stories: { __name: 'stories' },
  storySettings: { __name: 'story_settings' },
}));

describe('loadStoryDomainContext', () => {
  it('returns genre def, personality def, parsed storyOptions and family', async () => {
    storiesRows.length = 0;
    settingsRows.length = 0;
    storiesRows.push({
      id: 's1', genre: 'do_thi', mainCharacterPersonality: 'cunning_pragmatic',
    });
    settingsRows.push({
      storyId: 's1',
      overrides: { storyOptions: { tone: 'serious', pov: 'first' } },
    });

    const { loadStoryDomainContext } = await import('../src/story-domain.ts');
    const db = (await import('@novel/db')).getDb();
    const out = await loadStoryDomainContext(db as any, 's1');

    expect(out.genreDef.slug).toBe('do_thi');
    expect(out.genreFamily).toBe('urban');
    expect(out.personalityDef.slug).toBe('cunning_pragmatic');
    expect(out.storyOptions.tone).toBe('serious');
    expect(out.storyOptions.pov).toBe('first');
  });

  it('falls back to empty storyOptions when settings missing', async () => {
    storiesRows.length = 0;
    settingsRows.length = 0;
    storiesRows.push({
      id: 's2', genre: 'tien_hiep', mainCharacterPersonality: 'tram_on',
    });

    const { loadStoryDomainContext } = await import('../src/story-domain.ts');
    const db = (await import('@novel/db')).getDb();
    const out = await loadStoryDomainContext(db as any, 's2');
    expect(out.storyOptions).toEqual({});
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @novel/worker test services/story-domain`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// packages/ai/src/story-domain.ts
import { eq } from 'drizzle-orm';
import type { Db } from '@novel/db';
import { stories, storySettings } from '@novel/db/schema';
import {
  findGenre, findPersonality, StoryOptionsSchema,
  type GenreDef, type PersonalityDef, type StoryOptions, type GenreFamily,
} from '@novel/core';

export type StoryDomainContext = {
  storyId: string;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions: StoryOptions;
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

  return {
    storyId,
    genreDef,
    personalityDef,
    storyOptions,
    genreFamily: genreDef.family,
  };
}
```

- [ ] **Step 4: Add re-export from `@novel/ai` index**

In `packages/ai/src/index.ts` append:

```ts
export { loadStoryDomainContext, type StoryDomainContext } from './story-domain.ts';
```

- [ ] **Step 5: Run + commit**

Run: `pnpm --filter @novel/ai test story-domain`
Expected: PASS.

```bash
git add packages/ai/src/story-domain.ts packages/ai/test/story-domain.test.ts packages/ai/src/index.ts
git commit -m "ai: add loadStoryDomainContext for use by worker and api"
```

---

## Task 24: Update `HotTier` and `buildHotTier` to accept domain

**Files:**
- Modify: `packages/ai/src/context/types.ts`
- Modify: `packages/ai/src/context/builder.ts`

- [ ] **Step 1: Update `HotTier` type**

In `packages/ai/src/context/types.ts`, replace the `HotTier` definition:

```ts
export type HotTier = {
  systemRules: string;
  bibleCompact: string;
  styleGuide: string;
  powerSystem: string;
  powerSystemKind: string;
  styleFewShots: StyleFewShot[];
  genreContract: string;
  personalityContract: string;
  storyOptionsBlock: string;
};
```

- [ ] **Step 2: Update `buildContext` signature in `builder.ts`**

In `packages/ai/src/context/builder.ts`:

```ts
// Add to imports at top:
import type { GenreDef, PersonalityDef, StoryOptions, GenreFamily } from '@novel/core';
import { renderGenreContract } from '../prompts/contracts/genre-contract.js';
import { renderPersonalityContract } from '../prompts/contracts/personality-contract.js';
import { renderStoryOptionsBlock } from '../prompts/contracts/story-options-block.js';

// Update BuildContextDeps:
export type BuildContextDeps = {
  db: Db;
  storyId: string;
  chapterNumber: number;
  arcId: string;
  chapterId: string;
  packet: ChapterPacket;
  embeddingService: EmbeddingService;
  traceId: string;
  domain: { genreDef: GenreDef; personalityDef: PersonalityDef; storyOptions: StoryOptions; genreFamily: GenreFamily };
  config?: Partial<ContextConfig>;
  logger?: BuilderLogger;
};
```

Inside `buildContext`, change `const hot = buildHotTier(bible, cfg);` to:

```ts
const hot = buildHotTier(bible, deps.domain, cfg);
```

Replace the `buildHotTier` function:

```ts
function buildHotTier(
  bible: {
    worldRules: string; forbiddenRules: string; styleGuide: string;
    powerSystem?: string | null; powerSystemKind?: string | null;
    cultivationSystem?: string | null; bloodlineSystem?: string | null;
    compactSummary: string | null;
    styleFewShots: StyleFewShot[] | string[];
  } | null,
  domain: { genreDef: GenreDef; personalityDef: PersonalityDef; storyOptions: StoryOptions },
  cfg: ContextConfig,
): HotTier {
  if (!bible) {
    return {
      systemRules: '',
      bibleCompact: '',
      styleGuide: '',
      powerSystem: '',
      powerSystemKind: 'none',
      styleFewShots: [],
      genreContract: renderGenreContract(domain.genreDef, domain.storyOptions),
      personalityContract: renderPersonalityContract(domain.personalityDef),
      storyOptionsBlock: renderStoryOptionsBlock(domain.storyOptions),
    };
  }

  const fewShots: StyleFewShot[] = Array.isArray(bible.styleFewShots)
    ? bible.styleFewShots.map(s => typeof s === 'string' ? { excerpt: s } : s)
    : [];

  const powerSystemText = bible.powerSystem
    ?? [bible.cultivationSystem, bible.bloodlineSystem].filter(Boolean).join('\n\n');

  return {
    systemRules: `${bible.worldRules}\n\n# QUY TẮC CẤM\n${bible.forbiddenRules}`,
    bibleCompact: bible.compactSummary ?? '',
    styleGuide: bible.styleGuide,
    powerSystem: powerSystemText,
    powerSystemKind: bible.powerSystemKind ?? 'cultivation',
    styleFewShots: fewShots.slice(0, cfg.STYLE_FEWSHOT_COUNT),
    genreContract: renderGenreContract(domain.genreDef, domain.storyOptions),
    personalityContract: renderPersonalityContract(domain.personalityDef),
    storyOptionsBlock: renderStoryOptionsBlock(domain.storyOptions),
  };
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @novel/ai build`
Expected: success (caller in worker will fail in next task — that's expected).

- [ ] **Step 4: Commit**

```bash
git add packages/ai/src/context/types.ts packages/ai/src/context/builder.ts
git commit -m "ai/context: thread story domain into HotTier and buildContext"
```

---

## Task 25: Update agents — bible-generator, writer, auto-fixer, llm-validator, high-stakes-reviewer

These agents need to switch from v1 prompts to v2 prompts and accept `domain` (or sub-fields) in their input.

**Files:**
- Modify: `packages/ai/src/agents/bible-generator.ts`
- Modify: `packages/ai/src/agents/writer.ts`
- Modify: `packages/ai/src/agents/auto-fixer.ts`
- Modify: `packages/ai/src/agents/llm-validator.ts`
- Modify: `packages/ai/src/agents/high-stakes-reviewer.ts`

- [ ] **Step 1: Update `bible-generator.ts`**

Replace the file contents:

```ts
// packages/ai/src/agents/bible-generator.ts
import type { GenreDef, PersonalityDef, StoryOptions } from '@novel/core';
import { withCompletionRetry } from '../parse-completion-json.ts';
import type { LLMProvider } from '../providers/types.ts';
import { BibleV2Schema, bibleV2JsonSchema, type BibleV2 } from '../schemas/bible.ts';
import '../prompts/bible-generator.v2.ts';
import { bibleGeneratorPromptV2 } from '../prompts/bible-generator.v2.ts';

export interface GenerateBibleParams {
  provider: LLMProvider;
  model: string;
  input: {
    premise: string;
    target_chapter_count: number;
    genreDef: GenreDef;
    personalityDef: PersonalityDef;
    storyOptions: StoryOptions;
  };
  traceId?: string;
  storyId?: string;
}

export interface GenerateBibleResult {
  bible: BibleV2;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  rawContent: string;
}

export async function generateBible(params: GenerateBibleParams): Promise<GenerateBibleResult> {
  const userContent = bibleGeneratorPromptV2.render(params.input as unknown as Record<string, unknown>);

  let lastUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  let lastContent = '';
  const parsed = BibleV2Schema.parse(
    await withCompletionRetry(
      'bible_generator',
      async () => {
        const res = await params.provider.complete({
          model: params.model,
          messages: [{ role: 'user', content: userContent }],
          responseSchema: bibleV2JsonSchema,
          temperature: 0.7,
          metadata: {
            agentRole: bibleGeneratorPromptV2.agentRole,
            promptVersion: bibleGeneratorPromptV2.version,
            traceId: params.traceId,
            storyId: params.storyId,
          },
        });
        lastUsage = res.usage;
        lastContent = res.content;
        return res;
      },
      3,
    ),
  );
  return { bible: parsed, usage: lastUsage, rawContent: lastContent };
}
```

- [ ] **Step 2: Update `writer.ts`**

```ts
// packages/ai/src/agents/writer.ts
import { GENERATION_CONFIG, MODEL_CONFIG, type GenreDef } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { writerPromptV2 } from '../prompts/writer.v2.ts';

export interface WriterDeps {
  provider: LLMProvider;
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
  model?: string;
}

export interface WriterInput {
  serializedContext: string;
  cacheKey: string;
  chapterNumber: number;
  storyId: string;
  traceId: string;
  genreDef: GenreDef;
}

export interface WriterResult {
  title: string;
  content: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  cost: number;
}

export class WriterAgent {
  constructor(private readonly deps: WriterDeps) {}

  async write(input: WriterInput): Promise<WriterResult> {
    const built = writerPromptV2.build({
      serializedContext: input.serializedContext,
      genreDef: input.genreDef,
    } as unknown as Record<string, unknown>);

    const res = await this.deps.provider.complete({
      model: this.deps.model ?? MODEL_CONFIG.routes.writer,
      messages: [
        { role: 'system', content: built.system },
        { role: 'user', content: built.user },
      ],
      temperature: GENERATION_CONFIG.WRITER_TEMPERATURE,
      topP: GENERATION_CONFIG.WRITER_TOP_P,
      metadata: {
        agentRole: writerPromptV2.agentRole,
        promptVersion: writerPromptV2.version,
        traceId: input.traceId,
        storyId: input.storyId,
      },
    });

    const { title, content } = parseTitleAndContent(res.content);
    return { title, content, usage: res.usage, cost: 0 };
  }
}

export function parseTitleAndContent(raw: string): { title: string; content: string } {
  const match = raw.match(/^\s*TITLE:\s*(.+?)\n+([\s\S]+)$/);
  if (!match) {
    const lines = raw.split('\n');
    const title = (lines[0] ?? '').trim() || 'Vô đề';
    const content = lines.slice(1).join('\n').trim();
    return { title, content };
  }
  return { title: match[1]!.trim(), content: match[2]!.trim() };
}
```

- [ ] **Step 3: Update `auto-fixer.ts`**

```ts
// packages/ai/src/agents/auto-fixer.ts
import { GENERATION_CONFIG, MODEL_CONFIG, type GenreDef } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { autoFixerPromptV2 } from '../prompts/auto-fixer.v2.ts';
import { parseTitleAndContent } from './writer.ts';

export interface AutoFixerDeps {
  provider: LLMProvider;
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
  model?: string;
}

export interface AutoFixerInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  issues: { code: string; severity: string; message: string }[];
  storyId: string;
  traceId: string;
  genreDef: GenreDef;
}

export interface AutoFixerResult {
  title: string; content: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  cost: number;
}

export class AutoFixerAgent {
  constructor(private readonly deps: AutoFixerDeps) {}

  async fix(input: AutoFixerInput): Promise<AutoFixerResult> {
    const built = autoFixerPromptV2.build({
      serializedContext: input.serializedContext,
      chapterContent: input.chapterContent,
      chapterTitle: input.chapterTitle,
      chapterNumber: input.chapterNumber,
      issues: input.issues,
      genreDef: input.genreDef,
    } as unknown as Record<string, unknown>);

    const res = await this.deps.provider.complete({
      model: this.deps.model ?? MODEL_CONFIG.routes.auto_fixer,
      messages: [
        { role: 'system', content: built.system },
        { role: 'user', content: built.user },
      ],
      temperature: GENERATION_CONFIG.WRITER_TEMPERATURE,
      topP: GENERATION_CONFIG.WRITER_TOP_P,
      metadata: {
        agentRole: autoFixerPromptV2.agentRole,
        promptVersion: autoFixerPromptV2.version,
        traceId: input.traceId,
        storyId: input.storyId,
      },
    });

    const { title, content } = parseTitleAndContent(res.content);
    return { title, content, usage: res.usage, cost: 0 };
  }
}
```

- [ ] **Step 4: Update `llm-validator.ts`**

```ts
// packages/ai/src/agents/llm-validator.ts
import { GENERATION_CONFIG, MODEL_CONFIG, type GenreDef, type PersonalityDef } from '@novel/core';
import type { LLMProvider } from '../providers/types.ts';
import { llmValidatorPromptV2 } from '../prompts/llm-validator.v2.ts';
import { withCompletionRetry } from '../parse-completion-json.ts';
import { LlmValidatorOutputSchema, llmValidatorJsonSchema, type LlmValidatorOutput } from '../schemas/validator.ts';

export interface LlmValidatorDeps {
  provider: LLMProvider;
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
  model?: string;
}

export interface LlmValidatorInput {
  serializedContext: string;
  chapterContent: string;
  chapterTitle: string;
  chapterNumber: number;
  storyId: string;
  traceId: string;
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
}

export interface LlmValidatorResult {
  output: LlmValidatorOutput;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  cost: number;
}

export class LlmValidatorAgent {
  constructor(private readonly deps: LlmValidatorDeps) {}

  async validate(input: LlmValidatorInput): Promise<LlmValidatorResult> {
    const built = llmValidatorPromptV2.build({
      serializedContext: input.serializedContext,
      chapterContent: input.chapterContent,
      chapterTitle: input.chapterTitle,
      chapterNumber: input.chapterNumber,
      genreDef: input.genreDef,
      personalityDef: input.personalityDef,
    } as unknown as Record<string, unknown>);

    let lastUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
    const parsed = LlmValidatorOutputSchema.parse(
      await withCompletionRetry(
        'llm_validator',
        async () => {
          const res = await this.deps.provider.complete({
            model: this.deps.model ?? MODEL_CONFIG.routes.llm_validator,
            messages: [
              { role: 'system', content: built.system },
              { role: 'user', content: built.user },
            ],
            temperature: GENERATION_CONFIG.LLM_VALIDATOR_TEMPERATURE,
            responseSchema: llmValidatorJsonSchema,
            metadata: {
              agentRole: llmValidatorPromptV2.agentRole,
              promptVersion: llmValidatorPromptV2.version,
              traceId: input.traceId,
              storyId: input.storyId,
            },
          });
          lastUsage = res.usage;
          return res;
        },
        3,
      ),
    );
    return { output: parsed, usage: lastUsage, cost: 0 };
  }
}
```

- [ ] **Step 5: Update `high-stakes-reviewer.ts`**

In `packages/ai/src/agents/high-stakes-reviewer.ts`, change the import + interface + build call:

```ts
// Replace import:
import { highStakesReviewerPromptV2 } from '../prompts/high-stakes-reviewer.v2.ts';

// Add to HighStakesReviewInput:
export interface HighStakesReviewInput {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  triggerReason: 'arc_end' | 'critical_severity' | 'manual';
  chapter: { title: string; content: string };
  arcSummary: string;
  bibleCompact: string;
  genreDef: import('@novel/core').GenreDef;
  personalityDef: import('@novel/core').PersonalityDef;
}

// In review(), change built = ... call:
const built = highStakesReviewerPromptV2.build({
  chapterTitle: input.chapter.title,
  chapterContent: input.chapter.content,
  arcSummary: input.arcSummary,
  bibleCompact: input.bibleCompact,
  genreDef: input.genreDef,
  personalityDef: input.personalityDef,
} as Record<string, unknown>);

// And update metadata + persist promptVersion to use highStakesReviewerPromptV2.version.
```

(Keep all other logic intact — only swap v1 → v2 and add 2 new input fields.)

- [ ] **Step 6: Build to surface caller breakages**

Run: `pnpm --filter @novel/ai build`
Expected: success (or only worker/api callsites fail — fix in Task 29).

- [ ] **Step 7: Commit**

```bash
git add packages/ai/src/agents/bible-generator.ts packages/ai/src/agents/writer.ts packages/ai/src/agents/auto-fixer.ts packages/ai/src/agents/llm-validator.ts packages/ai/src/agents/high-stakes-reviewer.ts
git commit -m "ai/agents: switch bible/writer/auto-fixer/validator/reviewer to v2 prompts"
```

---

## Task 26: Update agents — packet-generator, saga-planner, arc-planner, canon-extractor, summary-compactor, arc-summary-compactor

**Files:**
- Modify: `packages/ai/src/agents/packet-generator.ts`
- Modify: `packages/ai/src/agents/saga-planner.ts`
- Modify: `packages/ai/src/agents/arc-planner.ts`
- Modify: `packages/ai/src/agents/canon-extractor.ts`
- Modify: `packages/ai/src/agents/summary-compactor.ts`
- Modify: `packages/ai/src/agents/arc-summary-compactor.ts`

- [ ] **Step 1: Update `packet-generator.ts`**

In `packages/ai/src/agents/packet-generator.ts`:
- Change import: `import { packetGeneratorPromptV2, type PacketGeneratorV2PromptInput } from '../prompts/packet-generator.v2.ts';`
- In `repairPacket`, change `promptVersion: PACKET_REPAIR_PROMPT_VERSION` to derive from v2: `const PACKET_REPAIR_PROMPT_VERSION = \`${packetGeneratorPromptV2.version}-repair-v1\`;`
- In `generate`, change `packetGeneratorPromptV1.build(...)` → `packetGeneratorPromptV2.build(...)` and update its input typing to `PacketGeneratorV2PromptInput`.
- Update metadata `agentRole`/`promptVersion` references to `packetGeneratorPromptV2.*`.

(All other logic preserved.)

- [ ] **Step 2: Update `saga-planner.ts`**

In `packages/ai/src/agents/saga-planner.ts`:
- Change import: `import { sagaPlannerPromptV2 } from '../prompts/saga-planner.v2.ts';`
- Add to `SagaPlannerInput` (in `saga-planner.types.ts`): `genreDef: GenreDef; storyOptions: StoryOptions;`
- In `plan()`, change `sagaPlannerPromptV1.build({ bibleCompact, targetChapters })` to also pass `genreDef: input.genreDef, storyOptions: input.storyOptions`.
- Update metadata to `sagaPlannerPromptV2.*`.

Update `packages/ai/src/agents/saga-planner.types.ts`:

```ts
import type { GenreDef, StoryOptions } from '@novel/core';

export interface SagaPlannerInput {
  storyId: string;
  bibleCompact: string;
  targetChapters: number;
  genreDef: GenreDef;
  storyOptions: StoryOptions;
}

export interface SagaPlannerResult {
  output: import('../schemas/saga.ts').SagaPlannerOutput;
  promptVersion: string;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
}
```

- [ ] **Step 3: Update `arc-planner.ts`**

In `packages/ai/src/agents/arc-planner.ts`:
- Change import: `import { arcPlannerPromptV2 } from '../prompts/arc-planner.v2.ts';`
- Add `genreDef: GenreDef; storyOptions: StoryOptions;` to `ArcPlannerInput`.
- In `plan()`, pass them into `arcPlannerPromptV2.build(...)`.

- [ ] **Step 4: Update `canon-extractor.ts`**

In `packages/ai/src/agents/canon-extractor.ts`:
- Change import: `import { canonExtractorPromptV2, type CanonExtractorV2PromptInput } from '../prompts/canon-extractor.v2.ts';`
- Update typing to `CanonExtractorV2PromptInput` and metadata to `canonExtractorPromptV2.*`.

- [ ] **Step 5: Update `summary-compactor.ts`**

In `packages/ai/src/agents/summary-compactor.ts`:
- Switch from v1 to `summaryCompactorPromptV2` and `arcSummaryCompactorPromptV2` (the file likely has both compactors). Update metadata and typing accordingly.

- [ ] **Step 6: Update `arc-summary-compactor.ts`** (worker job)

In `apps/worker/src/jobs/refresh-arc-summary.ts` (which uses the arc summary compactor) — change `arcSummaryCompactorPromptV1` references to `arcSummaryCompactorPromptV2`.

- [ ] **Step 7: Build**

Run: `pnpm -r build`
Expected: failures only at `generate-chapter.ts` and `bible.ts` (API route) callsites — wired in Task 29-30.

- [ ] **Step 8: Commit**

```bash
git add packages/ai/src/agents/ apps/worker/src/jobs/refresh-arc-summary.ts
git commit -m "ai/agents: switch packet/saga/arc/canon/summary compactor agents to v2 prompts"
```

---

## Task 27: Validators — gate by `genreFamily`

**Files:**
- Modify: `packages/ai/src/validators/deterministic/runner.ts`
- Modify: `packages/ai/src/validators/packet-auditor.ts`
- Test: `packages/ai/test/validators/deterministic/runner.test.ts` (extend)
- Test: `packages/ai/test/validators/packet-auditor.test.ts` (new or extend)

- [ ] **Step 1: Add a failing test to runner**

Append to `packages/ai/test/validators/deterministic/runner.test.ts`:

```ts
describe('buildChecks gating by genreFamily', () => {
  it('includes realm_jump and new_bloodline_source for cultivation', () => {
    const checks = buildChecks('forbidden text', 'cultivation');
    const ids = checks.map(c => c.id);
    expect(ids).toContain('realm_jump');
    expect(ids).toContain('new_bloodline_source');
  });

  it('omits realm_jump and new_bloodline_source for ability', () => {
    const checks = buildChecks('forbidden text', 'ability');
    const ids = checks.map(c => c.id);
    expect(ids).not.toContain('realm_jump');
    expect(ids).not.toContain('new_bloodline_source');
  });

  it('omits realm_jump for urban', () => {
    const checks = buildChecks('forbidden text', 'urban');
    expect(checks.map(c => c.id)).not.toContain('realm_jump');
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @novel/ai test validators/deterministic/runner`
Expected: FAIL — `buildChecks` only takes 1 arg.

- [ ] **Step 3: Update `runner.ts`**

```ts
// packages/ai/src/validators/deterministic/runner.ts
import type { GenreFamily } from '@novel/core';
import type { CheckInput, CheckResult, DeterministicCheck, Severity } from './types.ts';
import { wordCountCheck } from './word-count.ts';
import { deadCharacterCheck } from './dead-character.ts';
import { realmJumpCheck } from './realm-jump.ts';
import { lockedFactCheck } from './locked-fact.ts';
import { makeForbiddenMoveCheck } from './forbidden-move.ts';
import { unknownCharacterCheck } from './unknown-character.ts';
import { unknownLocationCheck } from './unknown-location.ts';
import { newBloodlineSourceCheck } from './new-bloodline-source.ts';
import { cliffhangerCheck } from './cliffhanger.ts';
import { conflictPresenceCheck } from './conflict-presence.ts';
import { styleRedFlagsCheck } from './style-red-flags.ts';
import { repetitionCheck } from './repetition.ts';

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

export function buildChecks(forbiddenRulesText: string, genreFamily: GenreFamily): DeterministicCheck[] {
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

  return allChecks.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
}

export type DeterministicValidatorResult = {
  pass: boolean;
  checks: { id: string; severity: Severity; pass: boolean; issues: string[] }[];
  shortCircuited: boolean;
};

export function runDeterministicValidator(input: CheckInput, checks: DeterministicCheck[]): DeterministicValidatorResult {
  const results: DeterministicValidatorResult['checks'] = [];
  let overallPass = true;
  let shortCircuited = false;

  for (const check of checks) {
    const result: CheckResult = check.run(input);
    results.push({ id: check.id, severity: check.severity, pass: result.pass, issues: result.issues });
    if (!result.pass) {
      overallPass = false;
      if (check.severity === 'critical') {
        shortCircuited = true;
        break;
      }
    }
  }

  return { pass: overallPass, checks: results, shortCircuited };
}
```

- [ ] **Step 4: Update existing runner tests that call `buildChecks(text)` to `buildChecks(text, 'cultivation')` so they keep passing.**

Run: `pnpm --filter @novel/ai test validators/deterministic/runner -t "buildChecks"` and adjust call sites.

- [ ] **Step 5: Update `packet-auditor.ts`**

```ts
// packages/ai/src/validators/packet-auditor.ts
import { GENERATION_CONFIG, type GenreFamily } from '@novel/core';
import type { ChapterPacket } from '../schemas/packet.ts';

export type AuditInput = {
  packet: ChapterPacket;
  characters: { name: string; status: string; currentRealm?: string }[];
  forbiddenRules: string;
  duePlantedSeeds: { id: string; seedText: string; plantWindowEnd: number }[];
  overdueTurningPoints?: string[];
};

export type AuditCtx = { genreFamily: GenreFamily };

export type AuditIssue = {
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
};

export type AuditResult = { pass: boolean; issues: AuditIssue[]; requiresRegenerate: boolean };

const REALM_ORDER = [
  'phàm nhân', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh',
  'hóa thần', 'luyện hư', 'hợp thể', 'đại thừa', 'độ kiếp',
];

function realmRank(r?: string): number {
  if (!r) return -1;
  const lower = r.toLowerCase();
  return REALM_ORDER.findIndex(x => lower.includes(x));
}

export function auditPacket(input: AuditInput, ctx: AuditCtx): AuditResult {
  const issues: AuditIssue[] = [];
  const charByName = new Map(input.characters.map(c => [c.name.toLowerCase(), c]));

  for (const name of input.packet.charactersPresent) {
    const c = charByName.get(name.toLowerCase());
    if (c && c.status === 'dead') {
      issues.push({ code: 'dead_character', severity: 'critical', message: `Nhân vật "${name}" đã chết theo canon nhưng có mặt trong packet.` });
    }
  }

  const eventIds = new Set(input.packet.requiredEvents.map(e => e.seedId).filter(Boolean));
  for (const seed of input.duePlantedSeeds) {
    if (input.packet.chapterNumber >= seed.plantWindowEnd && !eventIds.has(seed.id)) {
      issues.push({
        code: 'unresolved_due_seed',
        severity: seed.plantWindowEnd === input.packet.chapterNumber ? 'critical' : 'high',
        message: `Seed "${seed.seedText}" (id=${seed.id}) phải plant trước/tại ch${seed.plantWindowEnd} nhưng không xuất hiện trong requiredEvents.`,
      });
    }
  }

  if (!input.packet.conflict || input.packet.conflict.trim().length < 8) {
    issues.push({ code: 'missing_conflict', severity: 'high', message: 'Packet thiếu conflict rõ ràng.' });
  }
  if (!input.packet.cliffhanger || input.packet.cliffhanger.trim().length < 8) {
    issues.push({ code: 'missing_cliffhanger', severity: 'high', message: 'Packet thiếu cliffhanger rõ ràng.' });
  }

  if (ctx.genreFamily === 'cultivation') {
    for (const c of input.packet.charactersPresent) {
      const canonChar = charByName.get(c.toLowerCase());
      if (!canonChar) continue;
      const startRank = realmRank(canonChar.currentRealm);
      const breakCount = input.packet.requiredEvents.filter(e => /đột phá|breakthrough|thăng cấp/i.test(e.description)).length;
      if (breakCount > 0 && startRank >= 0 && breakCount > GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER) {
        issues.push({
          code: 'realm_jump_excess',
          severity: 'critical',
          message: `Packet đề xuất ${breakCount} đột phá trong cùng 1 chương (max ${GENERATION_CONFIG.MAX_REALM_JUMP_PER_CHAPTER}).`,
        });
      }
    }
  }

  if (input.overdueTurningPoints && input.overdueTurningPoints.length > 0) {
    const packetText = [
      input.packet.goal, input.packet.conflict,
      ...input.packet.requiredEvents.map(e => e.description),
    ].join(' ').toLowerCase();

    const missedTps = input.overdueTurningPoints.filter(tp => {
      const keywords = tp.toLowerCase().split(/[\s,，、.。!！?？]+/).filter(w => w.length >= 3);
      return !keywords.some(kw => packetText.includes(kw));
    });

    if (missedTps.length > 0) {
      issues.push({
        code: 'overdue_turning_point',
        severity: 'high',
        message: `Packet không đề cập tới turning point quá hạn: ${missedTps.map(tp => `"${tp}"`).join('; ')}. Goal/requiredEvents phải thể hiện ít nhất 1 TP này.`,
      });
    }
  }

  const hasCritical = issues.some(i => i.severity === 'critical');
  const hasHigh = issues.some(i => i.severity === 'high');
  return { pass: !hasCritical && !hasHigh, issues, requiresRegenerate: hasCritical || hasHigh };
}
```

- [ ] **Step 6: Add packet-auditor test**

Append to `packages/ai/test/validators/packet-auditor.test.ts` (create if missing):

```ts
import { describe, it, expect } from 'vitest';
import { auditPacket } from '../../src/validators/packet-auditor.ts';
import type { ChapterPacket } from '../../src/schemas/packet.ts';

const basePacket: ChapterPacket = {
  chapterNumber: 5,
  goal: 'Một mục tiêu rõ ràng',
  conflict: 'Mâu thuẫn rõ ràng',
  cliffhanger: 'Cliffhanger rõ ràng',
  setting: 's', notes: 'n',
  charactersPresent: ['Lý Phong'],
  forbiddenMoves: [], toneHints: [],
  requiredEvents: [
    { description: 'Đột phá cảnh giới mới', seedId: '' },
    { description: 'Đột phá lần thứ hai', seedId: '' },
    { description: 'Đột phá lần thứ ba', seedId: '' },
  ],
};

describe('auditPacket realm-jump gating', () => {
  it('fires realm_jump_excess when family=cultivation', () => {
    const result = auditPacket(
      { packet: basePacket, characters: [{ name: 'Lý Phong', status: 'alive', currentRealm: 'luyện khí' }], forbiddenRules: '', duePlantedSeeds: [] },
      { genreFamily: 'cultivation' },
    );
    expect(result.issues.some(i => i.code === 'realm_jump_excess')).toBe(true);
  });

  it('does NOT fire realm_jump_excess when family=ability', () => {
    const result = auditPacket(
      { packet: basePacket, characters: [{ name: 'Lý Phong', status: 'alive', currentRealm: 'luyện khí' }], forbiddenRules: '', duePlantedSeeds: [] },
      { genreFamily: 'ability' },
    );
    expect(result.issues.some(i => i.code === 'realm_jump_excess')).toBe(false);
  });
});
```

- [ ] **Step 7: Run all validator tests**

Run: `pnpm --filter @novel/ai test validators`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/ai/src/validators/ packages/ai/test/validators/
git commit -m "ai/validators: gate realm_jump and new_bloodline checks by genre family"
```

---

## Task 28: Re-export contracts and `BibleV2` from `@novel/ai`

**Files:**
- Modify: `packages/ai/src/index.ts`

(`loadStoryDomainContext` was already re-exported in Task 23.)

- [ ] **Step 1: Append exports**

Append to `packages/ai/src/index.ts`:

```ts
export { renderGenreContract } from './prompts/contracts/genre-contract.ts';
export { renderPersonalityContract } from './prompts/contracts/personality-contract.ts';
export { renderStoryOptionsBlock } from './prompts/contracts/story-options-block.ts';
export { BibleV2Schema, bibleV2JsonSchema, type BibleV2 } from './schemas/bible.ts';
```

- [ ] **Step 2: Build**

Run: `pnpm --filter @novel/ai build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add packages/ai/src/index.ts
git commit -m "ai: re-export contract render helpers and BibleV2 from package root"
```

---

## Task 29: Wire `domain` into worker `generate-chapter.ts`

**Files:**
- Modify: `apps/worker/src/jobs/generate-chapter.ts`

This is the central orchestration. The worker now loads `domain` once at job start and threads it into every agent + builder + validator call.

- [ ] **Step 1: Add import + load domain at top of `runGenerateChapter` function**

In `apps/worker/src/jobs/generate-chapter.ts`, add to imports:

```ts
import { loadStoryDomainContext, type StoryDomainContext } from '@novel/ai';
```

Near the top of the job's main entrypoint (after `db` is established and before any agent calls), add:

```ts
const domain = await loadStoryDomainContext(db, storyId);
```

(Adjust variable names to match the actual job's existing variables.)

- [ ] **Step 2: Pass `domain` into all callsites**

Replace each agent invocation as follows:

- `WriterAgent.write({...})` — add `genreDef: domain.genreDef`.
- `AutoFixerAgent.fix({...})` — add `genreDef: domain.genreDef`.
- `LlmValidatorAgent.validate({...})` — add `genreDef: domain.genreDef, personalityDef: domain.personalityDef`.
- `PacketGenerator.generate(input, ctx)` — `input` already contains the context fields; ALSO pass `genreDef: domain.genreDef, personalityDef: domain.personalityDef, storyOptions: domain.storyOptions` into `input`.
- `SagaPlannerAgent.plan(input)` — input gets `genreDef`, `storyOptions`.
- `ArcPlannerAgent.plan(input)` — input gets `genreDef`, `storyOptions`.
- `CanonExtractor.extract(input, ctx)` — no change to input (genre-agnostic).
- `SummaryCompactor.compact(input)` — no change.
- `HighStakesReviewerAgent.review(input)` — input gets `genreDef`, `personalityDef`.
- `buildContext({ ..., domain })` — pass domain.
- `buildChecks(forbiddenRulesText, domain.genreFamily)` — pass family.
- `auditPacket(input, { genreFamily: domain.genreFamily })` — pass ctx.

Search the file for each callsite and update accordingly:

```bash
rg -n "WriterAgent|AutoFixerAgent|LlmValidatorAgent|PacketGenerator|SagaPlannerAgent|ArcPlannerAgent|HighStakesReviewerAgent|buildContext|buildChecks|auditPacket" apps/worker/src/jobs/generate-chapter.ts
```

- [ ] **Step 3: Build the worker**

Run: `pnpm --filter @novel/worker build`
Expected: success (or surface remaining type errors and fix them).

- [ ] **Step 4: Run worker tests if any exist**

Run: `pnpm --filter @novel/worker test`
Expected: PASS (or update existing fixtures to add the new fields).

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/jobs/generate-chapter.ts
git commit -m "worker: thread story domain into all agent and validator calls"
```

---

## Task 30: Set `genre_locked_at` after bible insert

**Files:**
- Modify: `apps/api/src/routes/bible.ts`
- Test: `apps/api/test/bible.test.ts` (extend)

- [ ] **Step 1: Failing test**

Pattern note: existing API tests use `buildServer()` + `app.inject(...)` and env vars (`NOVEL_FORCE_MOCK_LLM=1`, `NOVEL_MOCK_LLM_RESPONSE=<json>`) to mock the LLM provider. Update the existing `apps/api/test/bible.test.ts` to:
1. Switch the mock LLM JSON from BibleV1 shape to BibleV2 shape (replace `cultivation_system`/`bloodline_system` with `power_system`/`power_system_kind`).
2. Add a new test asserting `genreLockedAt` is set after bible POST.

Replace the file contents:

```ts
// apps/api/test/bible.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.ts';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;
process.env.OPENCODE_API_KEY = 'test-key';
process.env.NOVEL_FORCE_MOCK_LLM = '1';

const VALID_BIBLE_V2 = JSON.stringify({
  world_rules: 'A'.repeat(200),
  power_system: 'P'.repeat(200),
  power_system_kind: 'urban',
  style_guide: 'D'.repeat(120),
  forbidden_rules: 'E'.repeat(40),
  ending_direction: 'F'.repeat(60),
  compact_summary: 'G'.repeat(120),
});
process.env.NOVEL_MOCK_LLM_RESPONSE = VALID_BIBLE_V2;

const app = buildServer();
beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });

describe('bible routes', () => {
  it('generates and persists v2 bible (urban, no cultivation fields)', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'BibleTest', premise: 'A'.repeat(50), genre: 'do_thi' },
    });
    const story = JSON.parse(created.body);

    const gen = await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });
    expect(gen.statusCode).toBe(201);
    const bible = JSON.parse(gen.body);
    expect(bible.worldRules).toMatch(/^A+$/);
    expect(bible.powerSystem).toMatch(/^P+$/);
    expect(bible.powerSystemKind).toBe('urban');
    expect(bible.cultivationSystem).toBeNull();
    expect(bible.bloodlineSystem).toBeNull();
  });

  it('sets genre_locked_at after successful bible insert', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'LockTest', premise: 'A'.repeat(50), genre: 'do_thi' },
    });
    const story = JSON.parse(created.body);
    expect(story.genreLockedAt).toBeNull();

    await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });

    const refetched = await app.inject({ method: 'GET', url: `/api/stories/${story.id}` });
    const refetchedBody = JSON.parse(refetched.body);
    expect(refetchedBody.genreLockedAt).not.toBeNull();
  });

  it('PUT updates bible and bumps version', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'EditTest', premise: 'A'.repeat(50), genre: 'do_thi' },
    });
    const story = JSON.parse(created.body);
    await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });

    const upd = await app.inject({
      method: 'PUT', url: `/api/stories/${story.id}/bible`,
      payload: { worldRules: 'EDITED'.repeat(20), styleGuide: 'edited-style'.repeat(10) },
    });
    expect(upd.statusCode).toBe(200);
    const updated = JSON.parse(upd.body);
    expect(updated.version).toBe(2);
    expect(updated.worldRules).toMatch(/^(EDITED)+$/);
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @novel/api test bible`
Expected: FAIL — genre_locked_at stays null.

- [ ] **Step 3: Update `apps/api/src/routes/bible.ts` POST handler**

Add imports:

```ts
import { eq } from 'drizzle-orm';
import { stories } from '@novel/db/schema';
import { loadStoryDomainContext } from '@novel/ai';
```

Change the bible generation call to load domain and pass it:

```ts
const domain = await loadStoryDomainContext(db, story.id);

const { bible } = await generateBible({
  provider,
  model: modelStatus.routes.bible_generator,
  input: {
    premise: story.premise,
    target_chapter_count: story.targetChapterCount,
    genreDef: domain.genreDef,
    personalityDef: domain.personalityDef,
    storyOptions: domain.storyOptions,
  },
  traceId,
  storyId: story.id,
});
```

After the successful `[row] = await db.insert(storyBibles)...returning()` line, add:

```ts
await db.update(stories)
  .set({ genreLockedAt: new Date() })
  .where(eq(stories.id, story.id));
```

Update the insert call to persist v2 fields:

```ts
const [row] = await db.insert(storyBibles).values({
  storyId: story.id,
  worldRules: bible.world_rules,
  powerSystem: bible.power_system,
  powerSystemKind: bible.power_system_kind,
  cultivationSystem: bible.cultivation_system ?? null,
  bloodlineSystem: bible.bloodline_system ?? null,
  styleGuide: bible.style_guide,
  forbiddenRules: bible.forbidden_rules,
  endingDirection: bible.ending_direction,
  compactSummary: bible.compact_summary,
}).returning();
```

- [ ] **Step 4: Run test to pass**

Run: `pnpm --filter @novel/api test bible`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/bible.ts apps/api/test/bible.test.ts
git commit -m "api: load domain, persist v2 bible fields, set genre_locked_at"
```

---

# PR 5 — API + UI

## Task 31: API `POST /api/stories` with catalog validation

**Files:**
- Modify: `apps/api/src/routes/stories.ts`
- Test: `apps/api/test/stories.test.ts` (extend)

- [ ] **Step 1: Failing tests**

Pattern note: existing API tests share a single `app = buildServer()` at module top-level with `beforeAll(app.ready)` / `afterAll(app.close)` (see `apps/api/test/stories.test.ts`). Append new tests to that existing file using the same `app` variable:

```ts
// (append inside the existing describe block in apps/api/test/stories.test.ts)

describe('POST /api/stories with catalog validation', () => {
  it('rejects unknown genre slug', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 't', premise: 'p'.repeat(25), genre: 'xianxia_fantasy' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('defaults genre to tien_hiep and personality to tram_on', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 't', premise: 'p'.repeat(25) },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.genre).toBe('tien_hiep');
    expect(body.mainCharacterPersonality).toBe('tram_on');
  });

  it('persists storyOptions into story_settings.overrides', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: {
        title: 't', premise: 'p'.repeat(25),
        genre: 'do_thi', mainCharacterPersonality: 'cunning_pragmatic',
        storyOptions: { tone: 'serious', pov: 'first', worldEra: 'modern' },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    const settingsRes = await app.inject({ method: 'GET', url: `/api/stories/${body.id}/settings` });
    const settings = JSON.parse(settingsRes.body);
    expect(settings.overrides.storyOptions.tone).toBe('serious');
    expect(settings.overrides.storyOptions.pov).toBe('first');
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @novel/api test stories`
Expected: FAIL.

- [ ] **Step 3: Implement**

Replace `CreateStorySchema` and the POST handler in `apps/api/src/routes/stories.ts`:

```ts
import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { stories, storySettings } from '@novel/db/schema';
import { eq, desc } from 'drizzle-orm';
import { GenreSlugSchema, PersonalitySlugSchema, StoryOptionsSchema } from '@novel/core';

const CreateStorySchema = z.object({
  title: z.string().min(1).max(200),
  premise: z.string().min(20).max(5000),
  genre: GenreSlugSchema.default('tien_hiep'),
  mainCharacterPersonality: PersonalitySlugSchema.default('tram_on'),
  tone: z.string().nullish(),
  storyOptions: StoryOptionsSchema.default({}),
  targetChapterCount: z.number().int().min(1).max(10000).default(1000),
});

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.post('/api/stories', async (req, reply) => {
    const db = getDb();
    let body: z.infer<typeof CreateStorySchema>;
    try {
      body = CreateStorySchema.parse(req.body);
    } catch (e) {
      return reply.status(400).send({ error: 'validation_failed', details: (e as Error).message });
    }

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

  app.get('/api/stories', async () => {
    const db = getDb();
    return db.select().from(stories).orderBy(desc(stories.createdAt)).limit(100);
  });

  app.get<{ Params: { id: string } }>('/api/stories/:id', async (req, reply) => {
    const db = getDb();
    const id = z.string().uuid().parse(req.params.id);
    const [row] = await db.select().from(stories).where(eq(stories.id, id));
    if (!row) return reply.status(404).send({ error: 'not_found' });
    return row;
  });

  done();
};

export default plugin;
```

- [ ] **Step 4: Run + commit**

Run: `pnpm --filter @novel/api test stories`
Expected: PASS.

```bash
git add apps/api/src/routes/stories.ts apps/api/test/stories.test.ts
git commit -m "api: validate POST /api/stories against catalog and persist storyOptions"
```

---

## Task 32: API `PATCH /api/stories/:id` with genre lock

**Files:**
- Modify: `apps/api/src/routes/stories.ts`
- Test: `apps/api/test/stories.test.ts` (extend)

- [ ] **Step 1: Failing tests**

Append to `apps/api/test/stories.test.ts` (use the shared `app`). Locking is simulated by going through the bible POST flow (which sets `genre_locked_at`) — same `NOVEL_FORCE_MOCK_LLM=1` env from Task 30 must be set at the top of the file.

```ts
import { eq } from 'drizzle-orm';
import { getDb } from '@novel/db';
import { stories } from '@novel/db/schema';

describe('PATCH /api/stories/:id', () => {
  async function createStoryHelper(payload: Record<string, unknown>): Promise<{ id: string }> {
    const res = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 't', premise: 'p'.repeat(25), ...payload },
    });
    return JSON.parse(res.body);
  }

  it('updates personality and storyOptions', async () => {
    const story = await createStoryHelper({ genre: 'do_thi' });
    const res = await app.inject({
      method: 'PATCH', url: `/api/stories/${story.id}`,
      payload: { mainCharacterPersonality: 'humorous_slick', storyOptions: { tone: 'humorous' } },
    });
    expect(res.statusCode).toBe(200);
    const refetched = await app.inject({ method: 'GET', url: `/api/stories/${story.id}` });
    expect(JSON.parse(refetched.body).mainCharacterPersonality).toBe('humorous_slick');
  });

  it('returns 409 when changing genre after bible is locked', async () => {
    const story = await createStoryHelper({ genre: 'tien_hiep' });
    await getDb().update(stories).set({ genreLockedAt: new Date() }).where(eq(stories.id, story.id));

    const res = await app.inject({
      method: 'PATCH', url: `/api/stories/${story.id}`,
      payload: { genre: 'do_thi' },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error).toBe('genre_locked');
  });

  it('allows genre change when not locked', async () => {
    const story = await createStoryHelper({ genre: 'tien_hiep' });
    const res = await app.inject({
      method: 'PATCH', url: `/api/stories/${story.id}`,
      payload: { genre: 'do_thi' },
    });
    expect(res.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @novel/api test stories -t PATCH`
Expected: FAIL.

- [ ] **Step 3: Implement (append to plugin in `stories.ts`)**

```ts
const PatchStorySchema = z.object({
  genre: GenreSlugSchema.optional(),
  mainCharacterPersonality: PersonalitySlugSchema.optional(),
  tone: z.string().nullish(),
  storyOptions: StoryOptionsSchema.partial().optional(),
}).refine(o => Object.keys(o).length > 0, { message: 'at least one field required' });

app.patch<{ Params: { id: string } }>('/api/stories/:id', async (req, reply) => {
  const db = getDb();
  const id = z.string().uuid().parse(req.params.id);

  let body: z.infer<typeof PatchStorySchema>;
  try {
    body = PatchStorySchema.parse(req.body);
  } catch (e) {
    return reply.status(400).send({ error: 'validation_failed', details: (e as Error).message });
  }

  const [story] = await db.select().from(stories).where(eq(stories.id, id));
  if (!story) return reply.status(404).send({ error: 'not_found' });

  if (body.genre && body.genre !== story.genre && story.genreLockedAt) {
    return reply.status(409).send({
      error: 'genre_locked',
      message: 'Genre đã được khoá vì bible đã sinh. Không thể đổi.',
    });
  }

  const storyPatch: Partial<typeof stories.$inferInsert> = { updatedAt: new Date() };
  if (body.genre !== undefined) storyPatch.genre = body.genre;
  if (body.mainCharacterPersonality !== undefined) storyPatch.mainCharacterPersonality = body.mainCharacterPersonality;
  if (body.tone !== undefined) storyPatch.tone = body.tone;

  if (Object.keys(storyPatch).length > 1) {
    await db.update(stories).set(storyPatch).where(eq(stories.id, id));
  }

  if (body.storyOptions) {
    const [existing] = await db.select().from(storySettings).where(eq(storySettings.storyId, id));
    const prev = (existing?.overrides as Record<string, unknown> | undefined) ?? {};
    const prevOpts = (prev.storyOptions as Record<string, unknown> | undefined) ?? {};
    const merged = { ...prevOpts, ...body.storyOptions };
    const next = { ...prev, storyOptions: merged };
    await db.insert(storySettings).values({ storyId: id, overrides: next, updatedAt: new Date() })
      .onConflictDoUpdate({ target: storySettings.storyId, set: { overrides: next, updatedAt: new Date() } });
  }

  return reply.send({ ok: true });
});
```

- [ ] **Step 4: Run + commit**

Run: `pnpm --filter @novel/api test stories -t PATCH`
Expected: PASS.

```bash
git add apps/api/src/routes/stories.ts apps/api/test/stories.test.ts
git commit -m "api: add PATCH /api/stories/:id with genre lock check"
```

---

## Task 33: UI — New Story form

**Files:**
- Modify: `apps/web/app/stories/new/page.tsx`

- [ ] **Step 1: Replace the page contents**

```tsx
// apps/web/app/stories/new/page.tsx
'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import {
  GENRES, PERSONALITIES,
  TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
  ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
  type GenreSlug, type PersonalitySlug, type StoryOptions,
} from '@novel/core';

const GENRE_DEFAULT_OPTIONS: Partial<Record<GenreSlug, Partial<StoryOptions>>> = {
  tien_hiep:   { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'realm',   worldEra: 'otherworld', pov: 'third_limited', protagonistMorality: 'pragmatic' },
  huyen_huyen: { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'realm',   worldEra: 'otherworld', pov: 'third_limited', protagonistMorality: 'pragmatic' },
  do_thi:      { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'skill',   worldEra: 'modern',     pov: 'third_limited', protagonistMorality: 'pragmatic' },
  di_nang:     { tone: 'serious',  pacing: 'fast',   powerSystemStyle: 'ability', worldEra: 'modern',     pov: 'third_limited', protagonistMorality: 'pragmatic' },
  cao_vo:      { tone: 'serious',  pacing: 'fast',   powerSystemStyle: 'martial', worldEra: 'otherworld', pov: 'third_limited', protagonistMorality: 'righteous' },
  vo_thuat:    { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'martial', worldEra: 'ancient',    pov: 'third_limited', protagonistMorality: 'righteous' },
  khoa_huyen:  { tone: 'serious',  pacing: 'medium', powerSystemStyle: 'tech',    worldEra: 'future',     pov: 'third_limited', protagonistMorality: 'pragmatic' },
};

export default function NewStoryPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [premise, setPremise] = useState('');
  const [genre, setGenre] = useState<GenreSlug>('tien_hiep');
  const [personality, setPersonality] = useState<PersonalitySlug>('tram_on');
  const [target, setTarget] = useState(1000);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [opts, setOpts] = useState<StoryOptions>(GENRE_DEFAULT_OPTIONS.tien_hiep ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGenre = useMemo(() => GENRES.find(g => g.slug === genre)!, [genre]);
  const selectedPersonality = useMemo(() => PERSONALITIES.find(p => p.slug === personality)!, [personality]);

  function onChangeGenre(slug: GenreSlug) {
    setGenre(slug);
    const defaults = GENRE_DEFAULT_OPTIONS[slug] ?? {};
    setOpts(prev => ({ ...defaults, ...prev }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: string }>('/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          title, premise,
          genre, mainCharacterPersonality: personality,
          storyOptions: opts,
          targetChapterCount: target,
        }),
      });
      router.push(`/stories/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="studio-page">
      <header className="studio-header">
        <div>
          <p className="studio-kicker">New manuscript</p>
          <h1>New Story</h1>
          <p className="studio-subtitle">Start with the creative brief that will guide the bible, planning, and chapter pipeline.</p>
        </div>
      </header>
      <form onSubmit={submit} className="studio-panel form-grid">
        <div className="field-group">
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required />
        </div>

        <div className="field-group">
          <label>Premise (≥ 20 chars)</label>
          <textarea value={premise} onChange={e => setPremise(e.target.value)} rows={6} required minLength={20} />
        </div>

        <div className="field-group">
          <label>Genre</label>
          <select value={genre} onChange={e => onChangeGenre(e.target.value as GenreSlug)}>
            {GENRES.map(g => (
              <option key={g.slug} value={g.slug}>{g.viLabel}</option>
            ))}
          </select>
          <small>Quyết định phong cách thế giới, hệ thống sức mạnh, trope và tone tổng thể.</small>
          <small style={{ opacity: 0.7 }}>{selectedGenre.viDescription}</small>
        </div>

        <div className="field-group">
          <label>Main Character Personality</label>
          <select value={personality} onChange={e => setPersonality(e.target.value as PersonalitySlug)}>
            {PERSONALITIES.map(p => (
              <option key={p.slug} value={p.slug}>{p.viLabel}</option>
            ))}
          </select>
          <small>Ảnh hưởng đến cách nhân vật chính suy nghĩ, đối thoại và ra quyết định.</small>
          <small style={{ opacity: 0.7 }}>{selectedPersonality.viDescription}</small>
        </div>

        <div className="field-group">
          <button type="button" onClick={() => setShowAdvanced(s => !s)} style={{ background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
            {showAdvanced ? '▼' : '▶'} Tuỳ chọn nâng cao
          </button>
          {showAdvanced && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
              <SelectField label="Tone" list={TONES} value={opts.tone} onChange={v => setOpts({ ...opts, tone: v as StoryOptions['tone'] })} />
              <SelectField label="Pacing" list={PACINGS} value={opts.pacing} onChange={v => setOpts({ ...opts, pacing: v as StoryOptions['pacing'] })} />
              <SelectField label="Main Conflict Type" list={MAIN_CONFLICT_TYPES} value={opts.mainConflictType} onChange={v => setOpts({ ...opts, mainConflictType: v as StoryOptions['mainConflictType'] })} />
              <SelectField label="Power System Style" list={POWER_SYSTEM_STYLES} value={opts.powerSystemStyle} onChange={v => setOpts({ ...opts, powerSystemStyle: v as StoryOptions['powerSystemStyle'] })} />
              <SelectField label="World Era" list={WORLD_ERAS} value={opts.worldEra} onChange={v => setOpts({ ...opts, worldEra: v as StoryOptions['worldEra'] })} />
              <SelectField label="Romance Level" list={ROMANCE_LEVELS} value={opts.romanceLevel} onChange={v => setOpts({ ...opts, romanceLevel: v as StoryOptions['romanceLevel'] })} />
              <SelectField label="Comedy Level" list={COMEDY_LEVELS} value={opts.comedyLevel} onChange={v => setOpts({ ...opts, comedyLevel: v as StoryOptions['comedyLevel'] })} />
              <SelectField label="Dark Level" list={DARK_LEVELS} value={opts.darkLevel} onChange={v => setOpts({ ...opts, darkLevel: v as StoryOptions['darkLevel'] })} />
              <SelectField label="POV" list={POVS} value={opts.pov} onChange={v => setOpts({ ...opts, pov: v as StoryOptions['pov'] })} />
              <SelectField label="Protagonist Morality" list={MORALITIES} value={opts.protagonistMorality} onChange={v => setOpts({ ...opts, protagonistMorality: v as StoryOptions['protagonistMorality'] })} />
            </div>
          )}
        </div>

        <div className="field-group">
          <label>Target chapter count</label>
          <input type="number" min={1} value={target} onChange={e => setTarget(Number(e.target.value))} />
        </div>

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

        <div className="button-row">
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Story'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SelectField({ label, list, value, onChange }: {
  label: string;
  list: readonly { slug: string; viLabel: string }[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div>
      <label>{label}</label>
      <select value={value ?? ''} onChange={e => onChange(e.target.value || undefined)}>
        <option value="">(không chỉ định)</option>
        {list.map(opt => (
          <option key={opt.slug} value={opt.slug}>{opt.viLabel}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke (open page in dev)**

Run: `pnpm --filter @novel/web dev` then visit `http://localhost:3000/stories/new`. Verify dropdowns render, advanced section toggles, submit succeeds with a fake premise.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/stories/new/page.tsx
git commit -m "web: rewrite New Story form with genre/personality + 10 advanced dropdowns"
```

---

## Task 34: UI — Story Settings page (genre/personality/options editor)

**Files:**
- Modify: `apps/web/app/stories/[id]/settings/page.tsx`

- [ ] **Step 1: Read the existing file** (to preserve any existing settings sections)

Run: read `apps/web/app/stories/[id]/settings/page.tsx`. Identify existing sections.

- [ ] **Step 2: Add a Genre/Personality/Story Options editor section**

Append a new section component above existing settings sections:

```tsx
// inside apps/web/app/stories/[id]/settings/page.tsx

import {
  GENRES, PERSONALITIES,
  TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
  ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
  type GenreSlug, type PersonalitySlug, type StoryOptions,
} from '@novel/core';

function GenrePersonalityEditor({
  story, settings, onSaved,
}: {
  story: { id: string; genre: string; mainCharacterPersonality: string; genreLockedAt: string | null };
  settings: { overrides: { storyOptions?: StoryOptions } };
  onSaved: () => void;
}) {
  const [genre, setGenre] = useState<GenreSlug>(story.genre as GenreSlug);
  const [personality, setPersonality] = useState<PersonalitySlug>(story.mainCharacterPersonality as PersonalitySlug);
  const [opts, setOpts] = useState<StoryOptions>(settings.overrides.storyOptions ?? {});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const genreLocked = story.genreLockedAt != null;

  async function save() {
    setSaving(true); setError(null);
    try {
      await apiFetch(`/api/stories/${story.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(genreLocked ? {} : { genre }),
          mainCharacterPersonality: personality,
          storyOptions: opts,
        }),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="studio-panel">
      <h2>Genre & Personality</h2>
      {genreLocked && (
        <div style={{ background: '#fff3cd', padding: 8, borderRadius: 4, marginBottom: 12 }}>
          Genre đã khoá vì bible đã sinh. Personality và Story Options vẫn có thể đổi nhưng chỉ ảnh hưởng đến chương sinh sau.
        </div>
      )}

      <div className="field-group">
        <label>Genre</label>
        <select value={genre} onChange={e => setGenre(e.target.value as GenreSlug)} disabled={genreLocked}>
          {GENRES.map(g => <option key={g.slug} value={g.slug}>{g.viLabel}</option>)}
        </select>
      </div>

      <div className="field-group">
        <label>Personality</label>
        <select value={personality} onChange={e => setPersonality(e.target.value as PersonalitySlug)}>
          {PERSONALITIES.map(p => <option key={p.slug} value={p.slug}>{p.viLabel}</option>)}
        </select>
      </div>

      <details>
        <summary>Tuỳ chọn nâng cao</summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
          <SelectField label="Tone" list={TONES} value={opts.tone} onChange={v => setOpts({ ...opts, tone: v as StoryOptions['tone'] })} />
          <SelectField label="Pacing" list={PACINGS} value={opts.pacing} onChange={v => setOpts({ ...opts, pacing: v as StoryOptions['pacing'] })} />
          <SelectField label="Main Conflict Type" list={MAIN_CONFLICT_TYPES} value={opts.mainConflictType} onChange={v => setOpts({ ...opts, mainConflictType: v as StoryOptions['mainConflictType'] })} />
          <SelectField label="Power System Style" list={POWER_SYSTEM_STYLES} value={opts.powerSystemStyle} onChange={v => setOpts({ ...opts, powerSystemStyle: v as StoryOptions['powerSystemStyle'] })} />
          <SelectField label="World Era" list={WORLD_ERAS} value={opts.worldEra} onChange={v => setOpts({ ...opts, worldEra: v as StoryOptions['worldEra'] })} />
          <SelectField label="Romance Level" list={ROMANCE_LEVELS} value={opts.romanceLevel} onChange={v => setOpts({ ...opts, romanceLevel: v as StoryOptions['romanceLevel'] })} />
          <SelectField label="Comedy Level" list={COMEDY_LEVELS} value={opts.comedyLevel} onChange={v => setOpts({ ...opts, comedyLevel: v as StoryOptions['comedyLevel'] })} />
          <SelectField label="Dark Level" list={DARK_LEVELS} value={opts.darkLevel} onChange={v => setOpts({ ...opts, darkLevel: v as StoryOptions['darkLevel'] })} />
          <SelectField label="POV" list={POVS} value={opts.pov} onChange={v => setOpts({ ...opts, pov: v as StoryOptions['pov'] })} />
          <SelectField label="Protagonist Morality" list={MORALITIES} value={opts.protagonistMorality} onChange={v => setOpts({ ...opts, protagonistMorality: v as StoryOptions['protagonistMorality'] })} />
        </div>
      </details>

      {error && <p className="error">{error}</p>}
      <div className="button-row">
        <button className="primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </section>
  );
}

function SelectField({ label, list, value, onChange }: {
  label: string;
  list: readonly { slug: string; viLabel: string }[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div>
      <label>{label}</label>
      <select value={value ?? ''} onChange={e => onChange(e.target.value || undefined)}>
        <option value="">(không chỉ định)</option>
        {list.map(opt => <option key={opt.slug} value={opt.slug}>{opt.viLabel}</option>)}
      </select>
    </div>
  );
}
```

Wire `<GenrePersonalityEditor>` into the existing settings page render, passing the loaded `story` and `settings`. Trigger a refetch when `onSaved` is called.

- [ ] **Step 3: Manual smoke**

Visit `/stories/<id>/settings`. Verify the editor shows; edit personality, save, refresh — change persists.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/stories/[id]/settings/page.tsx
git commit -m "web: add genre/personality/storyOptions editor to Settings page"
```

---

## Task 35: UI — Bible edit form conditional fields

**Files:**
- Modify: `apps/web/app/stories/[id]/bible/edit-form.tsx`

- [ ] **Step 1: Add `power_system` + `power_system_kind` editors and gate cultivation fields**

In `apps/web/app/stories/[id]/bible/edit-form.tsx` add fields:

```tsx
// Add at top of the form component:
const POWER_KINDS = [
  'cultivation','martial','ability','tech','urban',
  'historical','horror','mystery','system','reincarnation','mixed','none',
] as const;

// Add to form state:
const [powerSystem, setPowerSystem] = useState(initial.powerSystem ?? '');
const [powerSystemKind, setPowerSystemKind] = useState<typeof POWER_KINDS[number]>(
  (initial.powerSystemKind as typeof POWER_KINDS[number]) ?? 'cultivation'
);

// Add to form JSX (before cultivation_system):
<div className="field-group">
  <label>Power System Kind</label>
  <select value={powerSystemKind} onChange={e => setPowerSystemKind(e.target.value as any)}>
    {POWER_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
  </select>
</div>

<div className="field-group">
  <label>Power System</label>
  <textarea value={powerSystem} onChange={e => setPowerSystem(e.target.value)} rows={6} />
</div>

{/* Then gate the existing cultivation_system + bloodline_system fields: */}
{powerSystemKind === 'cultivation' && (
  <>
    <div className="field-group">
      <label>Cultivation System (chỉ family=cultivation)</label>
      <textarea value={cultivationSystem} onChange={e => setCultivationSystem(e.target.value)} rows={6} />
    </div>
    <div className="field-group">
      <label>Bloodline System (tuỳ chọn)</label>
      <textarea value={bloodlineSystem} onChange={e => setBloodlineSystem(e.target.value)} rows={6} />
    </div>
  </>
)}
```

Update the PUT payload to include `powerSystem` and `powerSystemKind`. Update the API PUT schema in `apps/api/src/routes/bible.ts`:

```ts
const UpdateBibleSchema = z.object({
  worldRules: z.string().min(50).optional(),
  powerSystem: z.string().min(50).optional(),
  powerSystemKind: z.enum(['cultivation','martial','ability','tech','urban','historical','horror','mystery','system','reincarnation','mixed','none']).optional(),
  cultivationSystem: z.string().min(50).optional().nullable(),
  bloodlineSystem: z.string().min(50).optional().nullable(),
  styleGuide: z.string().min(50).optional(),
  forbiddenRules: z.string().min(20).optional(),
  endingDirection: z.string().min(20).optional(),
  compactSummary: z.string().min(50).max(2000).optional(),
  styleFewShots: z.array(z.object({ excerpt: z.string(), sourceChapter: z.number().optional() })).optional(),
});
```

And in the PUT handler include `powerSystem`/`powerSystemKind`/`cultivationSystem`/`bloodlineSystem` in the new bible row insert.

- [ ] **Step 2: Manual smoke**

Edit a bible: switch power_system_kind from cultivation to ability — cultivation/bloodline fields hide. Save, refresh — values persisted.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/stories/[id]/bible/edit-form.tsx apps/api/src/routes/bible.ts
git commit -m "web: gate cultivation/bloodline editors by power_system_kind in Bible UI"
```

---

## Task 36: Manual smoke test (after PR 5 merged)

This is a checklist task — no code, but a hard gate before declaring complete. Manual verification.

- [ ] **Step 1: Start the stack**

Run:
```bash
docker compose -f docker-compose.dev.yml up -d
pnpm --filter @novel/db migrate
pnpm --filter @novel/api dev &
pnpm --filter @novel/worker dev &
pnpm --filter @novel/web dev &
```

- [ ] **Step 2: Genre=do_thi smoke**

Open `/stories/new`. Pick `Đô thị`, `Gian xảo, thực dụng`, premise: "Một CEO trẻ phát hiện bí mật về cha mình đã chết". Submit.

Generate bible. Open Bible page. Verify:
- `power_system_kind` is `'urban'` or `'none'`.
- `cultivation_system` and `bloodline_system` are NULL/empty.
- Bible content does NOT mention tu tiên / cảnh giới / tông môn / pháp bảo.

Generate chapter 1. Verify:
- No `realm_jump` validator fires (check `validations` table).
- Content tone matches urban: dialogue tự nhiên, có công ty, không có pháp bảo.

- [ ] **Step 3: Genre=cao_vo smoke**

Same flow with `Cao võ` + `Bá đạo, quyết đoán`. Verify bible has hệ thống cấp chiến lực, no phi thăng tiên giới.

- [ ] **Step 4: Genre=di_nang smoke**

Same flow with `Dị năng` + `Hài hước, lươn lẹo`. Verify ability + comedy tone.

- [ ] **Step 5: Backward compat smoke**

Pick an existing pre-migration story (genre was `xianxia_fantasy`, now backfilled to `tien_hiep`). Generate next chapter. Verify still works as expected (cultivation flow).

- [ ] **Step 6: Genre lock smoke**

Pick a story with bible already generated. Go to settings. Try to change genre — dropdown should be disabled with banner explaining lock. Personality dropdown should be enabled.

- [ ] **Step 7: Sign-off**

Document results in PR description (screenshots optional). Only proceed to PR 6 if all 6 smoke checks pass.

---

# PR 6 — Cleanup (delete v1 prompts)

## Task 37: Delete v1 prompts and verify no hard-coded references

**Files:**
- Delete: `packages/ai/src/prompts/bible-generator.v1.ts`
- Delete: `packages/ai/src/prompts/saga-planner.v1.ts`
- Delete: `packages/ai/src/prompts/arc-planner.v1.ts`
- Delete: `packages/ai/src/prompts/packet-generator.v1.ts`
- Delete: `packages/ai/src/prompts/writer.v1.ts`
- Delete: `packages/ai/src/prompts/llm-validator.v1.ts`
- Delete: `packages/ai/src/prompts/auto-fixer.v1.ts`
- Delete: `packages/ai/src/prompts/canon-extractor.v1.ts`
- Delete: `packages/ai/src/prompts/summary-compactor.v1.ts`
- Delete: `packages/ai/src/prompts/arc-summary-compactor.v1.ts`
- Delete: `packages/ai/src/prompts/high-stakes-reviewer.v1.ts`

- [ ] **Step 1: Verify no live code imports v1**

Run:
```bash
rg -n "\.v1'" packages/ai/src apps/worker/src apps/api/src
```

Expected: NO matches. If any remain, switch them to `.v2` first before continuing.

- [ ] **Step 2: Delete the 11 v1 files**

Run:
```bash
rm packages/ai/src/prompts/bible-generator.v1.ts \
   packages/ai/src/prompts/saga-planner.v1.ts \
   packages/ai/src/prompts/arc-planner.v1.ts \
   packages/ai/src/prompts/packet-generator.v1.ts \
   packages/ai/src/prompts/writer.v1.ts \
   packages/ai/src/prompts/llm-validator.v1.ts \
   packages/ai/src/prompts/auto-fixer.v1.ts \
   packages/ai/src/prompts/canon-extractor.v1.ts \
   packages/ai/src/prompts/summary-compactor.v1.ts \
   packages/ai/src/prompts/arc-summary-compactor.v1.ts \
   packages/ai/src/prompts/high-stakes-reviewer.v1.ts
```

- [ ] **Step 3: Verify no hard-coded "tiên hiệp/huyền huyễn" leak in non-catalog files**

Run:
```bash
rg -n "tiên hiệp|huyền huyễn" packages/ai/src apps/worker/src apps/api/src apps/web/app
```

Expected: NO matches outside test snapshot fixtures. (Catalog file is in `packages/core/src/catalog/genres.ts` so won't appear.)

- [ ] **Step 4: Run all tests**

Run:
```bash
pnpm -r test
```

Expected: ALL PASS.

- [ ] **Step 5: Build all**

Run: `pnpm -r build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "ai/prompts: delete v1 prompts; pipeline now fully v2 + genre-aware"
```

---

# Self-Review Checklist

After implementing all 37 tasks, run this checklist:

**1. Spec coverage:**
- [ ] §5 (Data model) — Tasks 7, 8, 9 cover migrations and drizzle schema.
- [ ] §6 (Catalog) — Tasks 1-6 cover GENRES, PERSONALITIES, options, schemas, exports.
- [ ] §7 (Prompt v2 family) — Tasks 10-22 cover contracts + 11 v2 prompts + Bible v2 schema.
- [ ] §8 (Pipeline wiring) — Tasks 23-26, 29 cover loadStoryDomainContext + builder + agents.
- [ ] §9 (Validators gating) — Task 27 covers runner + auditor.
- [ ] §10 (API) — Tasks 31-32 cover POST + PATCH.
- [ ] §11 (UI) — Tasks 33-35 cover New, Settings, Bible edit.
- [ ] §12 (Tests) — embedded in each task's TDD step.
- [ ] §13 (Manual smoke) — Task 36.
- [ ] §14 (Rollout) — 6 PR boundaries align with task groups.
- [ ] §15 (Risks) — covered by Zod refinement (Task 11), backfill (Tasks 7-8), default values (Task 31).
- [ ] §16 (Acceptance criteria) — Task 36 manual + 37 cleanup verify.

**2. Placeholder scan:**
- [ ] No "TBD", "TODO", "implement later" in any task.
- [ ] No "Similar to Task N" — every code block is repeated where needed.
- [ ] No "Add appropriate error handling" — error handling is explicit (e.g., 400/409/404 returns).

**3. Type consistency:**
- [ ] `GenreDef`, `PersonalityDef`, `StoryOptions`, `GenreFamily`, `BibleV2` types defined in earlier tasks are used consistently in later tasks.
- [ ] `loadStoryDomainContext` returns `StoryDomainContext` with shape matching what agents expect.
- [ ] `buildChecks(text, family)` signature consistent in Task 27 and Task 29 callsite.
- [ ] `auditPacket(input, ctx)` signature consistent in Task 27 and Task 29 callsite.

If any item fails, return to the relevant task and fix inline.

---

# Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-01-genre-personality-story-options-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best when many tasks are independent and you want parallel review.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

Which approach?
