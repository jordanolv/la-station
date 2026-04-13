import jwt from 'jsonwebtoken';

const TOKEN_TTL = '24h';

export class MountainWebService {
  static generateMapUrl(userId: string): string {
    const secret = process.env.WEB_JWT_SECRET;
    if (!secret) throw new Error('WEB_JWT_SECRET manquant');

    const baseUrl = process.env.WEB_BASE_URL;
    if (!baseUrl) throw new Error('WEB_BASE_URL manquant');

    const token = jwt.sign({ userId }, secret, { expiresIn: TOKEN_TTL });
    return `${baseUrl}/map?token=${token}`;
  }
}
