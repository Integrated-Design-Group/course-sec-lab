/**
 * 内存仓储实现（仅框架阶段演示 / 自动化测试）
 * 与 mysql 驱动保持完全相同的函数签名与返回值形状。
 */
import { businessItems, nextId, roles, uploadedFiles, users, auditLogs } from './store.js';

function withRole(userRow) {
  const role = roles.find((item) => item.id === userRow.role_id);
  return { ...userRow, role_code: role?.code ?? null, role_name: role?.name ?? null };
}

function withOwner(itemRow) {
  const owner = users.find((item) => item.id === itemRow.owner_id);
  return { ...itemRow, owner_display_name: owner?.display_name ?? null };
}

function matchesKeyword(item, keyword) {
  const needle = keyword.toLowerCase();
  return item.title.toLowerCase().includes(needle) || item.author.toLowerCase().includes(needle);
}

export const repositories = Object.freeze({
  users: {
    async findByUsernameOrEmail(identifier) {
      const needle = String(identifier).toLowerCase();
      const found = users.find(
        (user) =>
          user.deleted_at === null &&
          (user.username.toLowerCase() === needle || user.email.toLowerCase() === needle),
      );
      return found ? withRole(found) : null;
    },

    async findById(id) {
      const found = users.find((user) => user.id === Number(id) && user.deleted_at === null);
      return found ? withRole(found) : null;
    },

    async updateLastLogin(id, at = new Date()) {
      const found = users.find((user) => user.id === Number(id));
      if (!found) return 0;
      const iso = at instanceof Date ? at.toISOString() : new Date(at).toISOString();
      found.last_login_at = iso;
      found.updated_at = iso;
      return 1;
    },

    async count() {
      return users.filter((user) => user.deleted_at === null).length;
    },
  },

  roles: {
    async findByCode(code) {
      return roles.find((role) => role.code === code) ?? null;
    },
    async listAll() {
      return roles.map((role) => ({ ...role }));
    },
  },

  businessItems: {
    async list({ page, pageSize, status, keyword }) {
      const filtered = businessItems.filter((item) => {
        if (item.deleted_at !== null) return false;
        if (status && item.status !== status) return false;
        if (keyword && !matchesKeyword(item, keyword)) return false;
        return true;
      });

      filtered.sort((a, b) => {
        if (a.created_at === b.created_at) return b.id - a.id;
        return a.created_at < b.created_at ? 1 : -1;
      });

      const start = (page - 1) * pageSize;
      const rows = filtered.slice(start, start + pageSize).map(withOwner);
      return { rows, total: filtered.length };
    },

    async findById(id) {
      const found = businessItems.find((item) => item.id === Number(id) && item.deleted_at === null);
      return found ? withOwner(found) : null;
    },
  },

  uploadedFiles: {
    async create(record) {
      const row = { id: nextId('uploaded_files'), ...record };
      uploadedFiles.push(row);
      return row;
    },
    async findById(id) {
      return uploadedFiles.find((file) => file.id === Number(id)) ?? null;
    },
    async findByIdForOwner(id, ownerId) {
      return uploadedFiles.find((file) => file.id === Number(id) && file.owner_id === Number(ownerId)) ?? null;
    },
  },

  auditLogs: {
    async create(entry) {
      const id = nextId('audit_logs');
      auditLogs.push({
        id,
        actor_id: entry.actor_id ?? null,
        action: entry.action,
        resource_type: entry.resource_type ?? null,
        resource_id: entry.resource_id ?? null,
        result: entry.result,
        ip: entry.ip ?? null,
        user_agent: entry.user_agent ?? null,
        detail: entry.detail ? JSON.stringify(entry.detail) : null,
        created_at: entry.created_at ?? new Date().toISOString(),
      });
      return id;
    },
    async listRecent({ limit = 20 } = {}) {
      const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
      return auditLogs.slice(-safeLimit).reverse();
    },
  },

  health: {
    async ping() {
      return {
        driver: 'memory',
        status: 'up',
        latencyMs: 0,
        note: '框架阶段内存驱动：数据不持久化，仅用于本地演示与冒烟测试',
      };
    },
  },
});
