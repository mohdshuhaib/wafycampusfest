import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createAdminClient()

    // 1. Fetch schedules with linked event details
    const { data: schedules, error: schedError } = await supabase
      .from("programme_schedules")
      .select(`
        id,
        programme_id,
        stage,
        schedule_date,
        start_time,
        end_time,
        programme:events (
          id,
          name,
          event_code,
          category,
          grade_type,
          topic,
          topic_language
        )
      `)
      .order("schedule_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (schedError) {
      console.error("Error fetching schedules:", schedError)
      return NextResponse.json({ error: schedError.message }, { status: 500 })
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ schedules: [] })
    }

    const scheduledEventIds = Array.from(new Set(schedules.map((s: any) => s.programme_id).filter(Boolean)))

    // 2. Fetch participations with student and team info
    const { data: participations } = await supabase
      .from("participations")
      .select(`
        id,
        event_id,
        student_id,
        team_id,
        students ( id, name, chest_no ),
        teams ( id, name, color_hex )
      `)
      .in("event_id", scheduledEventIds)
      .order("created_at", { ascending: true })

    // 3. Fetch event topics
    const { data: topics } = await supabase
      .from("event_topics")
      .select(`
        id,
        event_id,
        topic_type,
        topic_language,
        publish_type,
        scheduled_publish_time,
        general_topic,
        team_topics,
        participant_topics
      `)
      .in("event_id", scheduledEventIds)

    // 4. Fetch code letter records from site_assets
    const { data: assets } = await supabase
      .from("site_assets")
      .select("key, value")
      .like("key", "code_letter_event_%")

    // Map code letters by event_id
    const codeLetterMap = new Map<string, Record<string, string>>()
    if (assets) {
      assets.forEach((asset: any) => {
        try {
          const parsed = JSON.parse(asset.value)
          if (parsed && Array.isArray(parsed.assignments)) {
            const evId = parsed.event_id || asset.key.replace("code_letter_event_", "")
            const assignmentMap: Record<string, string> = {}
            parsed.assignments.forEach((a: any) => {
              if (a.participant_id && a.code_letter) {
                assignmentMap[a.participant_id] = a.code_letter
              }
            })
            codeLetterMap.set(evId, assignmentMap)
          }
        } catch {
          // ignore parsing error
        }
      })
    }

    // Map topics by event_id
    const topicsMap = new Map<string, any>()
    if (topics) {
      const now = new Date()
      topics.forEach((t: any) => {
        // Only include if immediate or scheduled time reached
        const isScheduled = t.publish_type === "scheduled" && t.scheduled_publish_time
        const isPublished = t.publish_type === "immediate" || (isScheduled && new Date(t.scheduled_publish_time) <= now)
        if (isPublished) {
          topicsMap.set(t.event_id, t)
        }
      })
    }

    // Map participations by event_id
    const participationsMap = new Map<string, any[]>()
    if (participations) {
      participations.forEach((p: any) => {
        if (!p.event_id) return
        if (!participationsMap.has(p.event_id)) {
          participationsMap.set(p.event_id, [])
        }
        participationsMap.get(p.event_id)!.push(p)
      })
    }

    // Merge into enhanced schedule objects
    const enrichedSchedules = schedules.map((item: any) => {
      const evId = item.programme_id
      const prog = item.programme || {}
      const eventCodeLetters = codeLetterMap.get(evId) || {}
      const rawParts = participationsMap.get(evId) || []
      const eventTopic = topicsMap.get(evId)

      // Format participants with code letters
      const participantsList = rawParts.map((p: any) => {
        const student = p.students || {}
        const team = p.teams || {}
        const studentId = p.student_id || student.id
        const teamId = p.team_id || team.id

        // Code letter could be mapped by student_id or team_id (for group items)
        const codeLetter = eventCodeLetters[studentId] || eventCodeLetters[teamId] || null

        return {
          id: p.id,
          student_id: studentId,
          student_name: student.name || "Participant",
          chest_no: student.chest_no || null,
          team_id: teamId,
          team_name: team.name || "Team",
          team_color: team.color_hex || "#64748B",
          code_letter: codeLetter,
        }
      })

      // Sort participants: by code letter if available (A, B, C...), otherwise by chest_no / name
      participantsList.sort((a: any, b: any) => {
        if (a.code_letter && b.code_letter) {
          return a.code_letter.localeCompare(b.code_letter)
        }
        if (a.code_letter) return -1
        if (b.code_letter) return 1
        return (a.chest_no || "").localeCompare(b.chest_no || "") || a.student_name.localeCompare(b.student_name)
      })

      // Topic extraction
      let topicInfo: any = null
      if (eventTopic) {
        topicInfo = {
          type: eventTopic.topic_type,
          language: eventTopic.topic_language,
          general_topic: eventTopic.general_topic,
          team_topics: eventTopic.team_topics,
          participant_topics: eventTopic.participant_topics,
        }
      } else if (prog.topic) {
        topicInfo = {
          type: "general",
          language: prog.topic_language || "english",
          general_topic: prog.topic,
          team_topics: null,
          participant_topics: null,
        }
      }

      return {
        id: item.id,
        programme_id: evId,
        stage: item.stage || "Stage 1",
        schedule_date: item.schedule_date,
        start_time: item.start_time,
        end_time: item.end_time,
        programme: {
          id: prog.id,
          name: prog.name,
          event_code: prog.event_code,
          category: prog.category,
          grade_type: prog.grade_type,
        },
        topic: topicInfo,
        participants: participantsList,
      }
    })

    return NextResponse.json({
      schedules: enrichedSchedules,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error("Schedule API unexpected error:", err)
    return NextResponse.json({ error: err.message || "Failed to load schedule" }, { status: 500 })
  }
}
