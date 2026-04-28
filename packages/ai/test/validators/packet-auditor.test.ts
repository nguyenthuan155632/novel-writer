import { describe, expect, it } from 'vitest';
import { auditPacket } from '../../src/validators/packet-auditor.ts';

const basePacket = {
  chapterNumber: 5,
  goal: 'g',
  requiredEvents: [{ description: 'fight bandit' }],
  charactersPresent: ['Lam Trach'],
  conflict: 'fight bandits in forest',
  cliffhanger: 'mysterious figure appears',
  forbiddenMoves: [],
};

const aliveChar = { name: 'Lam Trach', status: 'alive', currentRealm: 'luyện khí' };

describe('auditPacket', () => {
  it('passes valid packet', () => {
    const r = auditPacket({ packet: basePacket as any, characters: [aliveChar], forbiddenRules: '', duePlantedSeeds: [] });
    expect(r.pass).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it('flags dead character', () => {
    const r = auditPacket({ packet: basePacket as any, characters: [{ ...aliveChar, status: 'dead' }], forbiddenRules: '', duePlantedSeeds: [] });
    expect(r.pass).toBe(false);
    expect(r.issues[0]!.code).toBe('dead_character');
  });

  it('flags missing cliffhanger', () => {
    const r = auditPacket({ packet: { ...basePacket, cliffhanger: '' } as any, characters: [aliveChar], forbiddenRules: '', duePlantedSeeds: [] });
    expect(r.pass).toBe(false);
    expect(r.issues.find(i => i.code === 'missing_cliffhanger')).toBeTruthy();
  });

  it('flags unresolved due seed at last-window-chapter', () => {
    const r = auditPacket({
      packet: basePacket as any,
      characters: [aliveChar],
      forbiddenRules: '',
      duePlantedSeeds: [{ id: 'seed-1', seedText: 'red figure', plantWindowEnd: 5 }],
    });
    expect(r.pass).toBe(false);
    expect(r.issues.find(i => i.code === 'unresolved_due_seed')!.severity).toBe('critical');
  });
});