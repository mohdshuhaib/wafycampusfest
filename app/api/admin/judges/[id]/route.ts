import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: judge, error: judgeErr } = await supabase
      .from('judges')
      .select('*')
      .eq('id', id)
      .single()

    if (judgeErr) throw judgeErr

    // Fetch assignments with event details
    const { data: assignments, error: assignErr } = await supabase
      .from('judge_assignments')
      .select(`
        *,
        event:events (
          id,
          name,
          event_code,
          category
        )
      `)
      .eq('judge_id', id)
      .order('created_at', { ascending: false })

    if (assignErr) throw assignErr

    // Fetch all evaluations by this judge
    const { data: evaluations, error: evalErr } = await supabase
      .from('judge_evaluations')
      .select('*')
      .eq('judge_id', id)
      .order('created_at', { ascending: true })

    if (evalErr) throw evalErr

    return NextResponse.json({
      judge,
      assignments: assignments || [],
      evaluations: evaluations || [],
    })
  } catch (error: any) {
    console.error('Error fetching judge details:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch judge details' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // 1. Delete assignments & evaluations (cascaded if FK set, or explicit)
    await supabase.from('judge_evaluations').delete().eq('judge_id', id)
    await supabase.from('judge_assignments').delete().eq('judge_id', id)
    await supabase.from('judges').delete().eq('id', id)

    // 2. Delete Supabase Auth user
    try {
      await supabase.auth.admin.deleteUser(id)
    } catch (authErr) {
      console.warn('Auth user delete warning:', authErr)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting judge:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete judge' },
      { status: 500 }
    )
  }
}
