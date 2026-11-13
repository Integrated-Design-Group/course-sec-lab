/**
 * ID 解析工具：路径参数只接受正整数
 */
import { AppError } from './errors.js';

export function parsePositiveIntParam(value, field = 'id') {
  const raw = String(value ?? '');
  if (!/^\d+$/.test(raw)) {
    throw new AppError('VALIDATION_ERROR', `${field} 必须为正整数`, [
      { field, message: `${field} 必须为正整数` },
    ]);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new AppError('VALIDATION_ERROR', `${field} 超出允许范围`, [
      { field, message: `${field} 超出允许范围` },
    ]);
  }
  return parsed;
}
