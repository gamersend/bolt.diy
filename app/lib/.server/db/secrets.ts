import { query, withTransaction, isDatabaseAvailable } from './index';

export interface Secret {
  id: string;
  name: string;
  keyType: string;
  keyValue: string;
  description?: string;
  serviceName?: string;
  environment: string;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface DbSecret {
  id: string;
  name: string;
  key_type: string;
  key_value: string;
  description: string | null;
  service_name: string | null;
  environment: string;
  expires_at: Date | null;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  is_active: boolean;
  metadata: any;
}

export class SecretsDatabase {
  private userId: string;

  constructor(userId: string = 'default') {
    this.userId = userId;
  }

  async getAllSecrets(): Promise<Secret[]> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const rows = await query<DbSecret>(`
      SELECT * FROM secrets 
      WHERE user_id = $1 
      ORDER BY updated_at DESC
    `, [this.userId]);

    return rows.map(this.mapDbSecretToSecret);
  }

  async getSecret(id: string): Promise<Secret | null> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const rows = await query<DbSecret>(`
      SELECT * FROM secrets 
      WHERE id = $1 AND user_id = $2
    `, [id, this.userId]);

    return rows[0] ? this.mapDbSecretToSecret(rows[0]) : null;
  }

  async createSecret(secret: Omit<Secret, 'id' | 'createdAt' | 'updatedAt'>): Promise<Secret> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const rows = await query<DbSecret>(`
      INSERT INTO secrets (
        name, key_type, key_value, description, service_name, 
        environment, expires_at, is_active, metadata, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *
    `, [
      secret.name,
      secret.keyType,
      secret.keyValue,
      secret.description || null,
      secret.serviceName || null,
      secret.environment,
      secret.expiresAt ? new Date(secret.expiresAt) : null,
      secret.isActive,
      JSON.stringify(secret.metadata || {}),
      this.userId
    ]);

    return this.mapDbSecretToSecret(rows[0]);
  }

  async updateSecret(id: string, updates: Partial<Omit<Secret, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Secret> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.keyType !== undefined) {
      setClauses.push(`key_type = $${paramCount++}`);
      values.push(updates.keyType);
    }

    if (updates.keyValue !== undefined) {
      setClauses.push(`key_value = $${paramCount++}`);
      values.push(updates.keyValue);
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramCount++}`);
      values.push(updates.description || null);
    }

    if (updates.serviceName !== undefined) {
      setClauses.push(`service_name = $${paramCount++}`);
      values.push(updates.serviceName || null);
    }

    if (updates.environment !== undefined) {
      setClauses.push(`environment = $${paramCount++}`);
      values.push(updates.environment);
    }

    if (updates.expiresAt !== undefined) {
      setClauses.push(`expires_at = $${paramCount++}`);
      values.push(updates.expiresAt ? new Date(updates.expiresAt) : null);
    }

    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramCount++}`);
      values.push(updates.isActive);
    }

    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.metadata || {}));
    }

    values.push(id, this.userId);

    const rows = await query<DbSecret>(`
      UPDATE secrets 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `, values);

    if (rows.length === 0) {
      throw new Error('Secret not found');
    }

    return this.mapDbSecretToSecret(rows[0]);
  }

  async deleteSecret(id: string): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    await query(`
      DELETE FROM secrets 
      WHERE id = $1 AND user_id = $2
    `, [id, this.userId]);
  }

  async updateLastUsed(id: string): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    await query(`
      UPDATE secrets 
      SET last_used_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND user_id = $2
    `, [id, this.userId]);
  }

  async searchSecrets(searchQuery: string): Promise<Secret[]> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const rows = await query<DbSecret>(`
      SELECT * FROM secrets 
      WHERE user_id = $1 
        AND (
          name ILIKE $2 
          OR description ILIKE $2 
          OR service_name ILIKE $2
          OR key_type ILIKE $2
        )
      ORDER BY updated_at DESC
    `, [this.userId, `%${searchQuery}%`]);

    return rows.map(this.mapDbSecretToSecret);
  }

  async getSecretsByService(serviceName: string): Promise<Secret[]> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const rows = await query<DbSecret>(`
      SELECT * FROM secrets 
      WHERE user_id = $1 AND service_name = $2 AND is_active = true
      ORDER BY updated_at DESC
    `, [this.userId, serviceName]);

    return rows.map(this.mapDbSecretToSecret);
  }

  async getExpiredSecrets(): Promise<Secret[]> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }

    const rows = await query<DbSecret>(`
      SELECT * FROM secrets 
      WHERE user_id = $1 
        AND expires_at IS NOT NULL 
        AND expires_at < CURRENT_TIMESTAMP
      ORDER BY expires_at DESC
    `, [this.userId]);

    return rows.map(this.mapDbSecretToSecret);
  }

  private mapDbSecretToSecret(dbSecret: DbSecret): Secret {
    return {
      id: dbSecret.id,
      name: dbSecret.name,
      keyType: dbSecret.key_type,
      keyValue: dbSecret.key_value,
      description: dbSecret.description || undefined,
      serviceName: dbSecret.service_name || undefined,
      environment: dbSecret.environment,
      expiresAt: dbSecret.expires_at?.toISOString() || undefined,
      lastUsedAt: dbSecret.last_used_at?.toISOString() || undefined,
      createdAt: dbSecret.created_at.toISOString(),
      updatedAt: dbSecret.updated_at.toISOString(),
      isActive: dbSecret.is_active,
      metadata: dbSecret.metadata || {},
    };
  }
}