/**
 * 参数校验：一个刻意保持很小的声明式校验器
 * ---------------------------------------------------------------------------
 * 为什么不用 zod：保持依赖最小、契约一眼可读。
 * 规则对象示例：
 *   { username: { required: true, type: 'string', min: 3, max: 64 } }
 *   { page: { type: 'int', min: 1, max: 1000, default: 1 } }
 *   { status: { type: 'enum', enum: ['draft', 'published'] } }
 *   { price: { required: true, type: 'number', min: 0, max: 999999.99, maxDecimals: 2 } }
 *   { mine: { type: 'boolean' } }
 *   { description: { type: 'string', max: 2000, allowEmpty: true } }   // 显式清空
 *   { coverFileId: { type: 'int', min: 1, nullable: true } }          // 显式置空
 * 校验失败统一抛 VALIDATION_ERROR，details 为 [{ field, message }]。
 * 返回值只包含 schema 声明过的字段，天然过滤掉多余入参。
 */
import { AppError } from './errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);

function fail(details) {
  throw new AppError('VALIDATION_ERROR', '请求参数校验失败', details);
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
}

/**
 * @param {unknown} input
 * @param {Record<string, object>} schema
 * @returns {Record<string, unknown>}
 */
export function validateObject(input, schema) {
  const data = input && typeof input === 'object' ? input : {};
  const result = {};
  const details = [];

  for (const [field, rule] of Object.entries(schema)) {
    const raw = data[field];

    if (Array.isArray(raw)) {
      details.push({ field, message: `${field} 不允许重复传参` });
      continue;
    }

    // 显式 null：仅当规则允许时保留，用于“清空封面”这类语义
    if (raw === null && rule.nullable) {
      result[field] = null;
      continue;
    }

    const isBlank = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');
    if (isBlank) {
      if (raw === '' && rule.allowEmpty) {
        result[field] = '';
      } else if (rule.required) {
        details.push({ field, message: `${field} 为必填项` });
      } else if (rule.default !== undefined) {
        result[field] = rule.default;
      }
      continue;
    }

    let value = raw;

    if (rule.type === 'string' || rule.type === 'enum' || rule.type === 'password' || rule.type === 'email') {
      if (typeof value !== 'string') {
        details.push({ field, message: `${field} 必须是字符串` });
        continue;
      }
      value = value.trim();
      if (value.length === 0) {
        details.push({ field, message: `${field} 不能为空字符串` });
        continue;
      }
    }

    if (rule.type === 'int') {
      let parsed;
      if (typeof value === 'number') {
        parsed = value;
      } else if (/^-?\d+$/.test(String(value).trim())) {
        parsed = Number.parseInt(String(value).trim(), 10);
      } else {
        parsed = Number.NaN;
      }
      if (!Number.isSafeInteger(parsed)) {
        details.push({ field, message: `${field} 必须是整数` });
        continue;
      }
      value = parsed;
    }

    if (rule.type === 'number') {
      const parsed = typeof value === 'number' ? value : Number(String(value).trim());
      if (!Number.isFinite(parsed)) {
        details.push({ field, message: `${field} 必须是数字` });
        continue;
      }
      if (rule.maxDecimals !== undefined) {
        const factor = 10 ** rule.maxDecimals;
        if (Math.abs(Math.round(parsed * factor) - parsed * factor) > 1e-9) {
          details.push({ field, message: `${field} 最多保留 ${rule.maxDecimals} 位小数` });
          continue;
        }
      }
      if (rule.min !== undefined && parsed < rule.min) {
        details.push({ field, message: `${field} 不能小于 ${rule.min}` });
        continue;
      }
      if (rule.max !== undefined && parsed > rule.max) {
        details.push({ field, message: `${field} 不能大于 ${rule.max}` });
        continue;
      }
      value = parsed;
    }

    if (rule.type === 'boolean') {
      const parsed = parseBoolean(value);
      if (parsed === undefined) {
        details.push({ field, message: `${field} 必须是布尔值（true/false）` });
        continue;
      }
      value = parsed;
    }

    if (rule.type === 'enum' && !rule.enum.includes(value)) {
      details.push({ field, message: `${field} 只能取 ${rule.enum.join(' | ')}` });
      continue;
    }

    if (rule.type === 'email' && !EMAIL_PATTERN.test(value)) {
      details.push({ field, message: `${field} 必须是合法邮箱` });
      continue;
    }

    if (rule.pattern && !rule.pattern.test(String(value))) {
      details.push({ field, message: rule.patternMessage || `${field} 格式不合法` });
      continue;
    }

    if (typeof value === 'string') {
      if (rule.min !== undefined && value.length < rule.min) {
        details.push({ field, message: `${field} 长度不能少于 ${rule.min}` });
        continue;
      }
      if (rule.max !== undefined && value.length > rule.max) {
        details.push({ field, message: `${field} 长度不能超过 ${rule.max}` });
        continue;
      }
    } else if (rule.type === 'int') {
      if (rule.min !== undefined && value < rule.min) {
        details.push({ field, message: `${field} 不能小于 ${rule.min}` });
        continue;
      }
      if (rule.max !== undefined && value > rule.max) {
        details.push({ field, message: `${field} 不能大于 ${rule.max}` });
        continue;
      }
    }

    result[field] = value;
  }

  if (details.length > 0) fail(details);
  return result;
}
