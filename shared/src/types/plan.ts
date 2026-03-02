export interface PlanStep {
  id: string;
  order: number;
  description: string;
  specIds?: string[];
  output?: string;
  status?: 'pending' | 'in_progress' | 'complete' | 'failed';
}

export interface Plan {
  id: string;
  title: string;
  steps: PlanStep[];
  createdAt: string;
  createdBy: string;
  version: number;
}
