/**
 * 内存仓储实现（仅框架阶段演示 / 自动化测试）
 * 与 mysql 驱动保持完全相同的函数签名与返回值形状。
 */
import { businessItems, nextId, roles, uploadedFiles, users, auditLogs } from './store.js';

function toIso(value) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

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

function paginate(rows, page, pageSize) {
  const start = (Number(page) - 1) * Number(pageSize);
  return rows.slice(start, start + Number(pageSize));
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
      const iso = toIso(at);
      found.last_login_at = iso;
      found.updated_at = iso;
      return 1;
    },

    async count() {
      return users.filter((user) => user.deleted_at === null).length;
    },

    async list({ page, pageSize, status, keyword }) {
      const needle = keyword ? keyword.toLowerCase() : null;
      const filtered = users
        .filter((user) => user.deleted_at === null)
        .filter((user) => (status ? user.status === status : true))
        .filter((user) => {
          if (!needle) return true;
          return (
            user.username.toLowerCase().includes(needle) ||
            user.email.toLowerCase().includes(needle) ||
            String(user.display_name ?? '').toLowerCase().includes(needle)
          );
        })
        .sort((a, b) => a.id - b.id);

      return {
        rows: paginate(filtered, page, pageSize).map(withRole),
        total: filtered.length,
      };
    },

    async updateStatus(id, status, at = new Date()) {
      const found = users.find((user) => user.id === Number(id) && user.deleted_at === null);
      if (!found) return 0;
      found.status = status;
      found.updated_at = toIso(at);
      return 1;
    },

    async countActiveAdmins() {
      const adminRole = roles.find((role) => role.code === 'admin');
      if (!adminRole) return 0;
      return users.filter(
        (user) => user.deleted_at === null && user.status === 'active' && user.role_id === adminRole.id,
      ).length;
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
    async list({ page, pageSize, status, keyword, ownerId }) {
      const filtered = businessItems.filter((item) => {
        if (item.deleted_at !== null) return false;
        if (ownerId && item.owner_id !== Number(ownerId)) return false;
        if (status && item.status !== status) return false;
        if (keyword && !matchesKeyword(item, keyword)) return false;
        return true;
      });

      filtered.sort((a, b) => {
        if (a.created_at === b.created_at) return b.id - a.id;
        return a.created_at < b.created_at ? 1 : -1;
      });

      return {
        rows: paginate(filtered, page, pageSize).map(withOwner),
        total: filtered.length,
      };
    },

    async findById(id) {
      const found = businessItems.find((item) => item.id === Number(id) && item.deleted_at === null);
      return found ? withOwner(found) : null;
    },

    async create(record) {
      const row = {
        id: nextId('business_items'),
        owner_id: record.owner_id,
        title: record.title,
        author: record.author,
        category: record.category,
        condition_level: record.condition_level,
        price: String(record.price),
        description: record.description ?? null,
        status: record.status,
        cover_file_id: record.cover_file_id ?? null,
        created_at: toIso(record.created_at),
        updated_at: toIso(record.updated_at),
        deleted_at: null,
      };
      businessItems.push(row);
      return withOwner(row);
    },

    async update(id, columns) {
      const found = businessItems.find((item) => item.id === Number(id) && item.deleted_at === null);
      if (!found) return 0;
      for (const [column, value] of Object.entries(columns)) {
        found[column] = column === 'updated_at' ? toIso(value) : value;
      }
      return 1;
    },

    async softDelete(id, deletedAt) {
      const found = businessItems.find((item) => item.id === Number(id) && item.deleted_at === null);
      if (!found) return 0;
      found.deleted_at = toIso(deletedAt);
      found.updated_at = toIso(deletedAt);
      return 1;
    },

    async countByCoverFileId(fileId) {
      return businessItems.filter(
        (item) => item.deleted_at === null && item.cover_file_id === Number(fileId),
      ).length;
    },
  },

  uploadedFiles: {
    async create(record) {
      const row = {
        id: nextId('uploaded_files'),
        ...record,
        created_at: toIso(record.created_at),
        updated_at: toIso(record.updated_at),
      };
      uploadedFiles.push(row);
      return row;
    },
    async findById(id) {
      return uploadedFiles.find((file) => file.id === Number(id)) ?? null;
    },
    async findByIdForOwner(id, ownerId) {
      return uploadedFiles.find((file) => file.id === Number(id) && file.owner_id === Number(ownerId)) ?? null;
    },
    async updateStatus(id, status, at = new Date()) {
      const found = uploadedFiles.find((file) => file.id === Number(id));
      if (!found) return 0;
      found.status = status;
      found.updated_at = toIso(at);
      return 1;
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
        created_at: toIso(entry.created_at ?? new Date()),
      });
      return id;
    },

    async listRecent({ limit = 20 } = {}) {
      const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
      return auditLogs.slice(-safeLimit).reverse();
    },

    async list({ page, pageSize, action, actorId, result }) {
      const filtered = auditLogs
        .filter((entry) => (action ? entry.action === action : true))
        .filter((entry) => (actorId ? entry.actor_id === Number(actorId) : true))
        .filter((entry) => (result ? entry.result === result : true))
        .sort((a, b) => b.id - a.id);

      return {
        rows: paginate(filtered, page, pageSize),
        total: filtered.length,
      };
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
