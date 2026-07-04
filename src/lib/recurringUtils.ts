export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function nextOccurrenceAfter(
  after: Date,
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'yearly',
  dayOfMonth: number | null,
  dayOfWeek: number | null,
  monthOfYear: number | null,
  startDate: Date
): Date {
  switch (frequency) {
    case 'monthly': {
      let candidate = new Date(after.getFullYear(), after.getMonth(), dayOfMonth!)
      if (candidate <= after) {
        candidate = new Date(after.getFullYear(), after.getMonth() + 1, dayOfMonth!)
      }
      return candidate
    }

    case 'weekly': {
      const candidate = new Date(after.getFullYear(), after.getMonth(), after.getDate())
      do {
        candidate.setDate(candidate.getDate() + 1)
      } while (candidate.getDay() !== dayOfWeek!)
      return candidate
    }

    case 'biweekly': {
      // Anchor = first occurrence of dayOfWeek on or after startDate
      const anchor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
      while (anchor.getDay() !== dayOfWeek!) {
        anchor.setDate(anchor.getDate() + 1)
      }

      const candidate = new Date(after.getFullYear(), after.getMonth(), after.getDate())
      candidate.setDate(candidate.getDate() + 1)
      while (candidate.getDay() !== dayOfWeek!) {
        candidate.setDate(candidate.getDate() + 1)
      }

      const diffDays = Math.round((candidate.getTime() - anchor.getTime()) / 86400000)
      if (diffDays % 14 !== 0) {
        candidate.setDate(candidate.getDate() + 7)
      }
      return candidate
    }

    case 'yearly': {
      let candidate = new Date(after.getFullYear(), monthOfYear! - 1, dayOfMonth!)
      if (candidate <= after) {
        candidate = new Date(after.getFullYear() + 1, monthOfYear! - 1, dayOfMonth!)
      }
      return candidate
    }
  }
}
