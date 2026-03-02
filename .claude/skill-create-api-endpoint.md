# Skill: Create NestJS API Endpoint

> Scaffold a new REST endpoint with controller method, DTOs, service logic, Swagger docs, auth guard, and tests.

## When to Use

- Adding a new HTTP endpoint to an existing NestJS module in `server/src/modules/`
- Creating a new resource endpoint (CRUD or custom action)
- You know the HTTP method, URL path, request/response shapes

## Prerequisites

- `bun install` has been run in the workspace root
- The target NestJS module exists in `server/src/modules/{module}/`
- `class-validator` and `class-transformer` are available (already in project deps)
- `@nestjs/swagger` is configured for API documentation

## Inputs

| Input           | Example                                 | Required           |
| --------------- | --------------------------------------- | ------------------ |
| `resource`      | `spec`                                  | Yes                |
| `method`        | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | Yes                |
| `path`          | `/specs/:id/versions`                   | Yes                |
| `module`        | `knowledge-graph`                       | Yes                |
| `requestShape`  | `{ title: string; content: string }`    | For POST/PUT/PATCH |
| `responseShape` | `{ id: string; title: string }`         | Yes                |

## Steps

### 1. Define shared types (if crossing workspace boundary)

If the request/response types are used by both client and server, add them to `shared/src/types/`:

```typescript
// shared/src/types/{resource}.types.ts
export interface {Resource}Response {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
```

And to `shared/src/dto/`:

```typescript
// shared/src/dto/{action}-{resource}.dto.ts
export interface {Action}{Resource}Request {
  title: string;
  content: string;
}
```

Re-export from `shared/src/index.ts` if not already barrel-exported.

### 2. Create the request DTO — `server/src/modules/{module}/dto/{action}-{resource}.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class {Action}{Resource}Dto {
  @ApiProperty({ description: 'The title of the {resource}', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsString()
  @IsOptional()
  description?: string;
}
```

### 3. Create the response DTO (if not using shared type directly)

```typescript
// server/src/modules/{module}/dto/{resource}-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class {Resource}ResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
```

### 4. Add the service method — `server/src/modules/{module}/{module}.service.ts`

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

@Injectable()
export class {Module}Service {
  private readonly logger = new Logger({Module}Service.name);

  async {action}{Resource}(dto: {Action}{Resource}Dto): Promise<{Resource}ResponseDto> {
    this.logger.log(`{action} {resource}: ${JSON.stringify(dto)}`);

    // TODO: implement business logic
    // 1. Validate business rules
    // 2. Persist via Drizzle ORM
    // 3. Return mapped response

    throw new Error('Not implemented');
  }
}
```

### 5. Add the controller method — `server/src/modules/{module}/{module}.controller.ts`

```typescript
import {
  Controller,
  {Method},
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { {Module}Service } from './{module}.service.js';
import { {Action}{Resource}Dto } from './dto/{action}-{resource}.dto.js';
import { {Resource}ResponseDto } from './dto/{resource}-response.dto.js';

@ApiTags('{resource}s')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('{resource}s')
export class {Module}Controller {
  constructor(private readonly {module}Service: {Module}Service) {}

  @{Method}('{path}')
  @HttpCode(HttpStatus.{STATUS_CODE})
  @ApiOperation({ summary: '{Action} a {resource}' })
  @ApiResponse({ status: {statusCode}, description: '{Resource} {action}d', type: {Resource}ResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async {action}{Resource}(
    @Body() dto: {Action}{Resource}Dto,
  ): Promise<{Resource}ResponseDto> {
    return this.{module}Service.{action}{Resource}(dto);
  }
}
```

### 6. Create the service test — `server/src/modules/{module}/{module}.service.test.ts`

```typescript
import { describe, expect, test, beforeEach } from 'bun:test';

import { {Module}Service } from './{module}.service.js';

describe('{Module}Service', () => {
  let service: {Module}Service;

  beforeEach(() => {
    service = new {Module}Service(/* mock dependencies */);
  });

  describe('{action}{Resource}', () => {
    test('returns {resource} on valid input', async () => {
      const dto = { title: 'Test {Resource}' };
      const result = await service.{action}{Resource}(dto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Test {Resource}');
    });

    test('throws NotFoundException when {resource} not found', async () => {
      await expect(
        service.{action}{Resource}({ title: '' }),
      ).rejects.toThrow();
    });
  });
});
```

### 7. Create the controller test — `server/src/modules/{module}/{module}.controller.test.ts`

```typescript
import { describe, expect, test, beforeEach } from 'bun:test';
import { Test } from '@nestjs/testing';

import { {Module}Controller } from './{module}.controller.js';
import { {Module}Service } from './{module}.service.js';

describe('{Module}Controller', () => {
  let controller: {Module}Controller;
  let service: {Module}Service;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [{Module}Controller],
      providers: [
        {
          provide: {Module}Service,
          useValue: {
            {action}{Resource}: async () => ({
              id: 'test-id',
              title: 'Test',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        },
      ],
    }).compile();

    controller = module.get({Module}Controller);
    service = module.get({Module}Service);
  });

  test('{action}{Resource} delegates to service', async () => {
    const result = await controller.{action}{Resource}({ title: 'Test' });
    expect(result.id).toBe('test-id');
  });
});
```

### 8. Verify DTO registration

Ensure the DTO and controller are properly imported in the module's `{module}.module.ts`.

## Validation

1. **Endpoint responds**: `curl` or REST client returns expected status and shape
2. **DTO validates**: invalid payloads return 400 with validation messages
3. **Swagger renders**: endpoint appears in Swagger UI at `/api/docs`
4. **Auth works**: unauthenticated requests return 401
5. **Tests pass**: `bun test server/src/modules/{module}/`
6. **Lint**: `bun run lint` reports no new errors

## Common Issues

| Problem                       | Resolution                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| DTO validation not triggering | Ensure `ValidationPipe` is applied globally in `main.ts` or on the route                            |
| Swagger not showing DTOs      | Add `@ApiProperty()` to every DTO field; ensure `SwaggerModule` plugin is configured                |
| Circular dependency in DI     | Use `forwardRef(() => {Module})` in `@Inject()` decorator                                           |
| 404 on the new route          | Check controller `@Controller()` prefix and method decorator path match expected URL                |
| Auth guard not applying       | Verify `JwtAuthGuard` is imported from the correct path and `AuthModule` is in the module's imports |
