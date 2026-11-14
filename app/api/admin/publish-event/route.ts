import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

// Helper to get published event IDs from site_assets & events table
export async function getPublishedEventIds(): Promise<Set<string>> {
  const supabase = createAdminClient()
  const publishedSet = new Set<string>()

  // 1. Try reading from events table column if available
  try {
    const { data: eventsData, error: eventsErr } = await supabase
      .from("events")
      .select("id, is_published")
      .eq("is_published", true)

    if (!eventsErr && eventsData) {
      eventsData.forEach((e: any) => publishedSet.add(e.id))
    }
  } catch (err) {
    // Column might not exist yet if migration hasn't been run
  }

  // 2. Read from site_assets fallback
  try {
    const { data: assetData } = await supabase
      .from("site_assets")
      .select("value")
      .eq("key", "published_event_ids")
      .maybeSingle()

    if (assetData?.value) {
      const parsed = JSON.parse(assetData.value)
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => publishedSet.add(id))
      }
    }
  } catch (err) {
    console.error("Error reading published_event_ids from site_assets:", err)
  }

  return publishedSet
}

// Helper to save published event IDs to site_assets & events table
export async function savePublishedEventIds(idsSet: Set<string>): Promise<void> {
  const supabase = createAdminClient()
  const idsArray = Array.from(idsSet)

  // 1. Save to site_assets
  try {
    const { error: upsertErr } = await supabase.from("site_assets").upsert(
      {
        key: "published_event_ids",
        label: "Published Event IDs",
        type: "file",
        value: JSON.stringify(idsArray),
        description: "List of event IDs whose results are officially published on the public portal.",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )

    if (upsertErr) {
      console.warn("Failed to update site_assets published_event_ids:", upsertErr)
    }
  } catch (err) {
    console.warn("site_assets upsert failed:", err)
  }

  // 2. Try updating events.is_published column if it exists
  try {
    // First, set all to false
    await supabase.from("events").update({ is_published: false }).neq("id", "00000000-0000-0000-0000-000000000000")
    // Then set published ones to true
    if (idsArray.length > 0) {
      await supabase.from("events").update({ is_published: true }).in("id", idsArray)
    }
  } catch (err) {
    // Column might not exist yet
  }
}

// GET: Returns list of all events with their marked status, winner count, and published status
export async function GET() {
  try {
    const supabase = createAdminClient()
    const publishedSet = await getPublishedEventIds()

    // 1. Fetch events
    const { data: rawEvents, error: evtsErr } = await supabase
      .from("events")
      .select("id, name, event_code, category, grade_type")
      .order("event_code", { ascending: true })

    if (evtsErr) throw evtsErr

    const events = rawEvents || []
    const eventIds = events.map((e: any) => e.id)

    // 2. Fetch participations that have marked scores or positions from Scoring Studio
    const { data: rawParts } = await supabase
      .from("participations")
      .select(`
        id,
        event_id,
        result_position,
        performance_grade,
        points_earned,
        student:students ( id, name, chest_no ),
        team:teams ( id, name, color_hex )
      `)
      .in("event_id", eventIds)

    const parts = rawParts || []

    // Group results by event
    const eventResultsMap: Record<string, {
      totalParticipants: number
      evaluatedCount: number
      firstWinner: string | null
      secondWinner: string | null
      thirdWinner: string | null
    }> = {}

    events.forEach((e: any) => {
      eventResultsMap[e.id] = {
        totalParticipants: 0,
        evaluatedCount: 0,
        firstWinner: null,
        secondWinner: null,
        thirdWinner: null,
      }
    })

    parts.forEach((p: any) => {
      const stats = eventResultsMap[p.event_id]
      if (!stats) return
      stats.totalParticipants += 1

      const hasPosition = Boolean(p.result_position)
      const hasGrade = Boolean(p.performance_grade && p.performance_grade !== "NONE")
      const hasPoints = Number(p.points_earned || 0) > 0

      // Only count as evaluated if officially marked in Scoring Studio
      if (hasPosition || hasGrade || hasPoints) {
        stats.evaluatedCount += 1
      }

      const participantLabel = p.student
        ? `${p.student.name} (#${p.student.chest_no || "—"})`
        : p.team?.name || "Team"

      if (p.result_position === "FIRST" && !stats.firstWinner) {
        stats.firstWinner = participantLabel
      } else if (p.result_position === "SECOND" && !stats.secondWinner) {
        stats.secondWinner = participantLabel
      } else if (p.result_position === "THIRD" && !stats.thirdWinner) {
        stats.thirdWinner = participantLabel
      }
    })

    // Construct enriched list
    const enrichedEvents = events.map((e: any) => {
      const stats = eventResultsMap[e.id] || {
        totalParticipants: 0,
        evaluatedCount: 0,
        firstWinner: null,
        secondWinner: null,
        thirdWinner: null,
      }

      const isMarked = stats.evaluatedCount > 0 || Boolean(stats.firstWinner)
      const isPublished = publishedSet.has(e.id)

      return {
        id: e.id,
        name: e.name,
        event_code: e.event_code || "—",
        category: e.category,
        grade_type: e.grade_type,
        is_marked: isMarked,
        is_published: isPublished,
        total_participants: stats.totalParticipants,
        evaluated_count: stats.evaluatedCount,
        first_winner: stats.firstWinner,
        second_winner: stats.secondWinner,
        third_winner: stats.thirdWinner,
      }
    })

    return NextResponse.json({
      events: enrichedEvents,
      totalEvents: events.length,
      publishedCount: publishedSet.size,
      markedCount: enrichedEvents.filter((e) => e.is_marked).length,
    })
  } catch (error: any) {
    console.error("Error in GET /api/admin/publish-event:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to load events for publishing" },
      { status: 500 }
    )
  }
}

// POST: Toggles or sets publish state for event(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, eventIds, isPublished } = body

    const targetIds: string[] = []
    if (eventId) targetIds.push(eventId)
    if (Array.isArray(eventIds)) targetIds.push(...eventIds)

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "Missing eventId or eventIds" }, { status: 400 })
    }

    const currentPublished = await getPublishedEventIds()

    targetIds.forEach((id) => {
      if (isPublished) {
        currentPublished.add(id)
      } else {
        currentPublished.delete(id)
      }
    })

    await savePublishedEventIds(currentPublished)

    return NextResponse.json({
      success: true,
      updatedIds: targetIds,
      isPublished: Boolean(isPublished),
      publishedCount: currentPublished.size,
    })
  } catch (error: any) {
    console.error("Error in POST /api/admin/publish-event:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to update publish status" },
      { status: 500 }
    )
  }
}
