import { SupabaseClient } from '@supabase/supabase-js'

export interface Criterion {
  id: string
  name: string
  maxMarks: number
}

export const DEFAULT_CRITERIA: Criterion[] = [
  { id: 'c1', name: 'Content & Structure', maxMarks: 30 },
  { id: 'c2', name: 'Clarity & Expression', maxMarks: 30 },
  { id: 'c3', name: 'Timing & Discipline', maxMarks: 20 },
  { id: 'c4', name: 'Overall Impact & Accuracy', maxMarks: 20 },
]

export function extractMaxMarks(ruleText: string, defaultMax: number): number {
  if (!ruleText) return defaultMax
  const match = ruleText.match(/max\s*(\d+)/i) || ruleText.match(/\((\d+)\)/)
  if (match && match[1]) {
    const num = parseInt(match[1], 10)
    if (!isNaN(num) && num > 0) return num
  }
  return defaultMax
}

export function buildFallbackCriteria(assignment: any): Criterion[] {
  return [
    {
      id: 'c1',
      name: assignment?.rule_criterion_1 || 'Criterion 1',
      maxMarks: extractMaxMarks(assignment?.rule_criterion_1, 30),
    },
    {
      id: 'c2',
      name: assignment?.rule_criterion_2 || 'Criterion 2',
      maxMarks: extractMaxMarks(assignment?.rule_criterion_2, 30),
    },
    {
      id: 'c3',
      name: assignment?.rule_criterion_3 || 'Criterion 3',
      maxMarks: extractMaxMarks(assignment?.rule_criterion_3, 20),
    },
    {
      id: 'c4',
      name: assignment?.rule_criterion_4 || 'Criterion 4',
      maxMarks: extractMaxMarks(assignment?.rule_criterion_4, 20),
    },
  ]
}

export function calculateGrade(totalMarks: number, maxMarks: number = 100): string {
  const percentage = maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  return 'None'
}

/**
 * Fetch and attach dynamic criteria to assignments
 */
export async function attachCriteriaToAssignments(
  supabase: SupabaseClient<any, any>,
  assignments: any[]
): Promise<any[]> {
  if (!assignments || assignments.length === 0) return []

  const keys = assignments.map((a) => `judge_assignment_criteria_${a.id}`)

  try {
    const { data: assets } = await supabase
      .from('site_assets')
      .select('key, value')
      .in('key', keys)

    const criteriaMap = new Map<string, Criterion[]>()
    if (assets) {
      for (const asset of assets) {
        try {
          const parsed = JSON.parse(asset.value)
          if (Array.isArray(parsed) && parsed.length > 0) {
            criteriaMap.set(asset.key, parsed)
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    return assignments.map((a) => {
      const key = `judge_assignment_criteria_${a.id}`
      const criteria = criteriaMap.get(key) || buildFallbackCriteria(a)
      return {
        ...a,
        criteria,
      }
    })
  } catch (err) {
    console.error('Error attaching criteria to assignments:', err)
    return assignments.map((a) => ({
      ...a,
      criteria: buildFallbackCriteria(a),
    }))
  }
}

/**
 * Save dynamic criteria for an assignment in site_assets
 */
export async function saveAssignmentCriteria(
  supabase: SupabaseClient<any, any>,
  assignmentId: string,
  criteria: Criterion[]
) {
  if (!assignmentId || !criteria || criteria.length === 0) return

  await supabase.from('site_assets').upsert(
    {
      key: `judge_assignment_criteria_${assignmentId}`,
      label: 'Judge Assignment Criteria',
      type: 'assignment_criteria',
      value: JSON.stringify(criteria),
      description: `Criteria configuration for judge assignment ${assignmentId}`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )
}

/**
 * Fetch and attach extra marks breakdown to evaluations
 */
export async function attachMarksToEvaluations(
  supabase: SupabaseClient<any, any>,
  evaluations: any[]
): Promise<any[]> {
  if (!evaluations || evaluations.length === 0) return []

  const keys = evaluations.map((e) => `judge_evaluation_marks_${e.id}`)

  try {
    const { data: assets } = await supabase
      .from('site_assets')
      .select('key, value')
      .in('key', keys)

    const marksMap = new Map<string, Record<string, number>>()
    if (assets) {
      for (const asset of assets) {
        try {
          const parsed = JSON.parse(asset.value)
          if (parsed && typeof parsed === 'object') {
            marksMap.set(asset.key, parsed)
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    return evaluations.map((e) => {
      const key = `judge_evaluation_marks_${e.id}`
      const extraMarks = marksMap.get(key) || {}
      const marks_breakdown: Record<string, number> = {
        c1: Number(e.mark_criterion_1) || 0,
        c2: Number(e.mark_criterion_2) || 0,
        c3: Number(e.mark_criterion_3) || 0,
        c4: Number(e.mark_criterion_4) || 0,
        ...extraMarks,
      }

      return {
        ...e,
        marks_breakdown,
      }
    })
  } catch (err) {
    console.error('Error attaching marks to evaluations:', err)
    return evaluations.map((e) => ({
      ...e,
      marks_breakdown: {
        c1: Number(e.mark_criterion_1) || 0,
        c2: Number(e.mark_criterion_2) || 0,
        c3: Number(e.mark_criterion_3) || 0,
        c4: Number(e.mark_criterion_4) || 0,
      },
    }))
  }
}

/**
 * Save extra marks breakdown for an evaluation in site_assets
 */
export async function saveEvaluationMarks(
  supabase: SupabaseClient<any, any>,
  evaluationId: string,
  marksBreakdown: Record<string, number>
) {
  if (!evaluationId || !marksBreakdown) return

  await supabase.from('site_assets').upsert(
    {
      key: `judge_evaluation_marks_${evaluationId}`,
      label: 'Judge Evaluation Marks',
      type: 'evaluation_marks',
      value: JSON.stringify(marksBreakdown),
      description: `Evaluation marks breakdown for evaluation ${evaluationId}`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )
}
