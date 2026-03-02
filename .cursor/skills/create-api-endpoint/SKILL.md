# Create NestJS API Endpoint

> Add a new endpoint to an existing NestJS module with DTOs, service method, guards, and tests.

## When to Use

- Adding a new route to an existing NestJS controller
- Creating CRUD operations for a resource
- Adding a custom action endpoint (e.g., `POST /specs/:id/publish`)

## Prerequisites

- The target NestJS module already exists in `server/src/modules/{feature}/`
- You know the HTTP method, path, request/response shapes
- Shared types exist or need to be created in `@kg/shared`

## Steps

1. **Examine the existing module** — Use Read to inspect the controller and service:

   ```
   Read: server/src/modules/{feature}/{feature}.controller.ts
   Read: server/src/modules/{feature}/{feature}.service.ts
   ```

2. **Check shared types** — Use Grep to find existing DTOs and types:

   ```
   Grep: pattern="{Entity}" path=shared/src/
   ```

3. **Create or update shared types** — If new types are needed, use Write to add them in `shared/src/types/` or `shared/src/dto/`. Re-export from the barrel file.

4. **Create the DTO** — Use Write to create or update `server/src/modules/{feature}/dto/{action}-{entity}.dto.ts`:
   - Use `class-validator` decorators for validation
   - Import shared types from `@kg/shared`

   ```typescript
   import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

   export class Create{Entity}Dto {
     @IsString()
     @IsNotEmpty()
     title!: string;

     @IsString()
     @IsOptional()
     description?: string;
   }
   ```

5. **Add the service method** — Use StrReplace to add the method to the service class:
   - Inject database via `@Inject(DRIZZLE)`
   - Contain all business logic
   - Throw NestJS exceptions for error cases (`NotFoundException`, `ForbiddenException`)
   - Return typed responses

6. **Add the controller method** — Use StrReplace to add the route handler:
   - Use appropriate HTTP method decorator (`@Get`, `@Post`, `@Put`, `@Delete`)
   - Add `@UseGuards(JwtAuthGuard)` if the endpoint requires authentication
   - Use `@Body()`, `@Param()`, `@Query()` for input extraction
   - Delegate to the service; do not contain business logic

   ```typescript
   @Post()
   @UseGuards(JwtAuthGuard)
   async create(
     @Body() dto: Create{Entity}Dto,
     @CurrentUser() user: AuthUser,
   ): Promise<{Entity}ResponseDto> {
     return this.{feature}Service.create(dto, user.id);
   }
   ```

7. **Create service test** — Use Write to create or update `{feature}.service.test.ts`:
   - Mock database and other dependencies
   - Test success path and error cases
   - Verify thrown exceptions

8. **Create controller test** — Use Write to create or update `{feature}.controller.test.ts`:
   - Mock the service
   - Test that controller delegates to service
   - Test guard application

9. **Run tests** — Use Shell:
   ```
   Shell: bun test server/src/modules/{feature}/
   ```

## Validation

- [ ] Controller handles HTTP only — no business logic
- [ ] Service contains all business logic
- [ ] DTOs use `class-validator` decorators
- [ ] Protected endpoints have `@UseGuards(JwtAuthGuard)`
- [ ] Response types match shared DTOs from `@kg/shared`
- [ ] Both service and controller tests pass
- [ ] No `console.log` — use NestJS `Logger` if logging is needed
- [ ] No `any` types
- [ ] `.js` extensions in all relative imports

## Common Issues

| Problem                    | Resolution                                                          |
| -------------------------- | ------------------------------------------------------------------- |
| DTO validation not running | Ensure `ValidationPipe` is registered globally in `main.ts`         |
| Circular dependency        | Use `forwardRef()` in module imports                                |
| 404 on new route           | Verify controller is registered in the module's `controllers` array |
| Database injection fails   | Ensure `DatabaseModule` is imported in the feature module           |
| Guard not applying         | Check that `JwtAuthGuard` is imported from the auth module          |

## References

- `.cursor/rules/server.mdc` — NestJS server conventions
- `.cursor/rules/general.mdc` — General coding standards
