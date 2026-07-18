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
  return id ? `https://drive.google.com/uc?export=view&id=${id}` : trimmed
}

export function getImageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG"
}

export async function imageUrlToDataUrl(url?: string | null): Promise<string> {
  const viewUrl = toDriveImageViewUrl(url)
  if (!viewUrl || typeof window === "undefined") return ""

  try {
    const response = await fetch(viewUrl)
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
