import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const judgeId = searchParams.get('id')

    if (judgeId) {
      const { data: judge, error: judgeErr } = await supabase
        .from('judges')
        .select('*')
        .eq('id', judgeId)
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
        .eq('judge_id', judgeId)
        .order('created_at', { ascending: false })

      if (assignErr) throw assignErr

      return NextResponse.json({ judge, assignments: assignments || [] })
    }

    // List all judges with assignment counts
    const { data: judges, error: judgesErr } = await supabase
      .from('judges')
      .select('*')
      .order('name', { ascending: true })

    if (judgesErr) throw judgesErr

    // Fetch assignments for stats
    const { data: allAssignments } = await supabase
      .from('judge_assignments')
      .select('id, judge_id, event_id')

    const { data: allEvaluations } = await supabase
      .from('judge_evaluations')
      .select('id, judge_id, event_id')

    const assignmentsList = (allAssignments as any[]) || []
    const evaluationsList = (allEvaluations as any[]) || []

    const enriched = ((judges as any[]) || []).map((j) => {
      const assignedCount = assignmentsList.filter((a) => a.judge_id === j.id).length
      const evaluatedCount = evaluationsList.filter((e) => e.judge_id === j.id).length
      return {
        ...j,
        assigned_programmes_count: assignedCount,
        evaluations_count: evaluatedCount,
      }
    })

    return NextResponse.json({ judges: enriched })
  } catch (error: any) {
    console.error('Error fetching judges:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch judges' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'judge',
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // 2. Ensure profile exists or is updated
    try {
      await supabase.from('profiles').upsert(
        {
          id: userId,
          full_name: name,
          role: 'judge',
        } as any,
        { onConflict: 'id' }
      )
    } catch (profileErr) {
      console.warn('Profile upsert warning:', profileErr)
    }

    // 3. Insert into judges table
    const { data: judgeData, error: judgeInsertErr } = await supabase
      .from('judges')
      .insert({
        id: userId,
        user_id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
      })
      .select()
      .single()

    if (judgeInsertErr) {
      console.error('Judge record insert error:', judgeInsertErr)
      return NextResponse.json(
        { error: judgeInsertErr.message || 'Failed to record judge profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ judge: judgeData })
  } catch (error: any) {
    console.error('Error creating judge:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create judge' },
      { status: 500 }
    )
  }
}
