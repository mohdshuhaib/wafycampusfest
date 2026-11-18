import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  attachMarksToEvaluations,
  saveEvaluationMarks,
  calculateGrade,
} from '@/lib/judge-criteria'

export { calculateGrade }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignment_id')
    const judgeId = searchParams.get('judge_id')
    const eventId = searchParams.get('event_id')

    const supabase = createAdminClient()

    let query = supabase
      .from('judge_evaluations')
      .select('*')
      .order('created_at', { ascending: true })

    if (assignmentId) {
      query = query.eq('assignment_id', assignmentId)
    } else if (judgeId && eventId) {
      query = query.eq('judge_id', judgeId).eq('event_id', eventId)
    } else if (judgeId) {
      query = query.eq('judge_id', judgeId)
    } else if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query
    if (error) throw error

    const enriched = await attachMarksToEvaluations(supabase, data || [])

    return NextResponse.json({ evaluations: enriched })
  } catch (error: any) {
    console.error('Error fetching judge evaluations:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch evaluations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      assignment_id,
      judge_id,
      event_id,
      chest_no,
      student_id,
      student_name,
      team_name,
      marks, // Record<string, number>
      max_marks, // total max possible marks
      mark_criterion_1,
      mark_criterion_2,
      mark_criterion_3,
      mark_criterion_4,
      positive_remarks,
      negative_remarks,
    } = body

    if (!chest_no || !judge_id || !event_id) {
      return NextResponse.json(
        { error: 'Chest number, Judge ID, and Event ID are required' },
        { status: 400 }
      )
    }

    // Build consolidated marks dictionary
    const marksBreakdown: Record<string, number> = {}

    if (marks && typeof marks === 'object') {
      for (const [k, v] of Object.entries(marks)) {
        marksBreakdown[k] = Math.max(0, Number(v) || 0)
      }
    }

    const m1 = marksBreakdown.c1 !== undefined ? marksBreakdown.c1 : Math.max(0, Number(mark_criterion_1) || 0)
    const m2 = marksBreakdown.c2 !== undefined ? marksBreakdown.c2 : Math.max(0, Number(mark_criterion_2) || 0)
    const m3 = marksBreakdown.c3 !== undefined ? marksBreakdown.c3 : Math.max(0, Number(mark_criterion_3) || 0)
    const m4 = marksBreakdown.c4 !== undefined ? marksBreakdown.c4 : Math.max(0, Number(mark_criterion_4) || 0)

    marksBreakdown.c1 = m1
    marksBreakdown.c2 = m2
    marksBreakdown.c3 = m3
    marksBreakdown.c4 = m4

    // Sum all marks across all criteria
    const total_marks = Number(
      Object.values(marksBreakdown)
        .reduce((sum, current) => sum + current, 0)
        .toFixed(2)
    )

    const totalMax = Number(max_marks) || 100
    const grade = calculateGrade(total_marks, totalMax)

    const supabase = createAdminClient()

    // Resolve student and team details if not provided
    let resolvedStudentId = student_id || null
    let resolvedStudentName = student_name || null
    let resolvedTeamName = team_name || null

    if ((!resolvedStudentName || !resolvedTeamName) && chest_no) {
      const { data: student } = await supabase
        .from('students')
        .select(`
          id,
          name,
          team:teams (
            name
          )
        `)
        .eq('chest_no', chest_no.trim())
        .maybeSingle()

      const studentData = student as any
      if (studentData) {
        resolvedStudentId = studentData.id
        resolvedStudentName = resolvedStudentName || studentData.name
        resolvedTeamName = resolvedTeamName || studentData.team?.name || ''
      }
    }

    const payload: any = {
      assignment_id: assignment_id || null,
      judge_id,
      event_id,
      chest_no: chest_no.trim().toUpperCase(),
      student_id: resolvedStudentId,
      student_name: resolvedStudentName,
      team_name: resolvedTeamName,
      mark_criterion_1: m1,
      mark_criterion_2: m2,
      mark_criterion_3: m3,
      mark_criterion_4: m4,
      total_marks,
      grade,
      positive_remarks: (positive_remarks || '').trim(),
      negative_remarks: (negative_remarks || '').trim(),
      updated_at: new Date().toISOString(),
    }

    let resultData = null
    let resultErr = null

    if (id) {
      // Direct update by id
      const { data, error } = await supabase
        .from('judge_evaluations')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      resultData = data
      resultErr = error
    } else {
      // Upsert by (judge_id, event_id, chest_no)
      const { data, error } = await supabase
        .from('judge_evaluations')
        .upsert(payload, { onConflict: 'judge_id, event_id, chest_no' })
        .select()
        .single()
      resultData = data
      resultErr = error
    }

    if (resultErr) throw resultErr

    // Save full marks breakdown into site_assets
    if (resultData?.id) {
      await saveEvaluationMarks(supabase, resultData.id, marksBreakdown)
    }

    return NextResponse.json({
      evaluation: {
        ...resultData,
        marks_breakdown: marksBreakdown,
      },
    })
  } catch (error: any) {
    console.error('Error saving judge evaluation:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save evaluation' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Evaluation ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Delete marks breakdown from site_assets
    try {
      await supabase.from('site_assets').delete().eq('key', `judge_evaluation_marks_${id}`)
    } catch {
      // ignore
    }

    const { error } = await supabase
      .from('judge_evaluations')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting evaluation:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete evaluation' },
      { status: 500 }
    )
  }
}
