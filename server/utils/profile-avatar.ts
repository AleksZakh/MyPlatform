import sharp from 'sharp';
import { createError } from 'h3';
export const AVATAR_UPLOAD_LIMIT = 5 * 1024 * 1024;
export async function normalizeAvatar(input: Buffer) {
 if (!input.length || input.length > AVATAR_UPLOAD_LIMIT) throw createError({ statusCode: 413, message: 'Размер фото должен быть не больше 5 МБ.' });
 try {
  const options = { limitInputPixels: 16000000, failOn: 'warning' as const };
  const metadata = await sharp(input, options).metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) !== 1) throw new Error('format');
  const image = await sharp(input, options).rotate().resize(256, 256, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer();
  if (image.length > 524288) throw new Error('size');
  return image;
 } catch { throw createError({ statusCode: 400, message: 'Выберите обычное фото JPEG, PNG или WebP размером до 16 мегапикселей.' }); }
}
