// Normalizes any picked photo to a browser-friendly JPEG:
// iPhone/Mac photos arrive as HEIC, which Chrome can neither preview nor
// display, and camera photos can be huge — convert + downscale client-side.
export async function prepareImage(file: File): Promise<File> {
  const isHeic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
  let work: Blob = file
  let converted = false

  if (isHeic) {
    const heic2any = (await import('heic2any')).default
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
    work = Array.isArray(out) ? out[0] : out
    converted = true
  }

  try {
    const bmp = await createImageBitmap(work)
    const MAX = 1600
    const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height))
    if (scale < 1 || work.size > 1_500_000) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bmp.width * scale)
      canvas.height = Math.round(bmp.height * scale)
      canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
      work = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', 0.85)
      )
      converted = true
    }
    bmp.close()
  } catch {
    // decoding failed — keep whatever we have
  }

  if (!converted) return file
  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([work], `${base}.jpg`, { type: 'image/jpeg' })
}
