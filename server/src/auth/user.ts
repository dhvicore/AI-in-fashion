import type { User } from '@prisma/client';

// The shape sent to the client — never includes passwordHash.
export function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
}
