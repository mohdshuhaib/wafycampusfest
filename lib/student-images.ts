export function getGoogleDriveFileId(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  const filePathMatch = trimmed.match(/\/file\/d\/([^/?#]+)/)
  if (filePathMatch?.[1]) return filePathMatch[1]

  try {
    const parsed = new URL(trimmed)
    const id = parsed.searchParams.get("id")
    if (id) return id
  } catch {
    return null
  }

  return null
}

export function toDriveImageViewUrl(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  const id = getGoogleDriveFileId(trimmed)
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : trimmed
}

export function getImageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG"
}

export async function imageUrlToDataUrl(url?: string | null): Promise<string> {
  const viewUrl = toDriveImageViewUrl(url)
  if (!viewUrl || typeof window === "undefined") return ""

  try {
    const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(viewUrl)}`)
    if (!response.ok) return ""

    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result || ""))
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.warn("Unable to embed student image:", error)
    return ""
  }
}

export async function getCroppedSquareImageDataUrl(url?: string | null, targetSize: number = 300): Promise<string> {
  const dataUrl = await imageUrlToDataUrl(url)
  if (!dataUrl || typeof window === "undefined") return ""

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = targetSize
        canvas.height = targetSize
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        const srcWidth = img.width
        const srcHeight = img.height
        const minDim = Math.min(srcWidth, srcHeight)
        const srcX = (srcWidth - minDim) / 2
        const srcY = (srcHeight - minDim) / 2

        ctx.drawImage(img, srcX, srcY, minDim, minDim, 0, 0, targetSize, targetSize)
        resolve(canvas.toDataURL("image/jpeg", 0.92))
      } catch (e) {
        console.warn("Canvas cropping failed, using original data URL:", e)
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
