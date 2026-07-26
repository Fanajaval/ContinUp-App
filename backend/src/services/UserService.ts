import { query } from "../config/database";
import { CreateUserInput, UpdateUserInput, User } from "../models/User";

/**
 * UserService
 * Data-access layer for the `users` table.
 * Uses parameterized queries only (no string concatenation).
 * Does NOT handle password hashing, JWT, or auth flows.
 */
export class UserService {
  /**
   * Insert a new user and return the created row.
   */
  static async createUser(data: CreateUserInput): Promise<User> {
    const {
      name,
      email,
      password,
      photo = null,
      bio = null,
      role = "USER",
    } = data;

    const result = await query(
      `INSERT INTO users (name, email, password, photo, bio, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email, password, photo, bio, role]
    );

    return result.rows[0] as User;
  }

  /**
   * Find a user by email.
   * Returns null if no user matches.
   */
  static async findUserByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    return (result.rows[0] as User) ?? null;
  }

  /**
   * Find a user by id.
   * Returns null if no user matches.
   */
  static async findUserById(id: number): Promise<User | null> {
    const result = await query(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );

    return (result.rows[0] as User) ?? null;
  }

  /**
   * Partially update a user by id.
   * Only provided fields are updated.
   * Returns the updated user, or null if not found.
   */
  static async updateUser(
    id: number,
    data: UpdateUserInput
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.password !== undefined) {
      fields.push(`password = $${paramIndex++}`);
      values.push(data.password);
    }
    if (data.photo !== undefined) {
      fields.push(`photo = $${paramIndex++}`);
      values.push(data.photo);
    }
    if (data.bio !== undefined) {
      fields.push(`bio = $${paramIndex++}`);
      values.push(data.bio);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }

    if (fields.length === 0) {
      return this.findUserById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE users
       SET ${fields.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return (result.rows[0] as User) ?? null;
  }
}

export default UserService;
