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

    // 3. Fetch Judge Evaluations
    const { data: rawJudgeEvals } = await supabase
      .from('judge_evaluations')
      .select(`
        id,
        event_id,
        chest_no,
        student_name,
        team_name,
        mark_criterion_1,
        mark_criterion_2,
        mark_criterion_3,
        mark_criterion_4,
        total_marks,
        grade,
        event:events (
          id,
          name,
          event_code,
          category
        )
      `)

    const teams = rawTeams || []
    const allParts = rawParts || []
    const judgeEvals = rawJudgeEvals || []

    // Map judge evaluations by event_id + chest_no
    const judgeEvalMap: Record<string, any> = {}
    judgeEvals.forEach((je: any) => {
      const key = `${je.event_id}_${(je.chest_no || '').trim().toUpperCase()}`
      judgeEvalMap[key] = je
    })

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

      if (cat === 'OFF STAGE') teamScoresMap[teamId].offStage += pts
      else if (cat === 'ON STAGE') teamScoresMap[teamId].onStage += pts
      else if (cat === 'GENERAL') teamScoresMap[teamId].general += pts
      else if (cat === 'SPECIAL') teamScoresMap[teamId].special += pts
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
    const detailedResults = publishedParts.map((p: any) => {
      const chestNo = p.student?.chest_no || ''
      const key = `${p.event_id}_${chestNo.trim().toUpperCase()}`
      const jEval = judgeEvalMap[key]

      const effectiveGrade = p.performance_grade || jEval?.grade || null
      const effectivePosition = p.result_position || null
      const effectivePoints = Number(p.points_earned || 0)
      const totalMarks = jEval?.total_marks ? Number(jEval.total_marks) : null

      return {
        id: p.id,
        chest_no: chestNo,
        student_name: p.student?.name || jEval?.student_name || 'Participant',
        team_name: p.team?.name || jEval?.team_name || 'Team',
        team_color: p.team?.color_hex || '#3b82f6',
        team_slug: p.team?.slug || '',
        event_id: p.event?.id || p.event_id,
        event_name: p.event?.name || 'Programme',
        event_code: p.event?.event_code || '',
        category: p.event?.category || 'OFF STAGE',
        points_earned: effectivePoints,
        total_marks: totalMarks,
        performance_grade: effectiveGrade,
        result_position: effectivePosition,
        has_result: Boolean(effectivePoints > 0 || effectiveGrade || effectivePosition || totalMarks !== null),
      }
    })

    // Sort detailed results: results with position/grade first, then by event code, then chest no
    detailedResults.sort((a: any, b: any) => {
      if (a.has_result && !b.has_result) return -1
      if (!a.has_result && b.has_result) return 1
      if (a.event_code !== b.event_code) return a.event_code.localeCompare(b.event_code)
      return (Number(a.chest_no) || 0) - (Number(b.chest_no) || 0)
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
