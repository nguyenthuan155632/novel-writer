import { describe, it, expect } from "vitest";
import { makeForbiddenMoveCheck } from "../../../src/validators/deterministic/forbidden-move.ts";
import type { CheckInput } from "../../../src/validators/deterministic/types.ts";

function makeInput(
  content: string,
  overrides: {
    storyOptionsBlock?: string;
    genreContract?: string;
    sagaSummary?: string;
    arcPlantedSeeds?: any[];
    packet?: any;
  } = {},
): CheckInput {
  return {
    content,
    context: {
      hot: {
        systemRules: "",
        bibleCompact: "",
        styleGuide: "",
        powerSystem: "",
        powerSystemKind: "",
        genreContract: overrides.genreContract ?? "",
        personalityContract: "",
        storyOptionsBlock: overrides.storyOptionsBlock ?? "",
        styleFewShots: [],
      },
      warm: {
        sagaSummary: overrides.sagaSummary ?? "",
        arcSummary: "",
        activeCharacters: [],
        arcOpenThreads: [],
        arcPlantedSeeds: overrides.arcPlantedSeeds ?? [],
      },
      cold: {
        recentSummaries: [],
        retrievedFacts: [],
        retrievedPastChapters: [],
        seedsToPlantNow: [],
        timelineEvents: [],
        pendingCanonUpdates: [],
        packet: overrides.packet ?? ({} as any),
      },
      meta: {
        storyId: "s1",
        chapterNumber: 1,
        arcId: "a1",
        hotHash: "",
        warmHash: "",
        sagaProgressPercent: null,
        arcProgressPercent: null,
        sagaProgressSource: null,
        arcProgressSource: null,
        sagaRange: null,
        arcRange: null,
        sagaPhase: null,
        arcPhase: null,
        activeTurningPoint: null,
        targetInputBudget: 6000,
      },
    },
    chapter: { chapterNumber: 1 },
    story: { id: "s1" },
    canon: {
      deadCharacterNames: [],
      knownCharacterNames: [],
      knownLocationNames: [],
      knownBloodlineNames: [],
      lockedFacts: [],
      realmByCharacter: {},
    },
  };
}

describe("makeForbiddenMoveCheck", () => {
  it("passes when no forbidden rules are violated", () => {
    const check = makeForbiddenMoveCheck(
      "Không cho phép resurrection\nKhông cho phép time travel",
    );
    const result = check.run(makeInput("Lam Trach luyện kiếm."));
    expect(result.pass).toBe(true);
  });

  it("fails when content contains forbidden rule text", () => {
    const check = makeForbiddenMoveCheck(
      "Không cho phép resurrection\nKhông cho phép time travel",
    );
    const result = check.run(
      makeInput("Nhân vật sử dụng resurrection phép thuật."),
    );
    expect(result.pass).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("fails on modern media phrasing in fantasy-era prose", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput("Cảm giác như vừa thoát khỏi một bộ phim kinh dị do đạo diễn điên dựng lên, hệt tiểu thuyết có cốt truyện lạ về nhân vật phản diện."),
    );
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("thuật ngữ hiện đại"),
        expect.stringContaining("nhân vật phản diện"),
        expect.stringContaining("tiểu thuyết"),
        expect.stringContaining("cốt truyện"),
      ]),
    );
  });

  it("fails on modern slang in fantasy-era prose", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput("Nghe như tên một quán trà sang chảnh ở phố bản đồ vậy, còn mực thì giống xì dầu và nước tương. Nếu là quảng cáo bánh kem thì càng tệ."),
    );
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("sang chảnh"),
        expect.stringContaining("xì dầu"),
        expect.stringContaining("nước tương"),
        expect.stringContaining("quảng cáo"),
        expect.stringContaining("bánh kem"),
      ]),
    );
  });

  it("flags modern food only in classical or historical contexts without hard-blocking common address pronouns", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const content = '— Cậu Triều, tôi đến lấy gạo.\nHắn mua một ổ bánh mì ở bến.';

    const classical = check.run(
      makeInput(content, {
        storyOptionsBlock: "World era: Cổ đại",
        genreContract: "Tone guidance: Cổ phong.",
      }),
    );
    expect(classical.issues).toEqual(
      expect.arrayContaining([expect.stringContaining("bánh mì")]),
    );
    expect(classical.issues).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("tôi"),
        expect.stringContaining("cậu"),
      ]),
    );

    expect(check.run(makeInput(content)).issues).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("bánh mì"),
        expect.stringContaining("tôi"),
        expect.stringContaining("cậu"),
      ]),
    );
  });

  it("flags early quiet setup content that violates packet forbidden boundary", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput("Bà lão đưa tờ giấy ghi món nợ cũ của người đã mất trong sổ rồi bảo hắn lên phường xin căn cước.", {
        storyOptionsBlock: "World era: Cổ đại | POV: Ngôi ba giới hạn",
        packet: {
          chapterPurpose: "slice_of_life",
          endingMode: "quiet_transition",
          forbiddenMoves: [
            "Không đưa yếu tố huyền bí, chữ tự đổi, người mất tích hay nợ cũ.",
          ],
        },
      }),
    );

    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("ranh giới chương hiện tại"),
        expect.stringContaining("nợ cũ"),
        expect.stringContaining("người đã mất gắn với manh mối"),
        expect.stringContaining("căn cước"),
      ]),
    );
  });

  it("does not flag ordinary widow or bereavement texture as early mystery boundary", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput("Bà góa nói chồng mất năm trước, nhận suất gạo lẻ rồi lặng lẽ đi về.", {
        storyOptionsBlock: "World era: Cổ đại | POV: Ngôi ba giới hạn",
        packet: {
          chapterPurpose: "slice_of_life",
          endingMode: "quiet_transition",
          forbiddenMoves: [
            "Không đưa yếu tố huyền bí, chữ tự đổi, người mất tích hay nợ cũ.",
          ],
        },
      }),
    );

    expect(result.pass).toBe(true);
  });

  it("flags future turning points before their planned chapter using saga summary anchors", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const baseInput = makeInput(
      "Lâm Triều tìm thấy cuốn sổ cũ sau bức tường và quyết định đi gặp cụ Tú.",
      {
        storyOptionsBlock: "World era: Cổ đại | POV: Ngôi ba giới hạn",
      },
    );
    const withSaga = check.run({
      ...baseInput,
      context: {
        ...baseInput.context,
        warm: {
          ...baseInput.context.warm,
          sagaSummary: [
            "Turning points (nên theo thứ tự):",
            "  1. Phát hiện chữ tự đổi trong sổ gạo (chương 3)",
            "  2. Gặp cụ Tú - người biết chuyện xưa (chương 12)",
            "  3. Tìm thấy cuốn sổ cũ trong kho nghĩa thương (chương 25)",
          ].join("\n"),
        },
      },
      chapter: { chapterNumber: 8 },
    });

    expect(withSaga.pass).toBe(false);
    expect(withSaga.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("turning point tương lai"),
        expect.stringContaining("cụ Tú"),
      ]),
    );
  });

  it("does not block a current planned document clue only because a future artifact turning point exists", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput(
        "Hắn phát hiện vết nứt trên tường kho, mở ra một ngăn bí mật. Bên trong có gói vải đựng tập giấy cũ ghi lại vụ án dưới sông.",
        {
          storyOptionsBlock: "World era: Cổ đại | POV: Ngôi ba giới hạn",
          sagaSummary: [
            "Turning points (nên theo thứ tự):",
            "  1. Tìm thấy cuốn sổ cũ trong kho nghĩa thương (chương 25)",
          ].join("\n"),
        },
      ),
    );

    expect(result.pass).toBe(true);
  });

  it("does not flag routine ledger and warehouse texture as artifact payoff", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput(
        "Lâm Triều ngồi trong kho nghĩa thương, ghi chép sổ gạo, cân từng đấu gạo cho dân phố rồi khóa cửa lúc chiều xuống.",
        {
          storyOptionsBlock: "World era: Cổ đại | POV: Ngôi ba giới hạn",
          sagaSummary: [
            "Turning points (nên theo thứ tự):",
            "  1. Tìm thấy cuốn sổ cũ trong kho nghĩa thương (chương 25)",
          ].join("\n"),
        },
      ),
    );

    expect(result.pass).toBe(true);
  });

  it("does not flag old rice ledgers as a future discovery turning point by exact phrase alone", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput(
        "Hắn sắp xếp ba cuốn sổ gạo cũ bên trái, cuốn sổ mới bên phải, rồi tiếp tục cân gạo cho dân phố.",
        {
          storyOptionsBlock: "World era: Cổ đại | POV: Ngôi ba giới hạn",
          sagaSummary: [
            "Turning points (nên theo thứ tự):",
            "  1. Tìm thấy cuốn sổ cũ trong kho nghĩa thương (chương 25)",
          ].join("\n"),
        },
      ),
    );

    expect(result.pass).toBe(true);
  });

  it("does not treat routine reading of warehouse ledgers as hidden-artifact discovery", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput(
        "Trong kho nghĩa thương, Lâm Triều đọc từng dòng của cuốn sổ cũ, phát hiện một sai sót nhỏ trong số gạo tồn rồi đối chiếu với biên lai.",
        {
          storyOptionsBlock: "World era: Cổ đại | POV: Ngôi ba giới hạn",
          sagaSummary: [
            "Turning points (nên theo thứ tự):",
            "  1. Tìm thấy cuốn sổ cũ trong kho nghĩa thương (chương 25)",
          ].join("\n"),
        },
      ),
    );

    expect(result.pass).toBe(true);
  });

  it("flags long-payoff seed turned into evidence discovery too early", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput(
        "Trong kho, Lâm Triều tìm thấy một hòm gỗ niêm phong, bên trong là tài liệu cũ và bản ghi về vụ mất tích.",
        {
          storyOptionsBlock: "World era: Cổ đại | POV: Ngôi ba giới hạn",
          arcPlantedSeeds: [
            {
              id: "seed-1",
              seedText: "Một vết nứt trên tường nơi có thể ẩn giấu tài liệu cũ.",
              payoffDescription: "Payoff at ch 35: mở ngăn bí mật và đọc tài liệu cũ.",
              plantWindowStart: 1,
              plantWindowEnd: 10,
              payoffChapter: 35,
              status: "planted",
            },
          ],
        },
      ),
    );

    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("payoff seed dài hạn"),
      ]),
    );
  });

  it("fails on modern English travel phrasing in fantasy-era prose", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput("Cái tên nghe như một resort nghỉ dưỡng."),
    );
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("resort"),
      ]),
    );
  });

  it("fails on modern English and gaming phrasing in fantasy-era prose", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput("Ta không làm free bao giờ. CLB khách VIP bị stress và PTSD trong một dilemma, nhưng vẫn nói okay. Uh, kia là một boss, một sếp cuối và cấp cuối của ảo ảnh, còn bản đồ này như GPS. Ngươi vừa jinx nó rồi. Đừng troll thực thể cổ xưa, đừng nói về vibe cổ xưa."),
    );
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("free"),
        expect.stringContaining("CLB"),
        expect.stringContaining("VIP"),
        expect.stringContaining("stress"),
        expect.stringContaining("PTSD"),
        expect.stringContaining("dilemma"),
        expect.stringContaining("okay"),
        expect.stringContaining("Uh"),
        expect.stringContaining("jinx"),
        expect.stringContaining("troll"),
        expect.stringContaining("vibe"),
        expect.stringContaining("boss"),
        expect.stringContaining("sếp cuối"),
        expect.stringContaining("cấp cuối"),
        expect.stringContaining("GPS"),
      ]),
    );
  });

  it("fails on modern sport, visual-effect, and service phrasing", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput("Hắn mệt như chạy marathon, nói đây chỉ là hiệu ứng ánh sáng, tư vấn miễn phí, khử mùi, đăng ký hội viên, giảm giá, lãi suất, phần trăm, thế chấp, phiếu số thứ tự, danh sách chờ, bảo hành, lịch hẹn, lịch trình, lịch nghỉ ngơi, ngủ nướng, dịch vụ, du lịch, tour du lịch, khách sạn năm sao có minibar, TV và phao cứu sinh, review một sao, đánh giá một sao, hợp đồng, công văn, dự án, gia hạn, ngày làm việc, đồng hồ báo thức, bảo hiểm, tiền lương, lương thế nào, hộ khẩu, thực đơn, quý khách, trả góp, không thu phí, chuyên nghiệp, cao cấp, nội thất, hàng xịn, giấy tờ tùy thân, vé vào cửa, chuẩn không cần chỉnh, giảm việc, và ngược chiều kim đồng hồ."),
    );
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("marathon"),
        expect.stringContaining("hiệu ứng"),
        expect.stringContaining("miễn phí"),
        expect.stringContaining("khử mùi"),
        expect.stringContaining("đăng ký hội viên"),
        expect.stringContaining("giảm giá"),
        expect.stringContaining("lãi suất"),
        expect.stringContaining("phần trăm"),
        expect.stringContaining("thế chấp"),
        expect.stringContaining("phiếu số thứ tự"),
        expect.stringContaining("danh sách chờ"),
        expect.stringContaining("bảo hành"),
        expect.stringContaining("lịch hẹn"),
        expect.stringContaining("lịch trình"),
        expect.stringContaining("lịch nghỉ ngơi"),
        expect.stringContaining("ngủ nướng"),
        expect.stringContaining("dịch vụ"),
        expect.stringContaining("du lịch"),
        expect.stringContaining("tour du lịch"),
        expect.stringContaining("khách sạn"),
        expect.stringContaining("năm sao"),
        expect.stringContaining("minibar"),
        expect.stringContaining("TV"),
        expect.stringContaining("phao cứu sinh"),
        expect.stringContaining("review một sao"),
        expect.stringContaining("đánh giá một sao"),
        expect.stringContaining("hợp đồng"),
        expect.stringContaining("công văn"),
        expect.stringContaining("dự án"),
        expect.stringContaining("gia hạn"),
        expect.stringContaining("ngày làm việc"),
        expect.stringContaining("đồng hồ báo thức"),
        expect.stringContaining("bảo hiểm"),
        expect.stringContaining("tiền lương"),
        expect.stringContaining("lương thế nào"),
        expect.stringContaining("hộ khẩu"),
        expect.stringContaining("thực đơn"),
        expect.stringContaining("quý khách"),
        expect.stringContaining("trả góp"),
        expect.stringContaining("không thu phí"),
        expect.stringContaining("chuyên nghiệp"),
        expect.stringContaining("cao cấp"),
        expect.stringContaining("nội thất"),
        expect.stringContaining("hàng xịn"),
        expect.stringContaining("giấy tờ tùy thân"),
        expect.stringContaining("vé vào cửa"),
        expect.stringContaining("chuẩn không cần chỉnh"),
        expect.stringContaining("giảm việc"),
        expect.stringContaining("ngược chiều kim đồng hồ"),
      ]),
    );
  });

  it("fails on modern product-feature phrasing", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput("Vòng tròn mực xanh có một tính năng phụ."),
    );
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("tính năng"),
      ]),
    );
  });

  it("fails on modern ideology phrasing in fantasy-era prose", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput("Ngươi vừa nói một câu cực kỳ nữ quyền đấy."),
    );
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("nữ quyền"),
      ]),
    );
  });

  it("fails on explicit end-of-chapter markers", () => {
    const check = makeForbiddenMoveCheck("");
    const result = check.run(makeInput("Kết thúc chương 48."));
    const arcResult = check.run(makeInput("Kết thúc một arc. Mở ra một bản đồ."));
    expect(result.pass).toBe(false);
    expect(arcResult.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("kết thúc chương"),
      ]),
    );
    expect(arcResult.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("arc"),
      ]),
    );
  });

  it("fails on modern pop-culture version phrasing", () => {
    const check = makeForbiddenMoveCheck("");
    const result = check.run(makeInput("Bản đồ Godzilla phiên bản cổ phong."));
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Godzilla"),
        expect.stringContaining("phiên bản"),
      ]),
    );
  });

  it("fails on leaked title headers and next-chapter teasers", () => {
    const check = makeForbiddenMoveCheck("");
    const result = check.run(
      makeInput("**TITLE: MỰC CÓ TÂM TRẠNG**\n\nChờ xem Chương 52…"),
    );
    const contextLeak = check.run(
      makeInput("Nội dung chương.\n# BIBLE (tóm tắt)\nKhông được xuất hiện."),
    );
    expect(result.pass).toBe(false);
    expect(contextLeak.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("TITLE header"),
        expect.stringContaining("chờ xem chương"),
      ]),
    );
    expect(contextLeak.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("context header leak"),
      ]),
    );
  });

  it("fails on explicit time-travel escape moves", () => {
    const check = makeForbiddenMoveCheck("");
    const result = check.run(
      makeInput("Hắn vẽ một vết nứt thời gian, rồi trở về quá khứ. Đó chẳng khác gì du hành thời gian."),
    );
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("vết nứt thời gian"),
        expect.stringContaining("trở về quá khứ"),
        expect.stringContaining("du hành thời gian"),
      ]),
    );
  });

  it("fails on direct modern mày pronoun while allowing facial mày phrases", () => {
    const check = makeForbiddenMoveCheck("");
    const direct = check.run(makeInput("Có tâm trạng hả mày?"));
    const selfTalk = check.run(makeInput("Mày đã vẽ sai hàng trăm lần rồi."));
    const dialogueStart = check.run(makeInput('"Mày phun ta đấy hả?"'));
    const dialogueMiddle = check.run(makeInput('"Không ngờ mày còn biết vẽ."'));
    const facial = check.run(makeInput("Lộ Nhàn nhíu mày."));
    const facialBeforeDialogue = check.run(makeInput('Kẻ phản bội cau mày. "Ngươi vẽ ghế để làm gì?"'));
    const facialAfterDialogue = check.run(makeInput('"Ghê tởm?" Kẻ phản bội nhướn mày. "Ngươi nghĩ ta quan tâm?"'));
    const idiomInDialogue = check.run(makeInput('"Ngươi không như hắn, lúc nào cũng mặt nặng mày nhẹ."'));
    expect(direct.pass).toBe(false);
    expect(selfTalk.pass).toBe(false);
    expect(dialogueStart.pass).toBe(false);
    expect(dialogueMiddle.pass).toBe(false);
    expect(direct.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("hả mày"),
      ]),
    );
    expect(selfTalk.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("mày"),
      ]),
    );
    expect(dialogueStart.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("mày"),
      ]),
    );
    expect(dialogueMiddle.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("mày"),
      ]),
    );
    expect(facial.pass).toBe(true);
    expect(facialBeforeDialogue.pass).toBe(true);
    expect(facialAfterDialogue.pass).toBe(true);
    expect(idiomInDialogue.pass).toBe(true);
  });

  it("does not hard-block common Vietnamese pronouns in pre-modern third-person prose", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput("Lộ Nhàn nói: \"Tôi không từ chối thử thách này.\"", {
        storyOptionsBlock: "World era: Cổ đại | POV: Ngôi ba giới hạn",
      }),
    );
    expect(result.pass).toBe(true);
  });

  it("does not hard-block cậu address in pre-modern third-person prose", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const result = check.run(
      makeInput("Vân Yên nói: \"Nó sẽ nuốt chửng cậu. Hãy sống.\"", {
        storyOptionsBlock: "World era: Dị giới | POV: Ngôi ba giới hạn",
      }),
    );

    expect(result.pass).toBe(true);
  });

  it("allows lexical cậu nhóc and does not hard-block cậu address", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const lexical = check.run(
      makeInput("Khi còn là một cậu nhóc rụt rè, hắn từng sợ Tàng Đồ Các.", {
        storyOptionsBlock: "World era: Dị giới | POV: Ngôi ba giới hạn",
      }),
    );
    const pronoun = check.run(
      makeInput("Vân Yên nói: \"Cậu phải chạy ngay.\"", {
        storyOptionsBlock: "World era: Dị giới | POV: Ngôi ba giới hạn",
      }),
    );

    expect(lexical.pass).toBe(true);
    expect(pronoun.pass).toBe(true);
  });

  it("allows lexical tôi luyện and does not hard-block first-person tôi in dialogue", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const trained = check.run(
      makeInput("Bản năng sinh tồn đã được tôi luyện qua vô số lần suýt chết.", {
        storyOptionsBlock: "World era: Dị giới | POV: Ngôi ba giới hạn",
      }),
    );
    const pronoun = check.run(
      makeInput("Lộ Nhàn nói: \"Tôi sẽ thử.\"", {
        storyOptionsBlock: "World era: Dị giới | POV: Ngôi ba giới hạn",
      }),
    );

    expect(trained.pass).toBe(true);
    expect(pronoun.pass).toBe(true);
  });

  it("allows lexical trẻ em and does not hard-block em address", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const children = check.run(
      makeInput("Trẻ em chạy nhảy trên cánh đồng.", {
        storyOptionsBlock: "World era: Dị giới | POV: Ngôi ba giới hạn",
      }),
    );
    const pronoun = check.run(
      makeInput("Lộ Nhàn hỏi: \"Em là ai?\"", {
        storyOptionsBlock: "World era: Dị giới | POV: Ngôi ba giới hạn",
      }),
    );

    expect(children.pass).toBe(true);
    expect(pronoun.pass).toBe(true);
  });

  it("allows lexical anh hùng and does not hard-block anh address", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const hero = check.run(
      makeInput("Lộ Nhàn chưa bao giờ tự nhận mình là anh hùng.", {
        storyOptionsBlock: "World era: Dị giới | POV: Ngôi ba giới hạn",
      }),
    );
    const pronoun = check.run(
      makeInput("Lộ Nhàn nói: \"Anh đừng lại gần.\"", {
        storyOptionsBlock: "World era: Dị giới | POV: Ngôi ba giới hạn",
      }),
    );

    expect(hero.pass).toBe(true);
    expect(pronoun.pass).toBe(true);
  });

  it("allows lexical anh em and does not hard-block anh address", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const brothers = check.run(
      makeInput("Bọn ta đã từng là anh em, giờ nên cùng nhau chiến đấu.", {
        storyOptionsBlock: "World era: Dị giới | POV: Ngôi ba giới hạn",
      }),
    );
    const pronoun = check.run(
      makeInput("Lộ Nhàn nói: \"Anh đừng lại gần.\"", {
        storyOptionsBlock: "World era: Dị giới | POV: Ngôi ba giới hạn",
      }),
    );

    expect(brothers.pass).toBe(true);
    expect(pronoun.pass).toBe(true);
  });

  it("fails on unbalanced Vietnamese dialogue quote marks", () => {
    const check = makeForbiddenMoveCheck("");
    const result = check.run(makeInput("Lộ Nhàn hỏi: “Vậy là ngươi muốn bị nhốt?"));
    expect(result.pass).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("dấu ngoặc kép tiếng Việt không cân bằng"),
      ]),
    );
  });

  it("allows modern pronouns for first-person or modern stories", () => {
    const check = makeForbiddenMoveCheck("Không dùng công nghệ hiện đại");
    const firstPerson = check.run(
      makeInput("Tôi bước qua cánh cửa.", {
        storyOptionsBlock: "World era: Cổ đại | POV: Ngôi nhất",
      }),
    );
    const modern = check.run(
      makeInput("Tôi bước qua cánh cửa.", {
        storyOptionsBlock: "World era: Hiện đại | POV: Ngôi ba giới hạn",
      }),
    );
    expect(firstPerson.pass).toBe(true);
    expect(modern.pass).toBe(true);
  });
});
