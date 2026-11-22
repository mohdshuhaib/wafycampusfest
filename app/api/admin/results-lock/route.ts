import { NextRequest, NextResponse } from "next/server"
import { isResultsLocked, setResultsLocked } from "@/lib/results-lock"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const locked = await isResultsLocked()
    return NextResponse.json({ locked })
  } catch (error: any) {
    console.error("Error in GET /api/admin/results-lock:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to get lock status" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { locked } = body

    if (typeof locked !== "boolean") {
      return NextResponse.json(
        { error: "Invalid payload: 'locked' boolean is required." },
        { status: 400 }
      )
    }

    await setResultsLocked(locked)

    return NextResponse.json({
      success: true,
      locked,
      message: locked
        ? "Results locked! Curiosity / suspense mode is now active on the public site."
        : "Results unlocked! Official scores are now live and visible on the public site.",
    })
  } catch (error: any) {
    console.error("Error in POST /api/admin/results-lock:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to update lock status" },
      { status: 500 }
    )
  }
}
