import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('id')
    const judgeIdParam = searchParams.get('judge_id')

    const cookieStore = await cookies()
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: authData } = await ssrClient.auth.getUser()
    const user = authData?.user

    // Allow judgeIdParam if passed, otherwise use authenticated user ID
    const effectiveJudgeId = judgeIdParam || user?.id

    const supabase = createAdminClient()

    if (assignmentId) {
      const { data: assignment, error: assignErr } = await supabase
        .from('judge_assignments')
        .select(`
          *,
          event:events (
            id,
            name,
            event_code,
            category,
            grade_type,
            applicable_section
          ),
          judge:judges (
            id,
            name,
            email
          )
        `)
        .eq('id', assignmentId)
        .single()

      if (assignErr) throw assignErr

      const assignmentData = assignment as any

      // Also fetch registered participants for this event to populate chest numbers / participant names
      let registeredParticipants: any[] = []
      if (assignmentData?.event_id) {
        const { data: parts } = await supabase
          .from('participations')
          .select(`
            id,
            student_id,
            student:students (
              id,
              name,
              chest_no,
              class_grade,
              team:teams (
                name,
                color_hex
              )
            ),
            team:teams (
              name,
              color_hex
            )
          `)
          .eq('event_id', assignmentData.event_id)

        registeredParticipants = (parts || []).map((p: any) => ({
          student_id: p.student_id,
          name: p.student?.name || 'Participant',
          chest_no: p.student?.chest_no || '',
          class_grade: p.student?.class_grade || '',
          team_name: p.student?.team?.name || p.team?.name || '',
          team_color: p.student?.team?.color_hex || p.team?.color_hex || '#D4AF37',
        })).filter((p) => Boolean(p.chest_no))
      }

      return NextResponse.json({
        assignment,
        registeredParticipants,
      })
    }

    if (!effectiveJudgeId) {
      return NextResponse.json(
        { error: 'User not authenticated or judge_id missing' },
        { status: 401 }
      )
    }

    // Get all assignments for this judge
    const { data: assignments, error } = await supabase
      .from('judge_assignments')
      .select(`
        *,
        event:events (
          id,
          name,
          event_code,
          category,
          grade_type,
          applicable_section
        )
      `)
      .eq('judge_id', effectiveJudgeId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Enrich with evaluations count
    const { data: evaluations } = await supabase
      .from('judge_evaluations')
      .select('id, assignment_id, event_id')
      .eq('judge_id', effectiveJudgeId)

    const evalList = (evaluations as any[]) || []
    const enriched = ((assignments as any[]) || []).map((a) => {
      const evalCount = evalList.filter((e) => e.assignment_id === a.id || e.event_id === a.event_id).length
      return {
        ...a,
        evaluations_count: evalCount,
      }
    })

    return NextResponse.json({ assignments: enriched })
  } catch (error: any) {
    console.error('Error in /api/judge/assignments:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}
