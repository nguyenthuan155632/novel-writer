/**
 * Centralized semantic guidance for Story Options.
 *
 * Each option maps its possible values to concrete behavioral rules
 * that vary by prompt target (bible, saga, arc, packet, writer, validator).
 *
 * Design principles:
 * - Vietnamese language for consistency with all prompts
 * - Directive, not decorative — each line is a constraint the LLM must follow
 * - Concise — avoid bloating the context window
 * - Target-specific — only include rules relevant to the current LLM call
 */

export type PromptTarget =
  | "bible"
  | "saga"
  | "arc"
  | "packet"
  | "writer"
  | "validator";

export interface OptionGuidance {
  label: string;
  semanticIntent: string;
  rules: string[];
  mustInclude?: string[];
  avoid?: string[];
}

type TargetGuidanceMap = Partial<Record<PromptTarget, OptionGuidance>>;
type ValueGuidanceMap = Record<string, TargetGuidanceMap>;

// ─── TONE ────────────────────────────────────────────────────────────────────

const TONE_GUIDANCE: ValueGuidanceMap = {
  serious: {
    bible: {
      label: "Nghiêm túc",
      semanticIntent:
        "Thế giới và cốt truyện được xây dựng với trọng lượng cảm xúc thật.",
      rules: [
        "Conflict phải có hậu quả thật, không được giải quyết bằng deus-ex-machina nhẹ nhàng.",
        "Worldbuilding nên phản ánh quy luật nghiêm ngặt — luật thế giới có cost.",
      ],
      avoid: ["Tone parody", "slapstick humor trong setting chính"],
    },
    writer: {
      label: "Nghiêm túc",
      semanticIntent:
        "Văn phong chỉn chu, cảm xúc có chiều sâu, dialogue tự nhiên nhưng có trọng lượng.",
      rules: [
        "Prose: câu văn có nhịp, tránh bông đùa không phù hợp ngữ cảnh.",
        "Dialogue: nhân vật nói như người thật trong tình huống nghiêm trọng — không quá dramatic/theatrical.",
        "Emotional framing: cho phép khoảng lặng, nội tâm sâu, phản ánh hậu quả.",
        "Scene framing: mở cảnh bằng atmosphere hoặc tension, không bằng gag.",
      ],
      avoid: [
        "Comic relief không đúng chỗ",
        "nhân vật phá bỏ tension bằng joke khi stakes cao",
      ],
    },
    validator: {
      label: "Nghiêm túc",
      semanticIntent:
        "Kiểm tra tone nhất quán — không drift sang hài/nhẹ nhàng.",
      rules: [
        "Flag nếu nhân vật bỗng dùng giọng hài hước khi scene đang tense.",
        "Flag nếu conflict được giải quyết quá dễ dàng, phá vỡ trọng lượng dramatic.",
      ],
      avoid: [],
    },
  },
  humorous: {
    bible: {
      label: "Hài hước",
      semanticIntent:
        "Thế giới có yếu tố hài — absurdity, irony, hoặc tình huống ngớ ngẩn là hợp lệ.",
      rules: [
        "Worldbuilding có thể chứa quy luật vui — nhưng vẫn phải internally consistent.",
        "Cho phép nhân vật phụ hoặc hệ thống có quirks hài hước.",
      ],
      avoid: ["Làm tất cả trở thành parody — vẫn cần có stakes thật"],
    },
    writer: {
      label: "Hài hước",
      semanticIntent:
        "Prose có wit, timing tốt; dialogue dí dỏm; scene cho phép situational humor.",
      rules: [
        "Prose: câu văn nhẹ nhàng, cho phép aside hài, metaphor vui.",
        "Dialogue: banter tự nhiên, nhân vật có thể châm biếm nhẹ.",
        "Scene framing: có thể mở bằng tình huống absurd rồi transition sang plot.",
        "QUAN TRỌNG: Hài hước ≠ parody. Vẫn giữ logic cốt truyện và stakes. Chỉ texture và interaction mang tính hài, không phải toàn bộ narrative.",
      ],
      mustInclude: [
        "Ít nhất 1-2 moment witty/dí dỏm mỗi chương qua dialogue hoặc tình huống",
      ],
      avoid: [
        "Phá vỡ stakes hoàn toàn bằng joke",
        "biến mọi xung đột thành punch line",
      ],
    },
    validator: {
      label: "Hài hước",
      semanticIntent:
        "Kiểm tra rằng tone hài được duy trì nhưng không phá stakes.",
      rules: [
        "Flag nếu chapter quá nghiêm túc liên tục mà không có moment witty nào.",
        "Flag nếu humor phá vỡ suspension of disbelief hoặc biến villain thành buffoon khi không phải ý đồ.",
      ],
      avoid: [],
    },
  },
  dark: {
    bible: {
      label: "U tối",
      semanticIntent:
        "Thế giới khắc nghiệt, quy luật tàn nhẫn, hệ quả nặng nề.",
      rules: [
        "World rules: tài nguyên khan hiếm, quyền lực có giá đắt, kẻ yếu bị đào thải.",
        'Cho phép morally grey factions — không có phe "hoàn toàn tốt".',
      ],
      avoid: [
        "Bright optimistic worldbuilding",
        "mọi xung đột đều có happy ending mặc định",
      ],
    },
    writer: {
      label: "U tối",
      semanticIntent:
        "Atmosphere nặng, prose gợi cảm giác oppressive, dialogue sắc lạnh.",
      rules: [
        "Prose: dùng imagery tối — bóng, máu, im lặng, sự mục nát. Không cần graphic violence, nhưng weight phải có.",
        "Dialogue: nhân vật nói ít, ý nặng. Cho phép cynicism và cold pragmatism.",
        'Scene framing: tension luôn hiện diện ngầm, even in "calm" scenes.',
        "Cho phép loss, betrayal, moral failure — nhưng phải có logic nhân vật.",
      ],
      avoid: [
        "Sudden mood whiplash sang cheerful không lý do",
        "grimdark vô nghĩa không phục vụ plot",
      ],
    },
    validator: {
      label: "U tối",
      semanticIntent: "Kiểm tra tone dark được duy trì.",
      rules: [
        "Flag nếu tone suddenly becomes bright/cheerful không có arc justification.",
        "Flag nếu violence/darkness chỉ là shock value mà không serve narrative.",
      ],
      avoid: [],
    },
  },
  tragic: {
    bible: {
      label: "Bi tráng",
      semanticIntent:
        "Câu chuyện hướng tới mất mát lớn, hy sinh, và emotional catharsis.",
      rules: [
        "Xây dựng nhân vật/mối quan hệ mà reader gắn bó — để mất mát có trọng lượng.",
        "Worldbuilding: cho phép fate/destiny/curse như mechanic — bi kịch cần cảm giác unavoidable.",
      ],
      avoid: [
        "Deus ex machina cứu tất cả",
        "undermining tragic setup bằng comic relief",
      ],
    },
    writer: {
      label: "Bi tráng",
      semanticIntent:
        "Prose mang tính elegy — đẹp trong nỗi buồn. Dialogue có chiều sâu cảm xúc.",
      rules: [
        "Prose: cho phép lyrical quality, imagery thiên nhiên phản ánh tâm trạng, nhịp chậm ở emotional beats.",
        "Dialogue: nhân vật bộc lộ qua điều không nói, qua hành động nhỏ. Restraint > melodrama.",
        "Cho phép reader anticipate loss — foreshadowing tinh tế.",
        "Mỗi chapter nên có ít nhất 1 moment gợi cảm xúc (không nhất thiết buồn — có thể là beauty bittersweet).",
      ],
      avoid: [
        "Melodrama quá tay",
        "nhân vật khóc lóc mỗi scene",
        "nihilism vô nghĩa",
      ],
    },
    validator: {
      label: "Bi tráng",
      semanticIntent: "Kiểm tra emotional weight.",
      rules: [
        "Flag nếu tragic tone bị undercut bởi easy solution.",
        "Flag nếu chapter chỉ có action mà không có emotional resonance.",
      ],
      avoid: [],
    },
  },
  soft: {
    bible: {
      label: "Nhẹ nhàng",
      semanticIntent:
        "Thế giới ấm áp, conflict có nhưng không brutal, focus vào growth và connection.",
      rules: [
        "World rules: cho phép kindness có reward, community matters.",
        "Conflict tồn tại nhưng không cần violence làm giải pháp chính.",
      ],
      avoid: ["Grimdark elements", "torture/gore", "overwhelming despair"],
    },
    writer: {
      label: "Nhẹ nhàng",
      semanticIntent:
        "Prose ấm, gentle pacing, focus vào relationships và small moments.",
      rules: [
        "Prose: descriptive, sensory, tập trung vào chi tiết nhỏ đẹp. Nhịp thong thả.",
        "Dialogue: ấm áp, tự nhiên, cho phép teasing nhẹ nhàng giữa nhân vật.",
        "Scene framing: slice-of-life moments hợp lệ, không cần action mỗi scene.",
        "Conflict: vẫn tồn tại nhưng approach qua communication, growth, understanding.",
      ],
      mustInclude: ["Ít nhất 1 warm character moment mỗi chương"],
      avoid: ["Graphic violence", "cold cruelty", "nihilistic dialogue"],
    },
    validator: {
      label: "Nhẹ nhàng",
      semanticIntent: "Kiểm tra tone soft.",
      rules: [
        "Flag nếu violence/cruelty xuất hiện đột ngột không có narrative justification.",
        "Flag nếu tone trở nên harsh/cynical liên tục.",
      ],
      avoid: [],
    },
  },
};

// ─── PACING ──────────────────────────────────────────────────────────────────

const PACING_GUIDANCE: ValueGuidanceMap = {
  slow: {
    saga: {
      label: "Chậm chắc",
      semanticIntent:
        "Saga cho phép exploration dài, character development sâu, worldbuilding chi tiết.",
      rules: [
        "Mỗi saga nên có giai đoạn setup dài hơn — 30-40% chapters cho worldbuilding và character establishment.",
        "Turning points có thể dãn cách nhau xa hơn.",
      ],
      avoid: ["Nhồi nhét quá nhiều events trong ít chương"],
    },
    arc: {
      label: "Chậm chắc",
      semanticIntent:
        "Arc cho phép breathing room — không mỗi chapter đều push plot.",
      rules: [
        "Cho phép 2-3 chapters liên tiếp focused vào character interaction, training, hoặc worldbuilding.",
        "Climax build-up cần ít nhất 3-4 chapters chuẩn bị.",
      ],
      avoid: ["Mỗi chapter đều có combat/crisis"],
    },
    packet: {
      label: "Chậm chắc",
      semanticIntent:
        "Chapter plan cho phép exploration, internal thought, dialogue scenes.",
      rules: [
        "Goal có thể focused vào character development hoặc world exploration, không bắt buộc mỗi chương phải advance main plot.",
        "Cho phép scenes thuần dialogue hoặc thuần observation.",
        "Cliffhanger có thể là emotional hook hoặc question, không nhất thiết action.",
      ],
      avoid: ["Rush qua events", "nhồi 3-4 plot developments vào 1 chương"],
    },
    writer: {
      label: "Chậm chắc",
      semanticIntent:
        "Prose được phép thong thả, chi tiết, đào sâu atmosphere và nội tâm.",
      rules: [
        "Cho phép passages mô tả dài (cảnh vật, cảm xúc, suy tư nội tâm).",
        "Transition giữa scenes có thể smooth và gradual, không cần hard cuts.",
        "Dialogue scenes có thể dài, cho phép subtext và development.",
        "Mỗi chapter: OK nếu chỉ advance 1 plot point nhỏ, miễn có depth.",
      ],
      mustInclude: [
        "Ít nhất 1 đoạn nội tâm hoặc atmosphere mô tả > 100 từ mỗi chương",
      ],
      avoid: ["Nhảy cắt liên tục giữa scenes", "rush qua moment quan trọng"],
    },
    validator: {
      label: "Chậm chắc",
      semanticIntent:
        "Pacing chậm là CHÍNH XÁC — không flag chỉ vì chương ít plot movement.",
      rules: [
        "KHÔNG flag chapter vì thiếu action nếu chapter có character development hoặc worldbuilding.",
        "Flag nếu chương chỉ có filler không phục vụ gì (lặp thông tin cũ, không insight mới).",
      ],
      avoid: ['Flag slow-burn chapters là "filler"'],
    },
  },
  medium: {
    saga: {
      label: "Vừa phải",
      semanticIntent: "Saga cân bằng giữa development và payoff.",
      rules: ["Xen kẽ giai đoạn buildup với turning points — rhythm tự nhiên."],
      avoid: [],
    },
    arc: {
      label: "Vừa phải",
      semanticIntent: "Arc xen kẽ chapters action với chapters development.",
      rules: [
        "Mỗi 2-3 chapters phải có ít nhất 1 meaningful development (plot hoặc character).",
        "Không quá 3 chapters liên tiếp chỉ có setup mà không có payoff nhỏ.",
      ],
      avoid: [],
    },
    packet: {
      label: "Vừa phải",
      semanticIntent:
        "Mỗi chapter cần balance giữa action/development/breathing room.",
      rules: [
        "Goal: phải advance ít nhất 1 thread (plot, character, or worldbuilding).",
        "Cho phép mix: 1 scene action + 1 scene dialogue + 1 scene reflection.",
      ],
      avoid: [
        "Chương toàn action không breathing",
        "chương toàn reflection không movement",
      ],
    },
    writer: {
      label: "Vừa phải",
      semanticIntent:
        "Prose cân bằng — không quá rushed cũng không quá languid.",
      rules: [
        "Xen kẽ: scene nhanh (action/dialogue snappy) với scene chậm (reflection/description).",
        "Transition: có thể dùng scene break hoặc time skip khi phù hợp.",
        "Mỗi chapter: ít nhất 1 beat thay đổi nhịp (nhanh→chậm hoặc ngược lại).",
      ],
      avoid: ["Monotone pacing throughout — phải có rhythm"],
    },
    validator: {
      label: "Vừa phải",
      semanticIntent: "Kiểm tra rhythm.",
      rules: [
        "Flag nếu 3+ chapters liên tiếp cùng 1 pace mà không có variation.",
        "Flag nếu chapter không advance bất kỳ thread nào.",
      ],
      avoid: [],
    },
  },
  fast: {
    saga: {
      label: "Nhanh",
      semanticIntent:
        "Saga dense with events — ít downtime, high plot density.",
      rules: [
        "Turning points dày đặc — mỗi 5-10 chương có development quan trọng.",
        "Giảm setup time, nhanh vào conflict.",
      ],
      avoid: ["Kéo dài worldbuilding exposition nhiều chương liên tiếp"],
    },
    arc: {
      label: "Nhanh",
      semanticIntent: "Arc compact — mỗi chapter phải push story forward.",
      rules: [
        "Mỗi chapter PHẢI có ít nhất 1 clear plot advancement.",
        'Không có "pure setup" chapters — even setup phải contain micro-conflict.',
        "Climax arrives sooner — 60% mark thay vì 75%.",
      ],
      avoid: [
        "Chapters thuần worldbuilding không có tension",
        "quá nhiều internal monologue",
      ],
    },
    packet: {
      label: "Nhanh",
      semanticIntent:
        "Chapter plan phải có clear movement — entry state ≠ exit state.",
      rules: [
        'Goal phải cụ thể và measurable — "something happens" is not enough.',
        "RequiredEvents: tối thiểu 2 events có impact.",
        "Cliffhanger: phải tạo urgency, không chỉ question.",
      ],
      mustInclude: ["1 action/decision beat + 1 consequence reveal mỗi chương"],
      avoid: [
        "Chapters chỉ có reflection",
        "chapters chỉ travel without incident",
      ],
    },
    writer: {
      label: "Nhanh",
      semanticIntent: "Prose tight, scene transitions snappy, dialogue punchy.",
      rules: [
        "Prose: câu ngắn-vừa chiếm đa số. Mô tả minimal — chỉ sensory details phục vụ action/emotion.",
        "Dialogue: quick exchanges, không lengthy speeches trừ khi reveal quan trọng.",
        "Scene transitions: hard cut hoặc 1 câu bridge. Không lingering.",
        "Mỗi chapter: ít nhất 2 scenes với distinct movement. Entry state ≠ exit state.",
        "Chapter hook: sentence đầu phải tạo tension hoặc curiosity ngay.",
      ],
      avoid: [
        "Đoạn mô tả > 150 từ liên tục",
        "dialogue exchanges > 10 dòng thuần chit-chat",
        "chapter kết thúc bằng nhân vật đi ngủ",
      ],
    },
    validator: {
      label: "Nhanh",
      semanticIntent: "Kiểm tra plot density.",
      rules: [
        "Flag nếu chapter không có clear plot advancement (nhân vật/situation phải thay đổi).",
        "Flag nếu > 30% chapter là description/exposition mà không serve immediate conflict.",
      ],
      avoid: ['Flag action scenes là "rushed" — fast pacing is intended'],
    },
  },
  climax_heavy: {
    saga: {
      label: "Liên tục cao trào",
      semanticIntent:
        "Saga là chuỗi escalation liên tục — mỗi segment phải intense hơn trước.",
      rules: [
        "Mỗi saga segment phải end với bigger stakes.",
        "Downtime rất ngắn (1-2 chapters max) giữa các crisis.",
      ],
      avoid: ["Giai đoạn calm kéo dài > 3 chapters"],
    },
    arc: {
      label: "Liên tục cao trào",
      semanticIntent:
        'Arc gần như không có true downtime — mỗi "rest" vẫn chứa underlying threat.',
      rules: [
        "Expected changes phải escalating — mỗi event nguy hiểm/important hơn trước.",
        "Calm moments chỉ là false calm hoặc preparation under pressure.",
      ],
      avoid: ["Slice-of-life episodes", "training arcs kéo dài"],
    },
    packet: {
      label: "Liên tục cao trào",
      semanticIntent:
        "Chapter plan luôn high-tension — vào scene nhanh, exit scene với stakes cao hơn.",
      rules: [
        "Conflict: phải ESCALATE hoặc COMPOUND mỗi chương.",
        "Cliffhanger: urgent, life-or-death hoặc major revelation.",
        "RequiredEvents: phải có ít nhất 1 high-impact event.",
      ],
      avoid: [
        "Chapters chỉ có character bonding mà không có external pressure",
      ],
    },
    writer: {
      label: "Liên tục cao trào",
      semanticIntent: "Prose ở peak intensity — rhythm fast, tension constant.",
      rules: [
        "Prose: câu ngắn, rhythm urgent, imagery mạnh.",
        "Internal thought: ngắn gọn, survival-focused hoặc decision-focused.",
        "Dialogue: terse, loaded, mỗi câu có weight.",
        "Mỗi scene phải có active threat hoặc ticking clock.",
        "Chapter PHẢI end với higher stakes so với lúc bắt đầu.",
      ],
      avoid: [
        "Peaceful descriptions",
        "leisurely pace anywhere",
        "philosophical monologues > 50 từ",
      ],
    },
    validator: {
      label: "Liên tục cao trào",
      semanticIntent: "Kiểm tra intensity maintenance.",
      rules: [
        "Flag nếu chapter có > 500 từ liên tiếp không có tension/conflict.",
        "Flag nếu stakes không escalate qua chapter.",
      ],
      avoid: [],
    },
  },
};

// ─── MAIN CONFLICT TYPE ──────────────────────────────────────────────────────

const MAIN_CONFLICT_GUIDANCE: ValueGuidanceMap = {
  revenge: {
    bible: {
      label: "Báo thù",
      semanticIntent:
        "Động lực chính của câu chuyện là trả thù — mối hận phải sâu và justified.",
      rules: [
        "Bible PHẢI thiết lập rõ: ai gây oan, hậu quả gì, vì sao nhân vật chính phải trả thù.",
        "Kẻ thù phải đủ mạnh/xa tầm để tạo long-term pursuit.",
        "Xây dựng rào cản giữa MC và target — power gap, social hierarchy, protection.",
      ],
      avoid: [
        "Kẻ thù yếu dễ tiêu diệt ngay",
        "motive trả thù mờ nhạt/tầm thường",
      ],
    },
    saga: {
      label: "Báo thù",
      semanticIntent:
        "Saga phải structured around stages of revenge — từ yếu đuối đến đủ mạnh đối đầu.",
      rules: [
        "Mỗi saga stage phải bring MC closer hoặc reveal new obstacle trên đường báo thù.",
        "Cho phép subplot (power growth, allies) nhưng main throughline luôn là approaching the target.",
      ],
      avoid: ["Saga mà MC quên mục tiêu báo thù nhiều chương liên tiếp"],
    },
    arc: {
      label: "Báo thù",
      semanticIntent:
        "Mỗi arc phải connect lại với revenge goal — trực tiếp hoặc gián tiếp.",
      rules: [
        "Mỗi arc kết thúc: MC hoặc tiến gần hơn target, hoặc phát hiện obstacle mới, hoặc đánh bại lieutenant/proxy.",
        "Cho phép arcs focus vào training/power — nhưng motivation phải liên quan revenge.",
      ],
      avoid: ["Arc hoàn toàn disconnected với revenge thread"],
    },
    packet: {
      label: "Báo thù",
      semanticIntent:
        "Chapter phải có connection (dù gián tiếp) đến revenge arc.",
      rules: [
        "Ít nhất 1 reference/connection đến revenge goal mỗi 2-3 chapters.",
        "Nếu chapter không directly về revenge, phải có callback hoặc seed planted cho revenge.",
      ],
      avoid: [],
    },
    writer: {
      label: "Báo thù",
      semanticIntent:
        "MC driven by vengeance — nội tâm, quyết định, relationships đều bị ảnh hưởng.",
      rules: [
        "Nội tâm MC: revenge là undercurrent — hiện diện trong thoughts, reactions.",
        "Relationships: MC có thể cold/focused, hoặc warm nhưng always with purpose toward goal.",
        "CẢNH BÁO: KHÔNG thay thế revenge bằng generic cultivation/adventure conflict. Revenge là ĐỘNG LỰC CHÍNH.",
      ],
      avoid: [
        "MC vui vẻ thoải mái quên hận liên tục",
        "generic adventure tone mà không có revenge drive",
      ],
    },
    validator: {
      label: "Báo thù",
      semanticIntent: "Kiểm tra revenge thread presence.",
      rules: [
        "Flag nếu > 3 chapters liên tiếp không reference revenge goal.",
        "Flag nếu MC suddenly becomes happy-go-lucky inconsistent với revenge motivation.",
      ],
      avoid: [],
    },
  },
  survival: {
    bible: {
      label: "Sinh tồn",
      semanticIntent: "Thế giới hostile — MC phải fight to stay alive.",
      rules: [
        "Bible PHẢI thiết lập environment/threat rõ ràng: thiên tai, quái vật, chiến tranh, resource scarcity.",
        "Xây dựng rules cho survival: food, shelter, territory, hierarchy.",
        'Threat phải ongoing — không thể "solve" bằng 1 hành động.',
      ],
      avoid: [
        "Thế giới safe/comfortable mà MC không bao giờ bị đe dọa thật sự",
      ],
    },
    saga: {
      label: "Sinh tồn",
      semanticIntent:
        "Saga structured qua levels of survival threat — escalating danger.",
      rules: [
        "Mỗi saga phase: new/bigger survival challenge.",
        "Threat landscape expands — individual → group → species/civilization.",
      ],
      avoid: ["MC becomes too powerful and survival becomes trivial sớm"],
    },
    writer: {
      label: "Sinh tồn",
      semanticIntent:
        "Atmosphere luôn có underlying danger. MC decisions = survival calculus.",
      rules: [
        "Nội tâm MC: tính toán resource, threat assessment, risk vs. reward.",
        "Environment: luôn hiện diện như mối đe dọa hoặc resource.",
        "Stakes: readers phải cảm thấy MC có thể thật sự thua/chết/mất.",
        "CẢNH BÁO: KHÔNG thay thế survival bằng generic power fantasy. Danger phải THẬT.",
      ],
      avoid: ["MC luôn win easily", "threat becomes background decoration"],
    },
    validator: {
      label: "Sinh tồn",
      semanticIntent: "Kiểm tra survival tension.",
      rules: [
        "Flag nếu MC giải quyết threat quá dễ mà không có cost.",
        "Flag nếu environment stops being dangerous cho > 3 chapters mà không có lý do.",
      ],
      avoid: [],
    },
  },
  power_struggle: {
    bible: {
      label: "Tranh quyền",
      semanticIntent:
        "Câu chuyện xoay quanh tranh giành quyền lực — political, martial, organizational.",
      rules: [
        "Bible PHẢI thiết lập: các phe phái, hierarchy, prize/position being fought for.",
        "Ít nhất 3+ factions/players trong power game.",
        "Rules of power: ai hold power, how to take it, what are the stakes of losing.",
      ],
      avoid: ["Chỉ có 1 villain duy nhất", "power structure quá đơn giản"],
    },
    saga: {
      label: "Tranh quyền",
      semanticIntent:
        "Saga = stages of political/martial ascension hoặc revolution.",
      rules: [
        "Mỗi saga: MC gains/loses position, alliances shift, new player enters.",
        "Power landscape phải THAY ĐỔI mỗi saga — stagnation = failure.",
      ],
      avoid: [
        "MC stays in same position too long",
        "same opponents throughout",
      ],
    },
    writer: {
      label: "Tranh quyền",
      semanticIntent:
        "Scenes phải reflect power dynamics — dialogue, posturing, strategy.",
      rules: [
        "Dialogue: subtext, power plays, information is currency.",
        "Scenes: meetings, negotiations, betrayals, public displays of power.",
        "MC decisions: calculated, involving trade-offs between allies/resources/reputation.",
        "CẢNH BÁO: KHÔNG thay thế bằng generic adventure. Power struggle là engine — mọi action phục vụ gaining/keeping power.",
      ],
      avoid: [
        "MC ignores political landscape",
        "power comes from training alone without strategy",
      ],
    },
    validator: {
      label: "Tranh quyền",
      semanticIntent: "Kiểm tra political/power elements.",
      rules: [
        "Flag nếu power dynamics disappear cho > 2 chapters.",
        "Flag nếu MC gains power without opposition/cost.",
      ],
      avoid: [],
    },
  },
  mystery: {
    bible: {
      label: "Khám phá bí mật",
      semanticIntent:
        "Câu chuyện driven by uncovering truth — secrets, puzzles, hidden history.",
      rules: [
        "Bible PHẢI plant ít nhất 1 major mystery + 2-3 minor mysteries.",
        "Mystery phải có layers — surface answer → deeper truth.",
        "Xây dựng rules cho information: ai biết gì, vì sao hidden, consequences of revealing.",
      ],
      avoid: ["Mystery quá dễ đoán", "reveal ngay từ đầu"],
    },
    saga: {
      label: "Khám phá bí mật",
      semanticIntent:
        "Saga = peeling layers — mỗi stage reveals partial truth + new questions.",
      rules: [
        "Mỗi saga phải reveal 1 layer và seed new mystery.",
        "Breadcrumbs phải scattered throughout — reader có thể theorize.",
      ],
      avoid: [
        "Dump all answers at once",
        "mystery forgotten for long stretches",
      ],
    },
    writer: {
      label: "Khám phá bí mật",
      semanticIntent:
        "Prose phải maintain curiosity — plant clues, raise questions, partial reveals.",
      rules: [
        "Scenes: investigation, deduction, discovery, reaction to new info.",
        "Dialogue: characters may lie, omit, or accidentally reveal.",
        "Pacing: clues come at steady rate — reader never goes too long without new info.",
        "CẢNH BÁO: KHÔNG thay thế mystery bằng generic power-up arc. Investigation/discovery là engine.",
      ],
      avoid: [
        "MC stops investigating for chapters",
        "answers come from nowhere without foreshadowing",
      ],
    },
    validator: {
      label: "Khám phá bí mật",
      semanticIntent: "Kiểm tra mystery elements.",
      rules: [
        "Flag nếu > 3 chapters không có any clue/reveal/question related to mystery.",
        "Flag nếu mystery resolved without adequate foreshadowing.",
      ],
      avoid: [],
    },
  },
  growth: {
    bible: {
      label: "Trưởng thành",
      semanticIntent:
        "Story driven by MC personal/spiritual/power growth — coming of age, mastery, wisdom.",
      rules: [
        "Bible PHẢI thiết lập starting state rõ ràng — MC flaws, limitations, naivety.",
        "Growth path: what MC needs to learn/overcome/become.",
        "Mentors, challenges, failures as growth catalysts.",
      ],
      avoid: [
        "MC starts already perfect/mature",
        "growth chỉ là power numbers going up",
      ],
    },
    saga: {
      label: "Trưởng thành",
      semanticIntent:
        "Saga tracks maturation stages — each phase = new understanding/capability.",
      rules: [
        "Mỗi saga: MC faces challenge that forces growth in new dimension.",
        "Growth should be VISIBLE — reader can compare MC now vs. before.",
      ],
      avoid: [
        "MC stays same personality throughout",
        "growth chỉ quantitative (levels) mà thiếu qualitative",
      ],
    },
    writer: {
      label: "Trưởng thành",
      semanticIntent:
        "Chapter phải show growth qua actions/decisions/reflections — not told, shown.",
      rules: [
        "Show MC struggle → fail → learn → apply.",
        "Internal thought: self-awareness increasing over time.",
        "Relationships: MC treats others differently as they grow.",
        "CẢNH BÁO: Growth ≠ chỉ là power level tăng. Character phải thay đổi về wisdom, empathy, discipline, hoặc perspective.",
      ],
      avoid: ["MC never fails", "growth montaged away in 1 paragraph"],
    },
    validator: {
      label: "Trưởng thành",
      semanticIntent: "Kiểm tra growth expression.",
      rules: [
        "Flag nếu MC makes same mistake repeatedly without learning.",
        "Flag nếu growth chỉ thể hiện qua power numbers mà personality unchanged.",
      ],
      avoid: [],
    },
  },
};

// ─── POWER SYSTEM STYLE ──────────────────────────────────────────────────────

const POWER_SYSTEM_STYLE_GUIDANCE: ValueGuidanceMap = {
  realm: {
    bible: {
      label: "Cảnh giới (Tu luyện)",
      semanticIntent:
        "Hệ thống sức mạnh dựa trên cultivation — cảnh giới rõ ràng, đột phá, tích lũy.",
      rules: [
        "PHẢI định nghĩa: danh sách cảnh giới (ít nhất 7-9 levels), điều kiện đột phá, resources cần.",
        "Mỗi cảnh giới: power gap rõ ràng với cảnh giới trước.",
        "Đột phá: cần điều kiện cụ thể (ngộ đạo, linh thạch, kiếp lôi, thuốc đan...).",
        "Limitations: bottleneck thiên phú, thọ mệnh, inner demons, thiên kiếp.",
        "Combat expression: cảnh giới cao hơn ≈ áp đảo, nhưng technique/artifact có thể bridge gap nhỏ.",
        "QUAN TRỌNG: powerSystemStyle đã chọn là REALM/CULTIVATION — Bible PHẢI reflect hệ thống cảnh giới, không phải level/skill/tech.",
      ],
      avoid: ["Generic RPG levels", "skill trees", "technology-based power"],
    },
    writer: {
      label: "Cảnh giới",
      semanticIntent:
        "Combat và training scenes phải reflect cultivation logic.",
      rules: [
        "Training: meditation, absorb resources, comprehend laws.",
        "Combat: aura pressure, technique vs technique, realm suppression.",
        "Breakthroughs: dramatic, physical transformation, environmental reaction.",
        "Prose: cho phép cultivation-specific terminology (linh khí, chân nguyên, thiên địa pháp tắc).",
      ],
      avoid: [
        "RPG-style XP gains",
        '"ding level up" moments',
        "tech-based abilities",
      ],
    },
    validator: {
      label: "Cảnh giới",
      semanticIntent: "Kiểm tra cultivation consistency.",
      rules: [
        "Flag nếu MC đột phá mà không có điều kiện/setup.",
        "Flag nếu combat ignores realm gap mà không có explanation.",
        'Flag nếu power expression uses wrong system vocabulary (e.g., "level up", "skill points").',
      ],
      avoid: [],
    },
  },
  level: {
    bible: {
      label: "Cấp độ (System/Game)",
      semanticIntent:
        "Hệ thống quantified — levels, stats, hoặc measurable ranks.",
      rules: [
        "PHẢI định nghĩa: level range, stats (nếu có), rank system, XP/advancement mechanism.",
        "Progression: clear markers, có thể quantified.",
        "Power gap: measurable nhưng skill/equipment có thể compensate.",
        "QUAN TRỌNG: Đây là level-based system — KHÔNG dùng cultivation terminology trừ khi hybrid.",
      ],
      avoid: [
        "Cultivation cảnh giới terminology",
        'vague "becoming stronger" mà không quantify',
      ],
    },
    writer: {
      label: "Cấp độ",
      semanticIntent:
        "Power expression qua numbers/ranks/measurable advancement.",
      rules: [
        "Allow system-like language: level, rank, stats, progression.",
        "Advancement: clear trigger (quest complete, boss defeated, milestone reached).",
        "Combat: có thể reference stats/levels nhưng vẫn cần tactical decisions.",
      ],
      avoid: [
        "Cultivation-specific language (linh khí, cảnh giới)",
        "purely mystical breakthroughs",
      ],
    },
    validator: {
      label: "Cấp độ",
      semanticIntent: "Kiểm tra system consistency.",
      rules: [
        "Flag nếu level jumps không có justification.",
        "Flag nếu system rules bị broken mà không acknowledged.",
      ],
      avoid: [],
    },
  },
  skill: {
    bible: {
      label: "Kỹ năng",
      semanticIntent:
        "Power từ mastering specific skills/techniques — depth over breadth.",
      rules: [
        "PHẢI định nghĩa: skill categories, mastery levels, training methods.",
        "Power: comes from technique perfection, not raw level.",
        "Combat: creativity và technique application > raw power.",
        "Progression: mastery-based — same skill can evolve/deepen.",
      ],
      avoid: ["Generic power levels", "innate power > trained skill"],
    },
    writer: {
      label: "Kỹ năng",
      semanticIntent:
        "Scenes emphasize skill mastery, application, creativity.",
      rules: [
        "Training: practice, experimentation, failure, refinement.",
        "Combat: technique and creativity matter more than raw power.",
        "Breakthrough: discovering new application of existing skill.",
      ],
      avoid: ["Power coming from nowhere", "talent > effort narrative"],
    },
    validator: {
      label: "Kỹ năng",
      semanticIntent: "Kiểm tra skill-based progression.",
      rules: [
        "Flag nếu MC uses skill never established/trained.",
        "Flag nếu power comes from innate talent alone, ignoring skill development.",
      ],
      avoid: [],
    },
  },
  ability: {
    bible: {
      label: "Dị năng / Supernatural abilities",
      semanticIntent:
        "Power từ innate/awakened supernatural abilities — unique per person.",
      rules: [
        "PHẢI định nghĩa: origin of abilities (awakening, mutation, inheritance), classification, limitations.",
        "Abilities: mỗi người unique hoặc từ pool hữu hạn.",
        "Limitations: duration, cooldown, side effects, conditions, counter.",
        "Growth: ability evolution, new applications, removing limiters.",
      ],
      avoid: ["Generic cultivation", "everyone has same power type"],
    },
    writer: {
      label: "Dị năng",
      semanticIntent:
        "Combat showcases unique abilities — creative application, matchup logic.",
      rules: [
        "Combat: ability vs ability — matchup, counter, creative use.",
        "Growth: discovering new aspects of ability, removing limitations.",
        "Prose: describe ability activation vividly — sensory, visual, impact.",
      ],
      avoid: [
        "Ability works exactly like generic cultivation qi",
        "unlimited use without cost",
      ],
    },
    validator: {
      label: "Dị năng",
      semanticIntent: "Kiểm tra ability consistency.",
      rules: [
        "Flag nếu ability suddenly has new power mà không có development.",
        "Flag nếu limitations ignored.",
        "Flag nếu ability expression uses cultivation vocabulary inconsistently.",
      ],
      avoid: [],
    },
  },
  martial: {
    bible: {
      label: "Võ học",
      semanticIntent:
        "Power từ martial arts mastery — techniques, internal energy, body cultivation.",
      rules: [
        "PHẢI định nghĩa: martial arts schools/styles, internal energy (nội lực/chân khí), weapons, forbidden techniques.",
        "Hierarchy: based on martial skill + internal energy depth.",
        "Combat: technique matchup, experience, weapon mastery.",
        "Limitations: body condition, poison, internal injuries, age.",
        "QUAN TRỌNG: Martial arts ≠ generic cultivation. Focus on physical techniques, combat experience, school traditions.",
      ],
      avoid: [
        "Flying/immortal-level powers trừ khi high-level",
        "modern technology weapons",
      ],
    },
    writer: {
      label: "Võ học",
      semanticIntent: "Combat detailed, technique-focused, physical.",
      rules: [
        "Combat: describe moves, footwork, weapon clashes, internal energy flow.",
        "Training: practice forms, spar, meditate on technique, overcome bottleneck.",
        "Prose: kinetic, physical, visceral. Martial arts feel grounded.",
        "Allow: wuxia terminology (chiêu thức, nội công, khinh công, điểm huyệt).",
      ],
      avoid: [
        "Magic-style abilities",
        "cultivation realm breakthrough style power",
      ],
    },
    validator: {
      label: "Võ học",
      semanticIntent: "Kiểm tra martial arts consistency.",
      rules: [
        "Flag nếu combat is too abstract/magical khi system là martial arts.",
        "Flag nếu character uses technique never trained.",
      ],
      avoid: [],
    },
  },
  tech: {
    bible: {
      label: "Công nghệ",
      semanticIntent:
        "Power từ technology — equipment, inventions, augmentation, crafting.",
      rules: [
        "PHẢI định nghĩa: tech level, advancement paths, resources needed, R&D process.",
        "Power: comes from equipment, augmentation, invention — not innate.",
        "Limitations: resource cost, maintenance, counter-tech, obsolescence.",
        "Progression: better equipment, new inventions, reverse-engineering.",
        "QUAN TRỌNG: Tech system — KHÔNG dùng cultivation/magic vocabulary.",
      ],
      avoid: [
        "Cultivation terminology",
        "innate magical powers",
        "generic chi/qi energy",
      ],
    },
    writer: {
      label: "Công nghệ",
      semanticIntent:
        "Power scenes involve tech — crafting, deployment, upgrading, hacking.",
      rules: [
        "Combat: weapon systems, gadgets, tactical deployment.",
        "Growth: research, crafting, scavenging, upgrading.",
        "Prose: technical vocabulary appropriate to setting era.",
      ],
      avoid: [
        "Mystical breakthroughs",
        "cultivation meditation",
        "innate supernatural abilities",
      ],
    },
    validator: {
      label: "Công nghệ",
      semanticIntent: "Kiểm tra tech consistency.",
      rules: [
        "Flag nếu power comes from mystical/innate source mà không phải tech.",
        "Flag nếu tech works without established resource/logic.",
      ],
      avoid: [],
    },
  },
};

// ─── WORLD ERA ───────────────────────────────────────────────────────────────

const WORLD_ERA_GUIDANCE: ValueGuidanceMap = {
  ancient: {
    bible: {
      label: "Cổ đại",
      semanticIntent:
        "Setting tiền hiện đại — kiếm cung, ngựa xe, tông môn, vương triều.",
      rules: [
        "Social structure: sects/clans/dynasties, feudal hierarchy.",
        "Technology: pre-industrial — swords, horses, carrier pigeons, sailing ships.",
        "Economy: barter/coins, merchants guilds, tribute systems.",
        "Travel: foot, horse, carriage, ship. No motorized vehicles.",
        "Language: classical-flavored Vietnamese, archaic address forms (huynh/đệ/tiên sinh/nương tử).",
        "ANTI-DRIFT: KHÔNG có smartphone, internet, police, modern schools, corporations, cars, electricity trừ khi genre explicitly hybrid.",
      ],
      avoid: [
        "Modern technology",
        "corporate structures",
        "mass media",
        "scientific institutions",
      ],
    },
    writer: {
      label: "Cổ đại",
      semanticIntent:
        "Prose dùng ngôn ngữ cổ phong, setting phải pre-modern throughout.",
      rules: [
        "Language: dùng từ vựng cổ phong (huynh đệ, bái kiến, phu nhân, linh thạch, truyền tống...).",
        "Setting details: đèn dầu, lều trại, ngựa chiến, chim ưng đưa thư.",
        "Institutions: tông môn, vương phủ, bang hội, ẩn sĩ.",
        'ANTI-DRIFT: Nếu nhân vật "gọi điện", "lên mạng", "đến trường", "vào công ty" → SAI.',
      ],
      avoid: [
        "Từ vựng hiện đại (điện thoại, xe hơi, laptop, cảnh sát)",
        "modern social concepts (democracy, companies)",
      ],
    },
    validator: {
      label: "Cổ đại",
      semanticIntent: "Kiểm tra anachronism.",
      rules: [
        "Flag NGAY nếu xuất hiện: smartphone, internet, police, school, car, train, electricity mà không có genre justification.",
        "Flag nếu language dùng slang hiện đại quá nhiều.",
      ],
      avoid: [],
    },
  },
  modern: {
    bible: {
      label: "Hiện đại",
      semanticIntent:
        "Setting contemporary — thành phố, công nghệ hiện đại, xã hội hiện đại.",
      rules: [
        "Social structure: governments, corporations, schools, hospitals, media.",
        "Technology: smartphones, internet, vehicles, modern weapons.",
        "Economy: currency, banking, jobs, businesses.",
        "Travel: cars, planes, trains, public transit.",
        "Language: Vietnamese hiện đại, natural dialogue.",
        "ANTI-DRIFT: KHÔNG có tông môn cổ đại, vương triều phong kiến, kiếm khách giang hồ TRỪNG KHI genre explicitly urban fantasy/hidden world.",
      ],
      avoid: [
        "Ancient sect politics (trừ khi hidden world genre)",
        "feudal hierarchy in modern setting",
        "horses as main transport",
      ],
    },
    writer: {
      label: "Hiện đại",
      semanticIntent:
        "Prose reflect modern life — dialogue tự nhiên, setting urban/suburban.",
      rules: [
        "Setting: buildings, streets, cafes, offices, apartments.",
        "Communication: phone, text, social media — allowed and natural.",
        "Language: conversational modern Vietnamese.",
        "Nếu có supernatural elements: chúng exists WITHIN modern framework (hidden society, urban fantasy logic).",
        "ANTI-DRIFT: Nhân vật KHÔNG hành xử như ancient cultivator (trừ khi character trait specific). Không dùng cổ ngữ làm default dialogue.",
      ],
      avoid: [
        "Full ancient setting",
        "horses/carriages",
        "sect-based social structure as default",
      ],
    },
    validator: {
      label: "Hiện đại",
      semanticIntent: "Kiểm tra era consistency.",
      rules: [
        "Flag nếu setting suddenly becomes ancient without portal/timetravel justification.",
        "Flag nếu modern technology disappears inexplicably.",
        "Flag nếu language shifts to full archaic style without character reason.",
      ],
      avoid: [],
    },
  },
  future: {
    bible: {
      label: "Tương lai",
      semanticIntent:
        "Setting futuristic — advanced tech, possible space travel, AI, augmentation.",
      rules: [
        "Technology: beyond current — specify what exists (AI, FTL, cybernetics, etc).",
        "Social: how has society changed? New hierarchies, governments, or lack thereof.",
        "Economy: credits, resource-based, post-scarcity?",
        "Define: what is still impossible even in this future.",
      ],
      avoid: [
        "Pure medieval fantasy elements without justification",
        "current-day limitations that should be solved",
      ],
    },
    writer: {
      label: "Tương lai",
      semanticIntent:
        "Prose reflects advanced setting — tech in daily life, new social norms.",
      rules: [
        "Setting: include futuristic details naturally (not exposition dumps).",
        "Technology: characters interact with tech casually.",
        "Language: can include neologisms but keep readable.",
      ],
      avoid: [
        "Describing common future-tech with awe (characters should be used to it)",
      ],
    },
    validator: {
      label: "Tương lai",
      semanticIntent: "Kiểm tra future consistency.",
      rules: [
        "Flag nếu characters lack access to technology established in bible.",
        "Flag nếu problems solvable by established tech are ignored for plot convenience.",
      ],
      avoid: [],
    },
  },
  otherworld: {
    bible: {
      label: "Dị giới",
      semanticIntent:
        "Setting là thế giới khác — tự do xây dựng, nhưng phải internally consistent.",
      rules: [
        "PHẢI define: physics rules, races/species, geography, magic/power source.",
        "Internal consistency: once rules established, they must hold.",
        "Distinctness: thế giới phải feel different from Earth — unique elements required.",
      ],
      avoid: ["Carbon copy of Earth history", "inconsistent rules"],
    },
    writer: {
      label: "Dị giới",
      semanticIntent:
        "Prose weaves otherworld details naturally — show through character experience.",
      rules: [
        "Worldbuilding: reveal through character interaction, not info dumps.",
        "Language: can include unique terms for races, locations, concepts — but introduce clearly.",
        "Characters treat their world as normal — reader discovers through their eyes.",
      ],
      avoid: [
        "Characters explaining their own world to each other unnaturally",
      ],
    },
    validator: {
      label: "Dị giới",
      semanticIntent: "Kiểm tra otherworld consistency.",
      rules: [
        "Flag nếu Earth-specific references appear without justification (countries, brands, etc).",
        "Flag nếu established world rules contradicted.",
      ],
      avoid: [],
    },
  },
  post_apocalypse: {
    bible: {
      label: "Hậu tận thế",
      semanticIntent:
        "Thế giới sau catastrophe — ruins, scarcity, new order emerging.",
      rules: [
        "PHẢI define: what was the apocalypse, how long ago, what remains.",
        "Resources: scarce — fuel, food, medicine, ammunition.",
        "Society: collapsed/reformed — tribes, settlements, warlords, or slowly rebuilding.",
        "Technology: degraded from pre-apocalypse — scavenging, makeshift, rare intact tech.",
      ],
      avoid: [
        "Comfortable modern life",
        "resources being abundant",
        "pre-apocalypse infrastructure working perfectly",
      ],
    },
    writer: {
      label: "Hậu tận thế",
      semanticIntent:
        "Prose reflects decay, danger, scarcity — atmosphere desolate but survivable.",
      rules: [
        "Setting: ruins, makeshift settlements, dangerous wilderness.",
        "Resources: always mentioned as concern — food, water, ammo, medicine.",
        "Characters: survival-hardened, pragmatic, wary of strangers.",
        "Environment: hostile — weather, radiation, mutants, raiders.",
      ],
      avoid: [
        "Clean, comfortable scenes without justification",
        "infinite resources",
        "pre-apocalypse convenience",
      ],
    },
    validator: {
      label: "Hậu tận thế",
      semanticIntent: "Kiểm tra post-apocalypse consistency.",
      rules: [
        "Flag nếu resources appear from nowhere.",
        "Flag nếu pre-apocalypse infrastructure works perfectly without explanation.",
        "Flag nếu characters behave like pre-apocalypse society exists.",
      ],
      avoid: [],
    },
  },
};

// ─── ROMANCE LEVEL ───────────────────────────────────────────────────────────

const ROMANCE_LEVEL_GUIDANCE: ValueGuidanceMap = {
  none: {
    writer: {
      label: "Không có romance",
      semanticIntent:
        "Story KHÔNG có subplot tình cảm — relationships là comrades, rivals, mentor.",
      rules: [
        "KHÔNG viết scenes focused on romantic attraction.",
        "Interactions giữa characters: respect, rivalry, friendship, loyalty — KHÔNG romantic tension.",
        "Nếu nhân vật nữ xuất hiện: treat as equal character, không default thành love interest.",
      ],
      avoid: [
        "Blushing around opposite sex",
        "romantic subtext",
        "forced pairing setup",
      ],
    },
    packet: {
      label: "Không có romance",
      semanticIntent: "Chapter plan KHÔNG include romantic subplot.",
      rules: ["Không plan scenes xây dựng romantic relationship."],
      avoid: ["Love interest introduction", "date scenes", "jealousy plots"],
    },
    validator: {
      label: "Không có romance",
      semanticIntent: "Flag any romance drift.",
      rules: [
        "Flag nếu chapter introduces romantic subplot mà không có từ arc plan.",
        "Flag nếu character interactions have unnecessary romantic coding.",
      ],
      avoid: [],
    },
  },
  light: {
    writer: {
      label: "Romance nhẹ",
      semanticIntent:
        "Romance tồn tại nhưng secondary — hints, chemistry, subtle moments. Không là focus.",
      rules: [
        "Cho phép: brief moments of chemistry, subtle attraction, 1-2 meaningful interactions per arc.",
        "Pacing: very slow burn — actual confession/relationship ở cuối truyện hoặc later arcs.",
        "KHÔNG chiếm > 10% chapter content cho romantic scenes.",
      ],
      avoid: [
        "Long romantic scenes",
        "love triangle drama",
        "romance overshadowing main plot",
      ],
    },
    packet: {
      label: "Romance nhẹ",
      semanticIntent: "Romance là flavor, không là chapter goal.",
      rules: [
        "Có thể include 1 brief romantic beat nhưng KHÔNG làm chapter goal.",
      ],
      avoid: ["Chapters dedicated to romance development"],
    },
    validator: {
      label: "Romance nhẹ",
      semanticIntent: "Kiểm tra romance không overwhelm.",
      rules: [
        "Flag nếu > 20% chapter content là romantic scenes.",
        "Flag nếu romance suddenly becomes main focus mà không có plan.",
      ],
      avoid: [],
    },
  },
  medium: {
    writer: {
      label: "Romance vừa",
      semanticIntent:
        "Romance là subplot quan trọng — meaningful development, emotional moments, nhưng không phải main drive.",
      rules: [
        "Cho phép: dedicated romantic scenes (1-2 per arc), emotional conversations, relationship milestones.",
        "Pacing: natural development — attraction → understanding → trust → deeper feelings.",
        "Balance: 15-25% content có thể liên quan romance, xen kẽ với main plot.",
        "Relationship phải have its own arc — obstacles, growth, not just easy chemistry.",
      ],
      mustInclude: ["1 meaningful romantic/relationship moment mỗi 3-5 chương"],
      avoid: [
        "Romance dominating every chapter",
        "instant love",
        "relationship without obstacles",
      ],
    },
    packet: {
      label: "Romance vừa",
      semanticIntent:
        "Chapter plan CÓ THỂ include romance beat khi phù hợp arc.",
      rules: [
        "Mỗi 3-5 chapters: plan 1 romantic development beat.",
        "Romance beat phải connect với character growth hoặc plot (không isolated).",
      ],
      avoid: ["Every chapter has romance as main event"],
    },
    validator: {
      label: "Romance vừa",
      semanticIntent: "Kiểm tra romance balance.",
      rules: [
        "Flag nếu romance disappears cho > 10 chapters (forgotten subplot).",
        "Flag nếu romance takes > 40% of chapter content consistently.",
      ],
      avoid: [],
    },
  },
  heavy: {
    writer: {
      label: "Romance nhiều",
      semanticIntent:
        "Romance là major emotional throughline — đồng hành cùng main plot, not separate.",
      rules: [
        "Romance woven into main story — relationship dynamics affect plot decisions.",
        "Cho phép: 30-40% content related to romance/relationship.",
        "Pacing: active romance development — meaningful scenes mỗi 1-2 chapters.",
        "Emotional depth: vulnerability, conflict within relationship, growth together.",
        "QUAN TRỌNG: Romance là throughline, KHÔNG thay thế main plot trừ khi genre là pure romance.",
      ],
      mustInclude: [
        "Romantic/relationship moment mỗi 1-2 chương",
        "relationship phải have internal conflict/growth",
      ],
      avoid: [
        "Romance without obstacles",
        "main plot forgotten for romance",
        "purple prose sex scenes (trừ khi explicit genre)",
      ],
    },
    packet: {
      label: "Romance nhiều",
      semanticIntent: "Chapter plan thường xuyên include romance elements.",
      rules: [
        "Mỗi 1-2 chapters: romance/relationship development planned.",
        "Romance beats phải interweave với main plot — not isolated from story.",
      ],
      avoid: ["Ignoring romance for > 3 consecutive chapters"],
    },
    validator: {
      label: "Romance nhiều",
      semanticIntent: "Kiểm tra romance presence.",
      rules: [
        "Flag nếu > 5 chapters consecutive mà không có romance beat.",
        "Flag nếu romance entirely replaces main plot for extended period.",
      ],
      avoid: ['Flagging chapters with romance as "off-topic"'],
    },
  },
};

// ─── COMEDY LEVEL ────────────────────────────────────────────────────────────

const COMEDY_LEVEL_GUIDANCE: ValueGuidanceMap = {
  none: {
    writer: {
      label: "Không có comedy",
      semanticIntent: "Truyện hoàn toàn serious — không dùng comic relief.",
      rules: ["Dialogue và scenes: straight, no jokes, no humor beats."],
      avoid: ["Forced jokes", "comic relief characters", "humorous asides"],
    },
    validator: {
      label: "Không có comedy",
      semanticIntent: "Flag unintended humor.",
      rules: ["Flag nếu chapter có moments hài hước không phù hợp tone."],
      avoid: [],
    },
  },
  light: {
    writer: {
      label: "Comedy nhẹ",
      semanticIntent:
        "Occasional dry wit, subtle humor — texture, not feature.",
      rules: [
        "Cho phép: wry observations, mild irony, clever wordplay trong dialogue.",
        "Frequency: 1-2 light moments per chapter, organic — not forced.",
        "Style: deadpan, understated, character-voice driven.",
      ],
      avoid: ["Slapstick", "gag sequences", "comedy that breaks scene mood"],
    },
    validator: {
      label: "Comedy nhẹ",
      semanticIntent: "Light humor OK, heavy comedy not.",
      rules: [
        "Flag nếu comedy dominates a scene mà scene should be tense/serious.",
      ],
      avoid: ["Flagging dry wit as tone violation"],
    },
  },
  medium: {
    writer: {
      label: "Comedy vừa",
      semanticIntent:
        "Regular banter và situational humor — comedy là recurring element.",
      rules: [
        "Dialogue: banter giữa characters, playful teasing, witty comebacks.",
        "Situational humor: misunderstandings, ironic timing, character quirks gây cười.",
        "Frequency: multiple humor beats per chapter, woven naturally into scenes.",
        "Balance: comedy tồn tại alongside serious beats — alternate rather than override.",
        "CẢNH BÁO: Comedy KHÔNG ĐƯỢC phá vỡ stakes trừ khi tone = parody. Humor là seasoning, không là solvent.",
      ],
      mustInclude: [
        "2-3 comedic beats per chapter (dialogue banter, situational humor, hoặc character reaction)",
      ],
      avoid: [
        "Comedy destroying tension at critical moments",
        "turning villain into pure buffoon",
      ],
    },
    validator: {
      label: "Comedy vừa",
      semanticIntent: "Kiểm tra comedy balance.",
      rules: [
        "Flag nếu chapter entirely humorless (should have some comedy beats).",
        "Flag nếu comedy destroys stakes at climactic moment.",
      ],
      avoid: ["Flagging banter during non-critical scenes"],
    },
  },
  heavy: {
    writer: {
      label: "Comedy nhiều",
      semanticIntent:
        "Comedy là feature chính — affect scene rhythm, character reactions, reversals.",
      rules: [
        "Dialogue: majority of exchanges có humor element — banter, sarcasm, absurdist logic.",
        "Scene structure: setups and payoffs, running gags, comedic reversals.",
        "Character reactions: exaggerated (nhưng consistent with personality), comic timing.",
        "Misunderstandings: allowed as plot device if played for both humor and development.",
        "Frequency: comedy present in majority of scenes.",
        "CẢNH BÁO QUAN TRỌNG: Comedy KHÔNG ĐƯỢC destroy stakes trừ khi tone = crack/parody. Even comedic stories cần moments of genuine emotion/danger để humor có contrast.",
      ],
      mustInclude: [
        "Running gag hoặc comic pattern sustained across chapters",
        "comedic reversal hoặc misunderstanding mỗi 1-2 chapters",
      ],
      avoid: [
        "100% joke no substance",
        "villain never threatening",
        "reader cannot take any scene seriously",
      ],
    },
    validator: {
      label: "Comedy nhiều",
      semanticIntent: "Kiểm tra comedy presence.",
      rules: [
        "Flag nếu chapter has NO humor beats (comedy level is heavy).",
        "Flag nếu comedy completely eliminates all tension — some stakes must remain.",
      ],
      avoid: ["Flagging chapters for having too much humor"],
    },
  },
};

// ─── DARK LEVEL ──────────────────────────────────────────────────────────────

const DARK_LEVEL_GUIDANCE: ValueGuidanceMap = {
  bright: {
    bible: {
      label: "Sáng",
      semanticIntent:
        "Thế giới có hope — goodness exists, effort rewarded, evil does not dominate.",
      rules: [
        "World: cho phép safe havens, kind mentors, communities that help.",
        "Consequences: failures have cost but are recoverable.",
      ],
      avoid: [
        "Grimdark worldbuilding",
        "hopelessness as default state",
        "torture/extreme violence",
      ],
    },
    writer: {
      label: "Sáng",
      semanticIntent:
        "Giảm u ám, giữ cảm giác hy vọng. Bi kịch cho phép nhưng không kéo dài.",
      rules: [
        "Atmosphere: generally upbeat. Dark moments brief, always followed by recovery.",
        "Violence: minimal/implied, not graphic.",
        "Characters: fundamentally decent people exist in the world.",
        "Khi có comedy level: comedy and brightness complement naturally.",
      ],
      avoid: [
        "Grimdark passages",
        "prolonged suffering without hope",
        "graphic violence/torture",
      ],
    },
    validator: {
      label: "Sáng",
      semanticIntent: "Flag excessive darkness.",
      rules: [
        "Flag nếu chapter has extended hopeless/grimdark tone.",
        "Flag nếu graphic violence appears.",
        "Flag nếu world feels oppressive without relief for entire chapter.",
      ],
      avoid: [],
    },
  },
  neutral: {
    writer: {
      label: "Trung tính",
      semanticIntent:
        "Cân bằng căng thẳng với khoảng thở. Danger thật nhưng hope tồn tại.",
      rules: [
        "Balance: tense moments balanced with calm/recovery.",
        "Violence: can be present but not gratuitous — serves story.",
        "Consequences: real and lasting, nhưng not overwhelming.",
        "KHÔNG đẩy mọi xung đột thành tuyệt vọng.",
      ],
      avoid: ["Unrelenting grimness", "trivializing danger"],
    },
    validator: {
      label: "Trung tính",
      semanticIntent: "Kiểm tra balance.",
      rules: [
        "Flag nếu tone lệch quá dark liên tục (> 3 chapters pure grimness).",
        "Flag nếu tone lệch quá bright mà có violence/death treated lightly.",
      ],
      avoid: [],
    },
  },
  dark: {
    bible: {
      label: "U tối",
      semanticIntent:
        "Thế giới khắc nghiệt nhưng survivable. Moral grey dominant.",
      rules: [
        "World: dangerous, unjust, power corrupts.",
        "Consequences: heavy, sometimes permanent (death, loss, corruption).",
        "Morality: most characters in grey zone.",
      ],
      avoid: ["Pure evil for shock value", "torture porn"],
    },
    writer: {
      label: "U tối",
      semanticIntent:
        "Cho phép không khí nặng và hậu quả nghiêm trọng, giữ logic nhân vật.",
      rules: [
        "Atmosphere: oppressive, tension constant.",
        "Violence: can be graphic when serves story — not gratuitous.",
        "Loss: real — characters can die, be permanently injured, lose what matters.",
        "Hope: rare and hard-won — makes it more powerful when present.",
        "Nếu có comedy level: dark + comedy = gallows humor, sardonic wit. Contrast enhances both. KHÔNG tonal collapse.",
      ],
      avoid: [
        "Torture porn",
        "darkness without narrative purpose",
        "shock value gore",
      ],
    },
    validator: {
      label: "U tối",
      semanticIntent: "Dark is intended — do not flag darkness itself.",
      rules: [
        "KHÔNG flag chapter for being dark/violent — this is intended.",
        "Flag nếu darkness has no narrative purpose (pure shock).",
        "Flag nếu tone suddenly bright/cheerful mà không have reason.",
      ],
      avoid: ["Flagging intended dark content"],
    },
  },
  extreme_dark: {
    bible: {
      label: "Cực dark",
      semanticIntent: "Bầu không khí khắc nghiệt, mất mát cao, đạo đức xám rõ.",
      rules: [
        "World: brutal, unforgiving, strong eat weak.",
        "No safety nets — even allies can betray, even victories have severe cost.",
        "Moral: extreme grey to outright dark — survival > ethics for most.",
      ],
      avoid: [
        "Safe spaces existing easily",
        "kindness being free",
        "plot armor",
      ],
    },
    writer: {
      label: "Cực dark",
      semanticIntent:
        "Atmosphere khắc nghiệt toàn diện. Pain, loss, moral corruption are normal.",
      rules: [
        "Prose: heavy, visceral, unflinching.",
        "Characters: pragmatic to extreme — survival trumps morality.",
        "Violence: graphic and frequent — but serves narrative.",
        "Hope: almost absent — any light is fragile and often extinguished.",
        "QUAN TRỌNG: Extreme dark vẫn cần narrative coherence — not random evil/gore.",
        "Nếu có comedy level: gallows humor ONLY — laugh because otherwise you cry. Enhances bleakness.",
      ],
      avoid: [
        "Random torture without narrative purpose",
        "edgy for edgy sake",
        "reader exhaustion from constant graphic without relief",
      ],
    },
    validator: {
      label: "Cực dark",
      semanticIntent: "Extreme dark intended.",
      rules: [
        "KHÔNG flag for extreme violence/darkness — intended.",
        "Flag NẾU darkness serves no story purpose (pure shock without consequence).",
        "Flag nếu tone whiplashes to bright without justification.",
      ],
      avoid: ["Flagging grimdark content as violation"],
    },
  },
};

// ─── POV ─────────────────────────────────────────────────────────────────────

const POV_GUIDANCE: ValueGuidanceMap = {
  first: {
    bible: {
      label: "Ngôi nhất",
      semanticIntent:
        'Truyện kể từ "tôi/ta" — limited perspective, subjective, personal voice.',
      rules: [
        "Style guide: PHẢI specify first-person voice — tông giọng, từ vựng, personality of narrator.",
        "Information: reader only knows what narrator knows — plan information reveal accordingly.",
      ],
      avoid: ["Omniscient plot threads narrator cannot know about"],
    },
    writer: {
      label: "Ngôi nhất",
      semanticIntent:
        'Viết ngôi nhất — "tôi/ta" narrator. Subjective, intimate, limited.',
      rules: [
        'TOÀN BỘ prose từ perspective nhân vật "tôi/ta".',
        "Internal thought: direct access, natural, stream-of-consciousness cho phép.",
        "Knowledge limitation: narrator KHÔNG THỂ biết thoughts of others — chỉ observe behavior.",
        "Subjective bias: narrator có thể sai, misinterpret, have blind spots.",
        "Other characters: described through narrator lens — appearance, actions, speech only.",
        'KHÔNG BAO GIỜ: "hắn nghĩ rằng...", "nàng cảm thấy..." (trừ narrator guessing).',
      ],
      avoid: [
        "Third-person passages",
        "knowing other character thoughts",
        "objective narration",
      ],
    },
    validator: {
      label: "Ngôi nhất",
      semanticIntent: "Kiểm tra POV consistency — nghiêm ngặt.",
      rules: [
        "Flag NGAY nếu prose shifts to third person mà không có reason.",
        "Flag nếu narrator knows information they should not (other character thoughts, events they were not present for).",
        "Flag nếu perspective shifts to another character within same chapter mà không have first-person.",
      ],
      avoid: [],
    },
  },
  third_limited: {
    bible: {
      label: "Ngôi ba giới hạn",
      semanticIntent:
        "Kể ngôi ba nhưng gắn close với 1 POV character per scene.",
      rules: [
        "Style guide: specify how close the camera is — deep POV vs. slight distance.",
        "Scenes: mỗi scene = 1 POV character. Scene break required to switch.",
      ],
      avoid: ["Head-hopping within scenes"],
    },
    writer: {
      label: "Ngôi ba giới hạn",
      semanticIntent:
        "Ngôi ba gắn chặt 1 nhân vật per scene. Close access to their thoughts.",
      rules: [
        "Mỗi scene: 1 POV character. Prose filtered through their perception.",
        "Internal thought: access to POV character mind — thoughts, feelings, judgments.",
        "Other characters: observed externally — actions, dialogue, expression. KHÔNG access their thoughts.",
        "Knowledge: limited to what POV character can perceive/know/deduce.",
        "Scene switch: cần scene break (###) hoặc chapter break để change POV.",
        "KHÔNG hidden knowledge leaks — nếu POV character không thể biết, narrative KHÔNG reveal.",
      ],
      avoid: [
        "Head-hopping (switching whose thoughts we access mid-scene)",
        "omniscient interjections",
        "revealing info POV character cannot access",
      ],
    },
    validator: {
      label: "Ngôi ba giới hạn",
      semanticIntent: "Kiểm tra POV discipline — critical.",
      rules: [
        "Flag nếu narrative reveals thoughts of non-POV character in same scene.",
        "Flag nếu information appears mà POV character has no way of knowing.",
        "Flag nếu POV switches within a scene without break.",
        'Flag nếu narrative uses omniscient perspective ("little did he know...").',
      ],
      avoid: ["Flagging intentional scene breaks with POV switch"],
    },
  },
  third_omniscient: {
    bible: {
      label: "Ngôi ba toàn tri",
      semanticIntent:
        "Narrator biết tất cả — có thể access any character thought, any location.",
      rules: [
        "Style guide: specify narrator voice — distant/close, editorial/neutral.",
        "Planning: vì narrator can reveal anything — plan carefully what to withhold for mystery.",
      ],
      avoid: ["Spoiling all mysteries immediately just because narrator can"],
    },
    writer: {
      label: "Ngôi ba toàn tri",
      semanticIntent:
        "Narrator toàn tri — có thể access mọi nhân vật, mọi nơi. Nhưng phải strategic.",
      rules: [
        "Access: có thể show thoughts of any character — BUT be selective for narrative effect.",
        "Voice: narrator có thể comment, foreshadow, have personality.",
        "STRATEGIC RESTRAINT: không spoil mysteries/twists sớm chỉ vì narrator biết.",
        "Cho phép: cutaways to villain, parallel scenes, dramatic irony.",
        "Rhythm: choose when to be close (intimate scene) vs. distant (battlefield overview).",
      ],
      avoid: [
        "Revealing all secrets immediately",
        "spoiling upcoming twists",
        "monotone distance — vary closeness",
      ],
    },
    validator: {
      label: "Ngôi ba toàn tri",
      semanticIntent: "Kiểm tra omniscient usage.",
      rules: [
        "Flag nếu omniscient narrator spoils upcoming mystery/twist too early without purpose.",
        "KHÔNG flag for accessing multiple character thoughts — this is allowed in omniscient.",
      ],
      avoid: ["Flagging head-hopping — it is allowed in omniscient POV"],
    },
  },
};

// ─── PROTAGONIST MORALITY ────────────────────────────────────────────────────

const MORALITY_GUIDANCE: ValueGuidanceMap = {
  righteous: {
    bible: {
      label: "Chính đạo",
      semanticIntent:
        "MC đi theo đạo nghĩa — có principles, protect innocents, honor-driven.",
      rules: [
        "MC có moral code rõ ràng — define what they will/will not do.",
        "Challenges: situations where doing right has severe cost.",
        "Relationships: earn loyalty through virtue, not fear.",
      ],
      avoid: [
        "MC casually commits atrocities",
        "MC uses cruel methods without internal conflict",
      ],
    },
    writer: {
      label: "Chính đạo",
      semanticIntent:
        "MC hành xử có đạo nghĩa — quyết định reflect moral principles.",
      rules: [
        "Decisions: MC chooses hard-right over easy-wrong. Cost is acceptable.",
        "Enemies: defeated but not tortured/humiliated unnecessarily. Mercy when possible.",
        "Allies: protected, respected, MC takes responsibility for group.",
        "Internal thought: moral reasoning present, weighs right vs. expedient.",
        "Growth: can be tempted, can struggle — but ultimately stays on righteous path.",
        "Cho phép: killing in combat/defense, harsh words when justified, anger at injustice.",
      ],
      avoid: [
        "MC tortures helpless enemies",
        "MC betrays allies for power",
        "MC ignores innocent suffering for convenience",
        "MC enjoys cruelty",
      ],
    },
    validator: {
      label: "Chính đạo",
      semanticIntent: "Kiểm tra morality consistency.",
      rules: [
        "Flag nếu MC commits cruel act mà không have extreme justification + internal conflict.",
        "Flag nếu MC enjoys causing suffering.",
        "Flag nếu MC betrays principles without it being a character-development arc moment.",
      ],
      avoid: [
        "Flagging MC for killing enemies in combat — righteous ≠ pacifist",
      ],
    },
  },
  pragmatic: {
    bible: {
      label: "Thực dụng",
      semanticIntent:
        "MC practical — does what works, not bound by rigid morality nhưng not evil.",
      rules: [
        "MC bends rules when needed — but has limits they will not cross.",
        "Decision-making: outcome-focused, not principle-focused.",
        "Relationships: based on mutual benefit but can develop genuine bonds.",
      ],
      avoid: ["Making MC a saint", "making MC casually evil"],
    },
    writer: {
      label: "Thực dụng",
      semanticIntent:
        "MC quyết định dựa trên hiệu quả — flexible, adaptable, not bound by dogma.",
      rules: [
        "Decisions: weighs outcomes, chooses the option that best serves goals.",
        "Methods: can be ruthless when necessary, kind when it costs nothing.",
        "Enemies: dealt with efficiently — no unnecessary mercy, no unnecessary cruelty.",
        "Allies: valued for utility AND genuine connection — not purely transactional.",
        "Internal thought: calculates, assesses, adapts. Less moral agonizing, more strategic thinking.",
        "Có thể deceive, manipulate, or break rules — nhưng for reasons, not randomly.",
      ],
      avoid: [
        "MC agonizing excessively over ethics",
        "MC being purely altruistic",
        "MC being randomly cruel without reason",
      ],
    },
    validator: {
      label: "Thực dụng",
      semanticIntent: "Kiểm tra pragmatic consistency.",
      rules: [
        "Flag nếu MC suddenly becomes purely selfless saint (inconsistent).",
        "Flag nếu MC becomes randomly cruel without pragmatic reason.",
      ],
      avoid: ["Flagging MC for morally grey decisions — pragmatic allows this"],
    },
  },
  antihero: {
    bible: {
      label: "Phản anh hùng",
      semanticIntent:
        "MC uses dark methods for reasons — not evil, but not bound by conventional morality.",
      rules: [
        "MC has internal logic/code — even if society considers it wrong.",
        "Methods: violence, manipulation, deception as standard tools.",
        "Motivation: must exist (revenge, protection, survival) — not random evil.",
        "Relationships: complicated — trust is rare, loyalty fierce when given.",
      ],
      avoid: [
        "MC being generic good guy",
        "MC being purely evil without internal logic",
      ],
    },
    writer: {
      label: "Phản anh hùng",
      semanticIntent:
        "MC sử dụng phương pháp ruthless nhưng có internal logic riêng.",
      rules: [
        "Decisions: ruthless when needed — kill, manipulate, deceive. But with reasons.",
        "Enemies: no mercy expected or given. Can be brutal — nhưng phải efficient, not sadistic for fun.",
        "Allies: few but deep. MC protects their own fiercely.",
        "Internal thought: not consumed by guilt — accepted their path. But STILL has humanity.",
        "Humanity: shown in small moments — kindness to the weak, memory of past, rare vulnerability.",
        "QUAN TRỌNG: Antihero ≠ villain. MC phải have SOMETHING reader can root for.",
      ],
      mustInclude: [
        "Occasional moment showing MC humanity/vulnerability mỗi arc",
      ],
      avoid: [
        "MC being a saint",
        "MC being complete monster with no redeeming quality",
        "random cruelty against innocents for no reason",
      ],
    },
    validator: {
      label: "Phản anh hùng",
      semanticIntent: "Kiểm tra antihero balance.",
      rules: [
        "Flag nếu MC behaves purely good (inconsistent with antihero).",
        "Flag nếu MC becomes pure evil with no internal logic or remaining humanity.",
        "KHÔNG flag ruthless actions that have clear reason.",
      ],
      avoid: ["Flagging MC for violence/manipulation — antihero allows this"],
    },
  },
  villain: {
    bible: {
      label: "Phản diện (Villain protagonist)",
      semanticIntent:
        "MC là villain — selfish, ambitious, willing to do terrible things. Nhưng narratively coherent.",
      rules: [
        "MC motivation: ambition, power, control, revenge, ideology — SOMETHING drives them.",
        "MC has competence — villain protagonist must be interesting to follow.",
        "World: MC faces opposition — not everyone is weaker/dumber.",
        "QUAN TRỌNG: Villain ≠ random evil. MC PHẢI have internal consistency and charisma.",
      ],
      avoid: [
        "MC being boring/random evil",
        "MC having no opposition",
        "MC being secretly good",
      ],
    },
    writer: {
      label: "Phản diện",
      semanticIntent:
        "MC là villain — cruel, ambitious, manipulative. Reader follows for competence and audacity.",
      rules: [
        "Decisions: serve MC self-interest primarily. Others are tools or obstacles.",
        "Methods: ANY method acceptable if it serves MC goals — poison, betrayal, mass harm.",
        "Internal thought: cold calculation, ambition, occasional satisfaction at others' suffering.",
        "Charisma: MC must be INTERESTING — witty, competent, with flair. Boring evil = bad writing.",
        "NARRATIVELY COHERENT: MC does terrible things for REASONS. Pattern should be understandable.",
        "Opposition: MC faces real challenges — not effortless domination.",
      ],
      mustInclude: [
        "Clear MC motivation driving actions",
        "opposition that challenges MC",
      ],
      avoid: [
        "Random pointless cruelty that does not serve goals",
        "MC being dumb/incompetent",
        "MC secretly wanting to be good",
      ],
    },
    validator: {
      label: "Phản diện",
      semanticIntent: "Kiểm tra villain protagonist coherence.",
      rules: [
        "Flag nếu MC suddenly acts good without character reason.",
        "Flag nếu MC cruelty is random/purposeless (not serving any goal).",
        "Flag nếu MC has no opposition (no challenge = boring).",
        "KHÔNG flag MC for being evil — that is the point.",
      ],
      avoid: [
        "Flagging evil/cruel actions by MC — villain protagonist is intended",
      ],
    },
  },
};

// ─── EXPORT: Guidance Resolver ───────────────────────────────────────────────

const GUIDANCE_MAPS: Record<string, ValueGuidanceMap> = {
  tone: TONE_GUIDANCE,
  pacing: PACING_GUIDANCE,
  mainConflictType: MAIN_CONFLICT_GUIDANCE,
  powerSystemStyle: POWER_SYSTEM_STYLE_GUIDANCE,
  worldEra: WORLD_ERA_GUIDANCE,
  romanceLevel: ROMANCE_LEVEL_GUIDANCE,
  comedyLevel: COMEDY_LEVEL_GUIDANCE,
  darkLevel: DARK_LEVEL_GUIDANCE,
  pov: POV_GUIDANCE,
  protagonistMorality: MORALITY_GUIDANCE,
};

/**
 * Resolve guidance for a specific option + value + target.
 * Returns undefined if no specific guidance exists for this combination.
 */
export function getOptionGuidance(
  optionKey: string,
  value: string | undefined,
  target: PromptTarget,
): OptionGuidance | undefined {
  if (!value) return undefined;
  const map = GUIDANCE_MAPS[optionKey];
  if (!map) return undefined;
  const valueMap = map[value];
  if (!valueMap) return undefined;
  return valueMap[target];
}

/**
 * Get all guidance entries for a set of story options and a specific target.
 * Returns an array of { optionKey, guidance } pairs.
 */
export function getAllGuidanceForTarget(
  options: Record<string, string | undefined>,
  target: PromptTarget,
): { optionKey: string; guidance: OptionGuidance }[] {
  const results: { optionKey: string; guidance: OptionGuidance }[] = [];
  for (const [key, value] of Object.entries(options)) {
    if (!value) continue;
    const g = getOptionGuidance(key, value, target);
    if (g) results.push({ optionKey: key, guidance: g });
  }
  return results;
}
