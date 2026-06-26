import bcrypt from 'bcryptjs';

const COST = 10;

export function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function compare(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
