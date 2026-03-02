import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return (
      (request.user as { sub?: string; id?: string } | undefined)?.sub ??
      (request.user as { sub?: string; id?: string } | undefined)?.id ??
      ''
    );
  },
);
