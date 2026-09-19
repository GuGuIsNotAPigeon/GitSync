import { invoke } from '@tauri-apps/api/core';

// 通过文件头魔数判断图片格式（后端返回的 base64 不带 MIME 信息）
function sniffMime(b64: string): string {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (b64.startsWith('R0lGOD')) return 'image/gif';
  if (b64.startsWith('UklGR')) return 'image/webp';
  if (b64.startsWith('Qk')) return 'image/bmp';
  return 'image/jpeg';
}

// 原图 base64 可能好几 MB，直接塞 localStorage（约 5MB 配额）会抛 QuotaExceeded，
// 且自定义背景目前只能存 localStorage。解码后等比缩到长边 ≤1920 再编码为
// JPEG（质量 0.85），体积通常能压到几百 KB
async function compressImageBase64(b64: string): Promise<string> {
  const img = new Image();
  img.src = `data:${sniffMime(b64)};base64,${b64}`;
  await img.decode();
  const maxDim = 1920;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  // 已经足够小就原样保留，避免重编码损失画质
  if (scale === 1 && b64.length < 1_500_000) return b64;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return b64;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1] ?? b64;
}

// 弹出文件选择器并返回压缩后的 base64。
// 用户取消/读取失败时 invoke 会抛错（取消信息含「取消」字样），由调用方决定提示方式
export async function pickBackgroundImage(): Promise<string> {
  const raw = await invoke<string>('pick_background_image');
  return compressImageBase64(raw);
}
