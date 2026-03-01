export enum PlanStepStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface PlanStep {
  id: string;
  order: number;
  title: string;
  description: string;
  taskId?: string;
  status: PlanStepStatus;
  outputArtifacts?: string[];
  dependsOnStepIds?: string[];
  agentInstructions?: string;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  specIds: string[];
  steps: PlanStep[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
  commitHash?: string;
}

export interface GeneratePlanDto {
  rootSpecIds: string[];
  depth?: number;
  title?: string;
  description?: string;
}
