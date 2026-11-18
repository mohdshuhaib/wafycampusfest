import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  attachCriteriaToAssignments,
  saveAssignmentCriteria,
  Criterion,
  DEFAULT_CRITERIA,
} from '@/lib/judge-criteria'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const judgeId = searchParams.get('judge_id')
    const eventId = searchParams.get('event_id')

    let query = supabase
      .from('judge_assignments')
      .select(`
        *,
        event:events (
          id,
          name,
          event_code,
          category
        ),
        judge:judges (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (judgeId) {
      query = query.eq('judge_id', judgeId)
    }
    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query

    if (error) throw error

    const enriched = await attachCriteriaToAssignments(supabase, data || [])

    return NextResponse.json({ assignments: enriched })
  } catch (error: any) {
    console.error('Error fetching judge assignments:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      judge_id,
      event_id,
      manual_event,
      criteria,
      rule_criterion_1,
      rule_criterion_2,
      rule_criterion_3,
      rule_criterion_4,
    } = body

    if (!judge_id) {
      return NextResponse.json({ error: 'Judge is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    let effectiveEventId = event_id

    // 1. Create event manually if requested
    if (manual_event && manual_event.name?.trim()) {
      const eventName = manual_event.name.trim()
      const eventCategory = manual_event.category || 'ON STAGE'
      const eventCode = manual_event.event_code?.trim() || `EV-${Math.floor(1000 + Math.random() * 9000)}`
      const gradeType =
        eventCategory === 'GENERAL'
          ? 'C'
          : eventCategory === 'SPECIAL'
          ? 'D'
          : manual_event.grade_type || 'A'

      // Check if event with this code or name already exists
      const { data: existingEvent } = await supabase
        .from('events')
        .select('id')
        .or(`event_code.eq.${eventCode},name.ilike.${eventName}`)
        .maybeSingle()

      if (existingEvent) {
        effectiveEventId = existingEvent.id
      } else {
        const { data: createdEvent, error: createEventErr } = await (supabase.from('events') as any)
          .insert({
            name: eventName,
            event_code: eventCode,
            category: eventCategory,
            grade_type: gradeType,
            max_participants_per_team: 1,
            applicable_section: ['Senior'],
            description: manual_event.description || null,
          })
          .select()
          .single()

        if (createEventErr) {
          throw new Error(`Failed to create manual event: ${createEventErr.message}`)
        }
        effectiveEventId = createdEvent.id
      }
    }

    if (!effectiveEventId) {
      return NextResponse.json(
        { error: 'Programme / Event is required' },
        { status: 400 }
      )
    }

    // 2. Resolve Criteria
    const criteriaList: Criterion[] = Array.isArray(criteria) && criteria.length > 0
      ? criteria
      : [
          {
            id: 'c1',
            name: rule_criterion_1?.trim() || 'Criterion 1 Rule (Max 30)',
            maxMarks: 30,
          },
          {
            id: 'c2',
            name: rule_criterion_2?.trim() || 'Criterion 2 Rule (Max 30)',
            maxMarks: 30,
          },
          {
            id: 'c3',
            name: rule_criterion_3?.trim() || 'Criterion 3 Rule (Max 20)',
            maxMarks: 20,
          },
          {
            id: 'c4',
            name: rule_criterion_4?.trim() || 'Criterion 4 Rule (Max 20)',
            maxMarks: 20,
          },
        ]

    const r1 = criteriaList[0]?.name || rule_criterion_1?.trim() || 'Criterion 1 Rule (Max 30)'
    const r2 = criteriaList[1]?.name || rule_criterion_2?.trim() || 'Criterion 2 Rule (Max 30)'
    const r3 = criteriaList[2]?.name || rule_criterion_3?.trim() || 'Criterion 3 Rule (Max 20)'
    const r4 = criteriaList[3]?.name || rule_criterion_4?.trim() || 'Criterion 4 Rule (Max 20)'

    // Upsert assignment with criteria rules
    const { data, error } = await supabase
      .from('judge_assignments')
      .upsert(
        {
          judge_id,
          event_id: effectiveEventId,
          rule_criterion_1: r1,
          rule_criterion_2: r2,
          rule_criterion_3: r3,
          rule_criterion_4: r4,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'judge_id, event_id' }
      )
      .select(`
        *,
        event:events (
          id,
          name,
          event_code,
          category
        )
      `)
      .single()

    if (error) throw error

    // Save full dynamic criteria to site_assets
    await saveAssignmentCriteria(supabase, data.id, criteriaList)

    return NextResponse.json({
      assignment: {
        ...data,
        criteria: criteriaList,
      },
    })
  } catch (error: any) {
    console.error('Error assigning programme to judge:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to assign programme' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Delete associated evaluations first
    await supabase.from('judge_evaluations').delete().eq('assignment_id', id)

    // Delete assignment criteria from site_assets
    try {
      await supabase.from('site_assets').delete().eq('key', `judge_assignment_criteria_${id}`)
    } catch {
      // ignore
    }

    const { error } = await supabase
      .from('judge_assignments')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing assignment:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to remove assignment' },
      { status: 500 }
    )
  }
}
