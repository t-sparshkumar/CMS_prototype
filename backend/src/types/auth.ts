export interface AccessTokenPayload {
  sub: string;
  role: string;
  type: 'access';
}

export interface LoginResult {
  access_token: string;
  expires: number;
}

export interface SessionMeta {
  ip: string | null;
  userAgent: string | null;
}
