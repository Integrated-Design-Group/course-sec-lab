/**
 * 展示格式化工具（统一中文语境下的金额、时间、枚举文案）
 */
export const ROLE_LABELS = {
  admin: '管理员',
  student: '学生',
};

export const CATEGORY_LABELS = {
  textbook: '教材',
  notes: '笔记',
  other: '其他',
};

export const CONDITION_LABELS = {
  new: '全新',
  good: '良好',
  fair: '一般',
};

export const STATUS_LABELS = {
  draft: '草稿',
  published: '已发布',
  reserved: '已预订',
  sold: '已售出',
  archived: '已归档',
};

export function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(number);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatUptime(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) return '—';
  if (total < 60) return `${Math.round(total)} 秒`;
  if (total < 3600) return `${Math.floor(total / 60)} 分 ${Math.round(total % 60)} 秒`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours} 小时 ${minutes} 分`;
}
