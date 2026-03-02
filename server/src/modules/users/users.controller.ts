import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import type { ApiResponse } from '@shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UsersService } from './users.service.js';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    const response: ApiResponse<typeof user> = { success: true, data: user };
    return response;
  }
}
