import { z } from 'zod';

export const EntryStateSchema = z.object({
  locationId: z.string().optional(),
  timestamp: z.string().optional(),
  povCharacter: z.object({
    name: z.string(),
    physicalCondition: z.string().optional(),
    emotionalState: z.string().optional(),
    immediateGoal: z.string().optional(),
    activeKnowledge: z.array(z.string()).default([]),
  }),
});

export type EntryState = z.infer<typeof EntryStateSchema>;