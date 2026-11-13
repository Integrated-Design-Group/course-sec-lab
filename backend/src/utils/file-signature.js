/**
 * 文件签名（magic bytes）识别
 * ---------------------------------------------------------------------------
 * 上传接口只信任“真实字节”，不信任客户端提供的 Content-Type 与扩展名，
 * 这是框架阶段就应具备的安全基线（反之上传漏洞留到 VULN 设计阶段，且不实现）。
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

/**
 * @param {Buffer} buffer 文件头（建议至少 12 字节）
 * @returns {'image/png'|'image/jpeg'|'image/webp'|null}
 */
export function detectMimeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return 'image/png';
  if (buffer.subarray(0, 3).equals(JPEG_SIGNATURE)) return 'image/jpeg';

  const isRiff = buffer.subarray(0, 4).toString('ascii') === 'RIFF';
  const isWebp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (isRiff && isWebp) return 'image/webp';

  return null;
}

const EXTENSION_BY_MIME = Object.freeze({
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
});

export function extensionForMime(mimeType) {
  return EXTENSION_BY_MIME[mimeType] ?? '';
}
