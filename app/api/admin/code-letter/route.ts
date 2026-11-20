import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("event_id")

    if (eventId) {
      // Fetch specific event code letter assignment
      const { data, error } = await supabase
        .from("site_assets")
        .select("key, value, updated_at")
        .eq("key", `code_letter_event_${eventId}`)
        .maybeSingle()

      if (error) throw error

      if (!data || !data.value) {
        return NextResponse.json({ record: null })
      }

      try {
        const parsed = JSON.parse(data.value)
        return NextResponse.json({ record: parsed })
      } catch (e) {
        return NextResponse.json({ record: null })
      }
    }

    // Fetch all code letter assignments
    const { data: assets, error } = await supabase
      .from("site_assets")
      .select("key, value, updated_at")
      .like("key", "code_letter_event_%")

    if (error) throw error

    const spinnedEventIds: string[] = []
    const records: Record<string, any> = {}

    if (assets) {
      for (const asset of assets) {
        try {
          const parsed = JSON.parse(asset.value)
          if (parsed && parsed.is_spinned) {
            const evId = parsed.event_id || asset.key.replace("code_letter_event_", "")
            spinnedEventIds.push(evId)
            records[evId] = parsed
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    return NextResponse.json({
      spinnedEventIds,
      records,
    })
  } catch (error: any) {
    console.error("Error fetching code letter assignments:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to fetch code letter assignments" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      event_id,
      event_name,
      grade_type,
      category,
      configured_letters,
      remaining_letters,
      assignments,
      is_spinned,
      completed,
    } = body

    if (!event_id) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const record = {
      event_id,
      event_name: event_name || "",
      grade_type: grade_type || "",
      category: category || "",
      configured_letters: configured_letters || [],
      remaining_letters: remaining_letters || [],
      assignments: assignments || [],
      is_spinned: Boolean(is_spinned),
      completed: Boolean(completed),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("site_assets").upsert(
      {
        key: `code_letter_event_${event_id}`,
        label: `Code Letter Assignment - ${event_name || event_id}`,
        type: "file",
        value: JSON.stringify(record),
        description: `Official Code Letter spin assignment for event ${event_id}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )

    if (error) throw error

    return NextResponse.json({ success: true, record })
  } catch (error: any) {
    console.error("Error saving code letter assignment:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to save code letter assignment" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("event_id")

    if (!eventId) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from("site_assets")
      .delete()
      .eq("key", `code_letter_event_${eventId}`)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting code letter assignment:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to delete code letter assignment" },
      { status: 500 }
    )
  }
}
