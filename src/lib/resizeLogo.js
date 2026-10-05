// Shrinks an uploaded logo to fit inside 256×256 pixels and returns it as a PNG Blob (or null if the
// browser can't read the image). Logos are shown small, so this keeps them tiny, uniform and fast —
// well below the bucket's 512 kB limit — and strips anything odd the original file may have carried.
const MAX_SIDE = 256

export async function resizeLogo(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}
