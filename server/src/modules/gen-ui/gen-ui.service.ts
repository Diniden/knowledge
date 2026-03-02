import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';

export interface GenUiProject {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description: string;
  entryPoint: string;
  dependencies: string[];
  status: 'building' | 'ready' | 'error';
  outputPath?: string;
  buildErrors?: string[];
  createdAt: string;
  updatedAt: string;
}

const ALLOWED_DEPENDENCIES = [
  'react',
  'react-dom',
  'framer-motion',
  'recharts',
  'react-hook-form',
  'lodash-es',
];

@Injectable()
export class GenUiService {
  private readonly logger = new Logger(GenUiService.name);
  private registry = new Map<string, GenUiProject>();

  constructor(private readonly configService: ConfigService) {}

  async register(entry: {
    projectId: string;
    userId: string;
    name: string;
    description: string;
    entryPoint: string;
    dependencies: string[];
  }): Promise<string> {
    const now = new Date().toISOString();
    const id = `genui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const project: GenUiProject = {
      id,
      projectId: entry.projectId,
      userId: entry.userId,
      name: entry.name,
      description: entry.description,
      entryPoint: entry.entryPoint,
      dependencies: entry.dependencies,
      status: 'ready',
      createdAt: now,
      updatedAt: now,
    };

    this.registry.set(id, project);
    this.logger.log(`Registered gen-ui project: ${id} (${entry.name})`);
    return id;
  }

  async get(id: string): Promise<GenUiProject> {
    const project = this.registry.get(id);
    if (!project) {
      throw new NotFoundException(`Gen-UI project not found: ${id}`);
    }
    return project;
  }

  async listForUser(
    userId: string,
    projectId: string,
  ): Promise<GenUiProject[]> {
    return Array.from(this.registry.values()).filter(
      (p) => p.userId === userId && p.projectId === projectId,
    );
  }

  async validateDependencies(
    deps: string[],
  ): Promise<{ valid: boolean; disallowed: string[] }> {
    const allowed = this.getAllowedDependencies();
    const disallowed = deps.filter((d) => !allowed.includes(d));
    return { valid: disallowed.length === 0, disallowed };
  }

  async build(
    id: string,
  ): Promise<{ success: boolean; outputPath: string; errors?: string[] }> {
    const project = await this.get(id);

    project.status = 'building';
    project.updatedAt = new Date().toISOString();
    this.registry.set(id, project);

    const validation = await this.validateDependencies(project.dependencies);
    if (!validation.valid) {
      project.status = 'error';
      project.buildErrors = [
        `Disallowed dependencies: ${validation.disallowed.join(', ')}`,
      ];
      project.updatedAt = new Date().toISOString();
      this.registry.set(id, project);
      return {
        success: false,
        outputPath: '',
        errors: project.buildErrors,
      };
    }

    const outputPath = `/gen-ui/projects/${id}/bundle`;
    project.status = 'ready';
    project.outputPath = outputPath;
    project.buildErrors = undefined;
    project.updatedAt = new Date().toISOString();
    this.registry.set(id, project);

    this.logger.log(`Built gen-ui project: ${id} -> ${outputPath}`);
    return { success: true, outputPath };
  }

  getAllowedDependencies(): string[] {
    const configDeps = this.configService.get<string[]>('GENUI_ALLOWED_DEPS');
    return configDeps ?? ALLOWED_DEPENDENCIES;
  }

  async delete(id: string): Promise<void> {
    if (!this.registry.has(id)) {
      throw new NotFoundException(`Gen-UI project not found: ${id}`);
    }
    this.registry.delete(id);
    this.logger.log(`Deleted gen-ui project: ${id}`);
  }
}
