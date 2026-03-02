export type PlanStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PlanStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PlanStep {
  id: string;
  description: string;
  status: PlanStepStatus;
  output?: string;
  dependencies: string[];
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  sourceSpecIds: string[];
  createdAt: string;
  status: PlanStatus;
}
