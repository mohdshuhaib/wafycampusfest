import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

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
    return NextResponse.json({ assignments: data || [] })
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
      rule_criterion_1,
      rule_criterion_2,
      rule_criterion_3,
      rule_criterion_4,
    } = body

    if (!judge_id || !event_id) {
      return NextResponse.json(
        { error: 'Judge and Programme/Event are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Upsert assignment with criteria rules
    const { data, error } = await supabase
      .from('judge_assignments')
      .upsert(
        {
          judge_id,
          event_id,
          rule_criterion_1: rule_criterion_1?.trim() || 'Criterion 1 Rule (Max 30)',
          rule_criterion_2: rule_criterion_2?.trim() || 'Criterion 2 Rule (Max 30)',
          rule_criterion_3: rule_criterion_3?.trim() || 'Criterion 3 Rule (Max 20)',
          rule_criterion_4: rule_criterion_4?.trim() || 'Criterion 4 Rule (Max 20)',
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

    return NextResponse.json({ assignment: data })
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
