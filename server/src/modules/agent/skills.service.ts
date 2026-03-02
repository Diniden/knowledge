import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface AgentRateLimits {
  maxConcurrent: number;
  maxPerHour: number;
}

export interface AgentTypeConfig {
  skillFile: string;
  maxTokens: number;
  timeout: number;
  tools: string[];
  rateLimits: AgentRateLimits;
}

export interface DefaultConfig {
  maxConcurrentSessions: number;
  sessionTimeout: number;
  maxMessageLength: number;
}

interface AgentConfigFile {
  agents: Record<string, AgentTypeConfig>;
  defaults: DefaultConfig;
}

const AGENTS_DIR = resolve(import.meta.dirname ?? __dirname, '../../../agents');

@Injectable()
export class AgentSkillsService implements OnModuleInit {
  private readonly logger = new Logger(AgentSkillsService.name);
  private config!: AgentConfigFile;
  private skills = new Map<string, string>();
  private templates = new Map<string, string>();

  async onModuleInit(): Promise<void> {
    await this.loadConfig();
    await this.loadSkills();
    await this.loadTemplates();
  }

  private async loadConfig(): Promise<void> {
    const configPath = join(AGENTS_DIR, 'config.json');
    try {
      const raw = await readFile(configPath, 'utf-8');
      this.config = JSON.parse(raw) as AgentConfigFile;
      this.logger.log(
        `Loaded agent config: ${Object.keys(this.config.agents).length} agent types`,
      );
    } catch {
      this.logger.warn(
        `Failed to load agent config from ${configPath}, using empty defaults`,
      );
      this.config = {
        agents: {},
        defaults: {
          maxConcurrentSessions: 2,
          sessionTimeout: 600000,
          maxMessageLength: 10000,
        },
      };
    }
  }

  private async loadSkills(): Promise<void> {
    const skillsDir = join(AGENTS_DIR, 'skills');
    try {
      const files = await readdir(skillsDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const name = file.replace(/\.md$/, '');
        const content = await readFile(join(skillsDir, file), 'utf-8');
        this.skills.set(name, content);
      }
      this.logger.log(`Loaded ${this.skills.size} skill files`);
    } catch {
      this.logger.warn('No skill files found');
    }
  }

  private async loadTemplates(): Promise<void> {
    const templatesDir = join(AGENTS_DIR, 'templates');
    try {
      const files = await readdir(templatesDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const name = file.replace(/\.md$/, '');
        const content = await readFile(join(templatesDir, file), 'utf-8');
        this.templates.set(name, content);
      }
      this.logger.log(`Loaded ${this.templates.size} template files`);
    } catch {
      this.logger.warn('No template files found');
    }
  }

  getSkillPrompt(agentType: string): string {
    const normalizedType = agentType.toLowerCase().replace(/_/g, '-');
    const prompt = this.skills.get(normalizedType);

    if (!prompt) {
      this.logger.warn(`No skill prompt found for agent type: ${agentType}`);
      return '';
    }

    return prompt;
  }

  getAgentConfig(agentType: string): AgentTypeConfig | undefined {
    const normalizedType = agentType.toLowerCase().replace(/-/g, '_');
    return this.config.agents[normalizedType];
  }

  getTemplate(templateName: string): string {
    const normalized = templateName.toLowerCase().replace(/_/g, '-');
    const template = this.templates.get(normalized);

    if (!template) {
      this.logger.warn(`No template found: ${templateName}`);
      return '';
    }

    return template;
  }

  getAvailableAgents(): string[] {
    return Object.keys(this.config.agents);
  }

  getDefaults(): DefaultConfig {
    return { ...this.config.defaults };
  }
}
