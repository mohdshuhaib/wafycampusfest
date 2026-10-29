import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { assignment_id, overall_remarks } = body

    if (!assignment_id) {
      return NextResponse.json(
        { error: 'assignment_id is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('judge_assignments')
      .update({
        overall_remarks: overall_remarks || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ assignment: data })
  } catch (error: any) {
    console.error('Error saving overall remarks:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save remarks' },
      { status: 500 }
    )
  }
}
