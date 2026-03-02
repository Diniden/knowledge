import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { type GenUiService } from './gen-ui.service.js';
import type { GenUiProject } from './gen-ui.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { Public } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('gen-ui')
@Controller('gen-ui')
@UseGuards(JwtAuthGuard)
export class GenUiController {
  constructor(private readonly genUiService: GenUiService) {}

  @Post('projects')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new generated UI project' })
  @ApiResponse({ status: 201, description: 'Project registered' })
  async create(
    @CurrentUser() userId: string,
    @Body()
    body: {
      projectId: string;
      name: string;
      description: string;
      entryPoint: string;
      dependencies: string[];
    },
  ): Promise<GenUiProject> {
    const id = await this.genUiService.register({
      ...body,
      userId,
    });
    const project = await this.genUiService.get(id);
    return project;
  }

  @Get('projects')
  @ApiOperation({ summary: "List user's gen-ui projects" })
  @ApiResponse({ status: 200, description: 'List of projects' })
  async list(@CurrentUser() userId: string): Promise<GenUiProject[]> {
    return this.genUiService.listForUser(userId, 'default');
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get project details' })
  @ApiResponse({ status: 200, description: 'Project found' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findById(@Param('id') id: string): Promise<GenUiProject> {
    return this.genUiService.get(id);
  }

  @Post('projects/:id/build')
  @ApiOperation({ summary: 'Build a gen-ui project' })
  @ApiResponse({ status: 200, description: 'Build result' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async build(@Param('id') id: string) {
    return this.genUiService.build(id);
  }

  @Get('projects/:id/bundle')
  @Public()
  @ApiOperation({ summary: 'Serve the built bundle' })
  @ApiResponse({ status: 200, description: 'Bundle content' })
  @ApiResponse({ status: 404, description: 'Bundle not found' })
  async getBundle(@Param('id') id: string, @Res() res: Response) {
    const project = await this.genUiService.get(id);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="root">
    <div style="padding: 24px; text-align: center;">
      <h2>${project.name}</h2>
      <p style="color: #666; margin-top: 8px;">${project.description}</p>
      <p style="margin-top: 16px; color: #999; font-size: 14px;">Gen-UI Sandbox Active</p>
    </div>
  </div>
  <script>
    window.addEventListener('error', function(e) {
      window.parent.postMessage({ type: 'error', error: e.message }, '*');
    });
    window.kgBridge = {
      sendToParent: function(type, data) {
        window.parent.postMessage({ type: type, data: data }, '*');
      }
    };
    window.parent.postMessage({ type: 'genui:ready' }, '*');
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none';",
    );
    res.send(html);
  }

  @Delete('projects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a gen-ui project' })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.genUiService.delete(id);
  }

  @Get('allowed-deps')
  @Public()
  @ApiOperation({ summary: 'Get list of allowed dependencies' })
  @ApiResponse({ status: 200, description: 'Allowed dependencies list' })
  getAllowedDeps() {
    return { allowed: this.genUiService.getAllowedDependencies() };
  }
}
