# Create NestJS Module

> Scaffold a new NestJS feature module with controller, service, DTOs, and tests.

## When to Use

- Adding a new domain feature to the server (e.g., notifications, analytics, tags)
- The feature doesn't fit in any existing module
- You need a full module structure: module, controller, service, DTOs, tests

## Prerequisites

- The feature name is decided and follows kebab-case for the directory (`knowledge-graph`, `user-prefs`)
- The feature does not duplicate an existing module — check `server/src/modules/` first
- You know what entities and operations the module will handle

## Steps

1. **Verify no existing module** — Use Glob to confirm the module doesn't already exist:

   ```
   Glob: server/src/modules/{feature}/**
   ```

2. **Inspect a reference module** — Use Read to examine an existing module for patterns:

   ```
   Read: server/src/modules/auth/auth.module.ts
   ```

3. **Create the module file** — Use Write to create `server/src/modules/{feature}/{feature}.module.ts`:

   ```typescript
   import { Module } from '@nestjs/common';

   import { DatabaseModule } from '../database/database.module.js';
   import { {Feature}Controller } from './{feature}.controller.js';
   import { {Feature}Service } from './{feature}.service.js';

   @Module({
     imports: [DatabaseModule],
     controllers: [{Feature}Controller],
     providers: [{Feature}Service],
     exports: [{Feature}Service],
   })
   export class {Feature}Module {}
   ```

4. **Create the controller** — Use Write to create `{feature}.controller.ts`:

   ```typescript
   import { Controller } from '@nestjs/common';

   import { {Feature}Service } from './{feature}.service.js';

   @Controller('{feature}')
   export class {Feature}Controller {
     constructor(private readonly {feature}Service: {Feature}Service) {}
   }
   ```

5. **Create the service** — Use Write to create `{feature}.service.ts`:

   ```typescript
   import { Inject, Injectable, Logger } from '@nestjs/common';

   import { DRIZZLE } from '../database/database.constants.js';
   import type { DrizzleDB } from '../database/database.types.js';

   @Injectable()
   export class {Feature}Service {
     private readonly logger = new Logger({Feature}Service.name);

     constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}
   }
   ```

6. **Create the DTO directory** — Use Write to create `dto/` with an initial DTO if known, or an empty barrel:

   ```
   Write: server/src/modules/{feature}/dto/index.ts
   ```

7. **Create controller test** — Use Write to create `{feature}.controller.test.ts`:

   ```typescript
   import { describe, test, expect } from 'bun:test';
   import { Test } from '@nestjs/testing';

   import { {Feature}Controller } from './{feature}.controller.js';
   import { {Feature}Service } from './{feature}.service.js';

   describe('{Feature}Controller', () => {
     async function createTestModule() {
       const module = await Test.createTestingModule({
         controllers: [{Feature}Controller],
         providers: [
           { provide: {Feature}Service, useValue: {} },
         ],
       }).compile();

       return module.get({Feature}Controller);
     }

     test('is defined', async () => {
       const controller = await createTestModule();
       expect(controller).toBeDefined();
     });
   });
   ```

8. **Create service test** — Use Write to create `{feature}.service.test.ts`:

   ```typescript
   import { describe, test, expect } from 'bun:test';
   import { Test } from '@nestjs/testing';

   import { DRIZZLE } from '../database/database.constants.js';
   import { {Feature}Service } from './{feature}.service.js';

   describe('{Feature}Service', () => {
     async function createTestModule() {
       const module = await Test.createTestingModule({
         providers: [
           {Feature}Service,
           { provide: DRIZZLE, useValue: {} },
         ],
       }).compile();

       return module.get({Feature}Service);
     }

     test('is defined', async () => {
       const service = await createTestModule();
       expect(service).toBeDefined();
     });
   });
   ```

9. **Register in AppModule** — Use Read then StrReplace to add the module import to `server/src/app.module.ts`:
   - Add the import statement
   - Add to the `imports` array

10. **Run tests** — Use Shell to verify:
    ```
    Shell: bun test server/src/modules/{feature}/
    ```

## Validation

- [ ] Module file uses `@Module()` with correct imports, controllers, providers, exports
- [ ] Controller delegates to service — no business logic
- [ ] Service is `@Injectable()` with logger and database injection
- [ ] Module registered in `AppModule.imports`
- [ ] Controller and service tests exist and pass
- [ ] Directory follows `server/src/modules/{feature}/` structure
- [ ] No `console.log` — uses NestJS `Logger`
- [ ] `.js` extensions in all relative imports

## Common Issues

| Problem                | Resolution                                     |
| ---------------------- | ---------------------------------------------- |
| Module not loading     | Verify it's added to `AppModule.imports`       |
| Service not injectable | Ensure `@Injectable()` decorator is present    |
| Database not available | Import `DatabaseModule` in the feature module  |
| Circular dependency    | Use `forwardRef(() => OtherModule)` in imports |

## References

- `.cursor/rules/server.mdc` — NestJS server conventions
- `.cursor/rules/project-structure.mdc` — Project directory structure
