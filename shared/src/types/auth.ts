export interface AuthPayload {
  userId: string;
  username: string;
  email: string;
}

export interface JwtPayload extends AuthPayload {
  sub: string;
  iat: number;
  exp: number;
}
