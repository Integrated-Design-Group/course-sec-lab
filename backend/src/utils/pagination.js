/**
 * 分页工具：所有列表接口共用同一套 page/pageSize 语义
 * 详见 docs/03-api.md「分页约定」。
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export function buildPaginationMeta({ page, pageSize, total }) {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page * pageSize < total,
    hasPrev: page > 1,
  };
}

export function toOffset({ page, pageSize }) {
  return (page - 1) * pageSize;
}
