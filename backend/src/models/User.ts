/**
 * User model
 * Represents the structure of a row in the `users` table.
 */
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  photo: string | null;
  bio: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Payload required to create a new user.
 * Password hashing is handled by the Auth module (not this service).
 */
export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  photo?: string | null;
  bio?: string | null;
  role?: string;
}

/**
 * Payload for partial user updates.
 */
export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  photo?: string | null;
  bio?: string | null;
  role?: string;
}
