import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getPublishedEventIds } from '@/app/api/admin/publish-event/route'

export const dynamic = 'force-dynamic'

export interface TopStudentScorer {
  id: string
  name: string
  chest_no: string
  image_link: string | null
  team_name: string
  team_color: string
  team_slug: string
  total_points: number
  off_stage_points: number
  on_stage_points: number
  general_points: number
  special_points: number
  rank: number
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    // 0. Get Published Event IDs
    const publishedEventIds = await getPublishedEventIds()

    // 1. Fetch Teams
    const { data: rawTeams, error: teamsErr } = await supabase
      .from('teams')
      .select('id, name, slug, color_hex, penalty_points')
      .order('name', { ascending: true })

    if (teamsErr) throw teamsErr

    // 2. Fetch Participations with Events and Students (including student image_link)
    const { data: rawParts, error: partsErr } = await supabase
      .from('participations')
      .select(`
        id,
        event_id,
        team_id,
        student_id,
        points_earned,
        performance_grade,
        result_position,
        attendance_status,
        event:events (
          id,
          name,
          event_code,
          category,
          grade_type
        ),
        student:students (
          id,
          name,
          chest_no,
          class_grade,
          image_link
        ),
        team:teams (
          id,
          name,
          color_hex,
          slug
        )
      `)

    if (partsErr) throw partsErr

    const teams = rawTeams || []
    const allParts = rawParts || []

    // Filter participations strictly to PUBLISHED events
    const publishedParts = allParts.filter((p: any) => publishedEventIds.has(p.event_id))

    // Build team scores (only counting PUBLISHED events)
    const teamScoresMap: Record<string, {
      id: string
      name: string
      slug: string
      color_hex: string
      offStage: number
      onStage: number
      general: number
      special: number
      penalty: number
      total: number
    }> = {}

    teams.forEach((t: any) => {
      teamScoresMap[t.id] = {
        id: t.id,
        name: t.name,
        slug: t.slug,
        color_hex: t.color_hex || '#3b82f6',
        offStage: 0,
        onStage: 0,
        general: 0,
        special: 0,
        penalty: Number(t.penalty_points || 0),
        total: 0,
      }
    })

    // Accumulate points from published participations
    publishedParts.forEach((p: any) => {
      const teamId = p.team_id
      if (!teamScoresMap[teamId]) return

      const pts = Number(p.points_earned || 0)
      const cat = p.event?.category
      const gradeType = p.event?.grade_type

      // Always attribute General (Grade C) and Special (Grade D) points to their respective columns,
      // regardless of whether their stage category is "ON STAGE" or "OFF STAGE"
      if (gradeType === 'C' || cat === 'GENERAL') {
        teamScoresMap[teamId].general += pts
      } else if (gradeType === 'D' || cat === 'SPECIAL') {
        teamScoresMap[teamId].special += pts
      } else if (cat === 'OFF STAGE') {
        teamScoresMap[teamId].offStage += pts
      } else if (cat === 'ON STAGE') {
        teamScoresMap[teamId].onStage += pts
      }
    })

    // Compute totals
    const teamScores = Object.values(teamScoresMap).map((ts) => {
      const gross = ts.offStage + ts.onStage + ts.general + ts.special
      const net = Math.max(0, gross - ts.penalty)
      return {
        ...ts,
        total: net,
      }
    })

    // Check if any published results exist
    const hasAnyResults = teamScores.some((t) => t.total > 0)

    if (hasAnyResults) {
      teamScores.sort((a, b) => b.total - a.total)
    } else {
      // Default order: Telos (1st), Ethos (2nd), Thymos (3rd)
      const defaultOrder: Record<string, number> = {
        telos: 1,
        grp1: 1,
        ethos: 2,
        grp2: 2,
        thymos: 3,
        grp3: 3,
      }

      teamScores.sort((a, b) => {
        const orderA = defaultOrder[a.name.toLowerCase()] || defaultOrder[a.slug.toLowerCase()] || 99
        const orderB = defaultOrder[b.name.toLowerCase()] || defaultOrder[b.slug.toLowerCase()] || 99
        return orderA - orderB
      })
    }

    const rankedTeams = teamScores.map((t, idx) => ({
      ...t,
      rank: idx + 1,
    }))

    // Build TOP STUDENTS (Top Scorers) strictly from PUBLISHED events
    const studentScoreMap: Record<string, TopStudentScorer> = {}

    publishedParts.forEach((p: any) => {
      const student = p.student
      if (!student || !student.id) return

      const pts = Number(p.points_earned || 0)
      if (pts <= 0) return

      const cat = p.event?.category
      const gradeType = p.event?.grade_type

      // Exclude team events (Grade C / GENERAL and Grade D / SPECIAL) from individual student ranking
      if (cat === 'SPECIAL' || cat === 'GENERAL' || gradeType === 'C' || gradeType === 'D') return

      if (!studentScoreMap[student.id]) {
        studentScoreMap[student.id] = {
          id: student.id,
          name: student.name || 'Participant',
          chest_no: student.chest_no || '—',
          image_link: student.image_link || null,
          team_name: p.team?.name || 'Team',
          team_color: p.team?.color_hex || '#3b82f6',
          team_slug: p.team?.slug || '',
          total_points: 0,
          off_stage_points: 0,
          on_stage_points: 0,
          general_points: 0,
          special_points: 0,
          rank: 0,
        }
      }

      const st = studentScoreMap[student.id]
      st.total_points += pts
      if (cat === 'OFF STAGE') st.off_stage_points += pts
      else if (cat === 'ON STAGE') st.on_stage_points += pts
      else if (cat === 'GENERAL') st.general_points += pts
      else if (cat === 'SPECIAL') st.special_points += pts
    })

    const topStudentsList = Object.values(studentScoreMap)
      .filter((s) => s.total_points > 0)
      .sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points
        if (b.on_stage_points !== a.on_stage_points) return b.on_stage_points - a.on_stage_points
        return (Number(a.chest_no) || 0) - (Number(b.chest_no) || 0)
      })
      .map((s, idx) => ({
        ...s,
        rank: idx + 1,
      }))

    // Build Detailed Results for Individual & Item-wise display
    // ONLY show published events in results table as requested!
    // Fetch event metadata for all published events to guarantee clean structure
    const publishedIdsArray = Array.from(publishedEventIds)
    const { data: rawEvents } = publishedIdsArray.length > 0
      ? await supabase
          .from('events')
          .select('id, name, event_code, category, grade_type')
          .in('id', publishedIdsArray)
          .order('event_code', { ascending: true })
      : { data: [] }
    const publishedEventsList = rawEvents || []

    const detailedResults: any[] = []
    const positionOrder: Record<string, number> = { FIRST: 1, SECOND: 2, THIRD: 3 }

    publishedEventsList.forEach((ev: any) => {
      const isTeamEvent =
        ev.grade_type === 'C' ||
        ev.grade_type === 'D' ||
        ev.category === 'GENERAL' ||
        ev.category === 'SPECIAL'

      const effectiveCategory =
        ev.grade_type === 'C'
          ? 'GENERAL'
          : ev.grade_type === 'D'
          ? 'SPECIAL'
          : ev.category || 'OFF STAGE'

      if (isTeamEvent) {
        // Team Event: ONLY show teams, NEVER show student participants
        // For each team in teams, find its participation or create placeholder so 1,2,3 and 4th team appear
        const teamEventResults: any[] = []

        teams.forEach((t: any) => {
          const part = publishedParts.find(
            (p: any) => p.event_id === ev.id && !p.student_id && p.team_id === t.id
          )

          const effectivePoints = part ? Number(part.points_earned || 0) : 0
          const effectiveGrade =
            part && part.performance_grade && part.performance_grade !== 'NONE'
              ? part.performance_grade
              : null
          const effectivePosition = part?.result_position || null

          teamEventResults.push({
            id: part?.id || `team-${t.id}-${ev.id}`,
            chest_no: '',
            student_name: t.name,
            team_name: t.name,
            team_color: t.color_hex || '#3b82f6',
            team_slug: t.slug || '',
            event_id: ev.id,
            event_name: ev.name,
            event_code: ev.event_code || '',
            category: effectiveCategory,
            stage_type: ev.category || 'OFF STAGE',
            grade_type: ev.grade_type,
            points_earned: effectivePoints,
            performance_grade: effectiveGrade,
            result_position: effectivePosition,
            has_result: Boolean(effectivePoints > 0 || effectiveGrade || effectivePosition),
            image_link: null,
            is_team_entry: true,
          })
        })

        // Sort teams: 1st, 2nd, 3rd, then by points, then by name
        teamEventResults.sort((a, b) => {
          const rankA = a.result_position ? positionOrder[a.result_position] || 9 : 9
          const rankB = b.result_position ? positionOrder[b.result_position] || 9 : 9
          if (rankA !== rankB) return rankA - rankB
          if (b.points_earned !== a.points_earned) return b.points_earned - a.points_earned
          return a.team_name.localeCompare(b.team_name)
        })

        detailedResults.push(...teamEventResults)
      } else {
        // Individual Event: ONLY show student participants
        const studentParts = publishedParts.filter(
          (p: any) => p.event_id === ev.id && p.student_id
        )

        const studentResults = studentParts.map((p: any) => {
          const chestNo = p.student?.chest_no || ''
          const effectiveGrade =
            p.performance_grade && p.performance_grade !== 'NONE' ? p.performance_grade : null
          const effectivePosition = p.result_position || null
          const effectivePoints = Number(p.points_earned || 0)

          return {
            id: p.id,
            chest_no: chestNo,
            student_name: p.student?.name || 'Participant',
            team_name: p.team?.name || 'Team',
            team_color: p.team?.color_hex || '#3b82f6',
            team_slug: p.team?.slug || '',
            event_id: ev.id,
            event_name: ev.name,
            event_code: ev.event_code || '',
            category: effectiveCategory,
            stage_type: ev.category || 'OFF STAGE',
            grade_type: ev.grade_type,
            points_earned: effectivePoints,
            performance_grade: effectiveGrade,
            result_position: effectivePosition,
            has_result: Boolean(effectivePoints > 0 || effectiveGrade || effectivePosition),
            image_link: p.student?.image_link || null,
            is_team_entry: false,
          }
        })

        // Sort: FIRST, SECOND, THIRD, then points, then chest_no
        studentResults.sort((a, b) => {
          const rankA = a.result_position ? positionOrder[a.result_position] || 9 : 9
          const rankB = b.result_position ? positionOrder[b.result_position] || 9 : 9
          if (rankA !== rankB) return rankA - rankB
          if (b.points_earned !== a.points_earned) return b.points_earned - a.points_earned
          return (Number(a.chest_no) || 0) - (Number(b.chest_no) || 0)
        })

        detailedResults.push(...studentResults)
      }
    })

    return NextResponse.json({
      teams: rankedTeams,
      hasAnyResults,
      topStudents: topStudentsList,
      detailedResults,
      publishedEventsCount: publishedEventIds.size,
      totalEvents: new Set(allParts.map((p: any) => p.event_id)).size,
      totalParticipants: new Set(allParts.map((p: any) => p.student_id)).size,
    })
  } catch (error: any) {
    console.error('Error in /api/public/results:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to load public results' },
      { status: 500 }
    )
  }
}
