import { NextRequest, NextResponse } from "next/server"

function isAllowedImageHost(hostname: string) {
  return (
    hostname === "drive.google.com" ||
    hostname === "lh3.googleusercontent.com" ||
    hostname.endsWith(".googleusercontent.com") ||
    hostname.endsWith(".supabase.co") ||
    hostname.endsWith(".supabase.in")
  )
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing image URL" }, { status: 400 })
  }

  let imageUrl: URL
  try {
    imageUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 })
  }

  if (imageUrl.protocol !== "https:" || !isAllowedImageHost(imageUrl.hostname)) {
    return NextResponse.json({ error: "Image host is not allowed" }, { status: 400 })
  }

  const response = await fetch(imageUrl.toString(), {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 60 * 60 },
  })

  if (!response.ok) {
    return NextResponse.json({ error: "Unable to fetch image" }, { status: response.status })
  }

  const contentType = response.headers.get("content-type") || "image/jpeg"
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "URL did not return an image" }, { status: 400 })
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  })
}
