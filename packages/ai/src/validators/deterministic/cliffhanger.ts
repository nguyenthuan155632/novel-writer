import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

export const cliffhangerCheck: DeterministicCheck = {
  id: 'cliffhanger',
  severity: 'low',
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const content = input.content.trim();
    const lastParagraph = content.split(/\n\n+/).pop() ?? '';
    const lastSentence = lastParagraph.split(/[.!?。！？]/).filter(Boolean).pop() ?? '';

    const cliffhangerIndicators = [
      'nhưng', 'thì', 'đột nhiên', 'bỗng nhiên', 'vừa rồi',
      'chưa kịp', 'phía trước', 'bóng hình', 'giọng nói',
      'tiếng', 'ánh mắt', 'thấy', 'nhận ra',
    ];

    if (lastSentence.length < 10) {
      issues.push('Chương kết thúc quá đột ngột, thiếu câu kết.');
    } else {
      const hasCliffhanger = cliffhangerIndicators.some(ind => lastParagraph.toLowerCase().includes(ind));
      const isFinalChapter = input.chapter.chapterNumber >= (input.context.warm.arcPlantedSeeds.find(s => s.payoffChapter)?.payoffChapter ?? 999);
      if (!hasCliffhanger && !isFinalChapter) {
        issues.push('Chương thiếu cliffhanger — câu cuối không tạo sự tò mò.');
      }
    }

    return { pass: issues.length === 0, issues };
  },
};