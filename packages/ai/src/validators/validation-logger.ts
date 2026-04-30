import type { DeterministicValidatorResult } from './deterministic/runner.js';
import type { LlmValidatorOutput } from '../schemas/validator.js';

export interface ValidationReportInput {
  storyId: string;
  chapterNumber: number;
  chapterTitle?: string;
  wordCount?: number;
  deterministicResult?: DeterministicValidatorResult;
  llmResult?: LlmValidatorOutput;
  timestamp?: Date;
}

function padEnd(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function severityIcon(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🔵';
    default:
      return '⚪';
  }
}

export function formatValidationReport(input: ValidationReportInput): string {
  const lines: string[] = [];
  const ts = input.timestamp ?? new Date();

  lines.push('================================================================================');
  lines.push('                         BÁO CÁO KIỂM TRA CHƯƠNG');
  lines.push('================================================================================');
  lines.push('');
  lines.push(`Thời gian:     ${ts.toISOString()}`);
  lines.push(`Truyện:        ${input.storyId}`);
  lines.push(`Chương:        #${input.chapterNumber}`);
  if (input.chapterTitle) lines.push(`Tiêu đề:       ${input.chapterTitle}`);
  if (input.wordCount != null) lines.push(`Tổng từ:       ${input.wordCount}`);
  lines.push('');

  // Deterministic section
  if (input.deterministicResult) {
    lines.push('--------------------------------------------------------------------------------');
    lines.push('KIỂM TRA TỰ ĐỘNG (DETERMINISTIC)');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('');

    const det = input.deterministicResult;
    if (det.checks.length === 0) {
      lines.push('  (không có kiểm tra nào được chạy)');
    } else {
      for (const check of det.checks) {
        const status = check.pass ? 'PASSED' : 'FAILED';
        const icon = check.pass ? '✓' : '✗';
        lines.push(
          `  [${icon}] ${padEnd(check.id, 20)} (${padEnd(check.severity, 8)}) ${status}`
        );
        for (const issue of check.issues) {
          lines.push(`      → ${issue}`);
        }
      }

      const failed = det.checks.filter(c => !c.pass);
      const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
      for (const c of failed) {
        bySeverity[c.severity as keyof typeof bySeverity]++;
      }
      lines.push('');
      lines.push(
        `  Tóm tắt: ${det.checks.length - failed.length}/${det.checks.length} passed` +
          ` (${failed.length} failed: ${bySeverity.critical} critical, ${bySeverity.high} high, ${bySeverity.medium} medium, ${bySeverity.low} low)`
      );
      if (det.shortCircuited) {
        lines.push('  ⚠️  Đã dừng sớm do phát hiện lỗi critical.');
      }
    }
    lines.push('');
  }

  // LLM Validator section
  if (input.llmResult) {
    lines.push('--------------------------------------------------------------------------------');
    lines.push('KIỂM TRA BỞI LLM VALIDATOR');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('');

    const llm = input.llmResult;
    const overall = llm.pass ? 'PASSED' : 'FAILED';
    lines.push(`  Tổng quan:  ${overall}`);
    if (llm.summary) {
      lines.push(`  Nhận xét:   ${llm.summary}`);
    }
    lines.push('');

    if (llm.issues.length > 0) {
      lines.push('  Chi tiết lỗi:');
      for (const issue of llm.issues) {
        lines.push(
          `    ${severityIcon(issue.severity)} [${issue.severity.toUpperCase()}] ${issue.code}`
        );
        lines.push(`      → ${issue.message}`);
        lines.push('');
      }
    } else if (!llm.pass) {
      lines.push('  (không có issue chi tiết nhưng tổng quan là failed)');
    }
    lines.push('');
  }

  // Overall
  const detFailed = input.deterministicResult ? !input.deterministicResult.pass : false;
  const llmFailed = input.llmResult ? !input.llmResult.pass : false;
  const overallFailed = detFailed || llmFailed;

  lines.push('--------------------------------------------------------------------------------');
  lines.push(`KẾT QUẢ CUỐI CÙNG: ${overallFailed ? 'FAILED ❌' : 'PASSED ✓'}`);
  lines.push('--------------------------------------------------------------------------------');
  lines.push('');

  return lines.join('\n');
}
