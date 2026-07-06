import { getDb } from '../database/connection';
import { ResourceRequest } from '../types';

export class ResourceRequestRepository {
  private baseQuery = `
    SELECT rr.*,
      rp.name as requesting_project_name,
      sp.name as source_project_name,
      r.name as resource_name
    FROM resource_requests rr
    JOIN projects rp ON rr.requesting_project_id = rp.id
    LEFT JOIN projects sp ON rr.source_project_id = sp.id
    JOIN resources r ON rr.resource_id = r.id
  `;

  findAll(projectId?: number): ResourceRequest[] {
    if (projectId) {
      return getDb()
        .prepare(`${this.baseQuery} WHERE rr.requesting_project_id = ? OR rr.source_project_id = ? ORDER BY rr.created_at DESC`)
        .all(projectId, projectId) as unknown as ResourceRequest[];
    }
    return getDb()
      .prepare(`${this.baseQuery} ORDER BY rr.created_at DESC`)
      .all() as unknown as ResourceRequest[];
  }

  findById(id: number): ResourceRequest | null {
    return (getDb().prepare(`${this.baseQuery} WHERE rr.id = ?`).get(id) as unknown as ResourceRequest) || null;
  }

  create(data: {
    requesting_project_id: number;
    source_project_id?: number | null;
    resource_id: number;
    requested_allocation_percent: number;
    message?: string | null;
  }): ResourceRequest {
    const result = getDb()
      .prepare(
        `INSERT INTO resource_requests (requesting_project_id, source_project_id, resource_id,
         requested_allocation_percent, message) VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        data.requesting_project_id,
        data.source_project_id ?? null,
        data.resource_id,
        data.requested_allocation_percent,
        data.message ?? null
      );
    return this.findById(result.lastInsertRowid as number)!;
  }

  updateStatus(id: number, status: string): ResourceRequest | null {
    getDb()
      .prepare(`UPDATE resource_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(status, id);
    return this.findById(id);
  }
}
