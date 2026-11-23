const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
const MAX_COVER_BYTES = 512 * 1024;

function encodeJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob?.type === 'image/jpeg') resolve(blob);
      else reject(new Error('This photo could not be saved as JPEG.'));
    }, 'image/jpeg', quality);
  });
}

export async function prepareTrailCover(file) {
  if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_ORIGINAL_BYTES) {
    throw new Error('Choose a JPG, PNG or WebP photo up to 20 MB.');
  }
  const image = new Image();
  const previewUrl = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('This photo could not be opened.'));
      image.src = previewUrl;
    });
    const scale = Math.min(1, 1200 / image.naturalWidth, 900 / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('This browser could not prepare the photo.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let cover = await encodeJpeg(canvas, 0.82);
    if (cover.size > MAX_COVER_BYTES) cover = await encodeJpeg(canvas, 0.6);
    if (cover.size > MAX_COVER_BYTES) {
      throw new Error('Choose a smaller cover photo.');
    }
    return cover;
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
}
