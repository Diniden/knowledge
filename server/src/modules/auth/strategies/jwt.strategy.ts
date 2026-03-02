import { Injectable } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtPayload } from '@kg/shared';

function cookieThenBearerExtractor(req: Request): string | null {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[
    'access_token'
  ];
  if (fromCookie) return fromCookie;

  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const secret =
      configService.get<string>('app.jwt.secret') ??
      'change-this-to-a-secure-secret-at-least-32-chars';

    super({
      jwtFromRequest: cookieThenBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
