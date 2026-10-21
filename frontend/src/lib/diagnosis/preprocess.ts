export class ImageInputError extends Error {
  constructor(public reason: 'invalid_file' | 'decode_failed', message: string) { super(message); }
}

export async function validateImage(file: Blob): Promise<ImageBitmap> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) {
    throw new ImageInputError('invalid_file', 'Выберите JPEG, PNG или WebP размером до 10 МБ. HEIC и SVG пока не поддерживаются.');
  }
  let image: ImageBitmap;
  try { image = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw new ImageInputError('decode_failed', 'Не удалось открыть фотографию. Сохраните её в JPEG или выберите другой снимок.'); }
  if (!image.width || !image.height || image.width * image.height > 20_000_000) {
    image.close();
    throw new ImageInputError('invalid_file', 'Размер фотографии должен быть не больше 20 мегапикселей. Уменьшите снимок.');
  }
  return image;
}

export function preprocessImage(image: ImageBitmap): Float32Array {
  const scale = 256 / Math.min(image.width, image.height);
  const width = Math.round(image.width * scale), height = Math.round(image.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 224;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas unavailable');
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, 224, 224);
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
  context.drawImage(image, -Math.floor((width - 224) / 2), -Math.floor((height - 224) / 2), width, height);
  const pixels = context.getImageData(0, 0, 224, 224).data;
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  const result = new Float32Array(3 * 224 * 224);
  for (let i = 0; i < 224 * 224; i++) {
    for (let channel = 0; channel < 3; channel++) result[channel * 224 * 224 + i] = (pixels[i * 4 + channel] / 255 - mean[channel]) / std[channel];
  }
  return result;
}
