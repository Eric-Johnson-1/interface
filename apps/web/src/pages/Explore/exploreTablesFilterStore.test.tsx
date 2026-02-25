import { describe, expect, it } from 'vitest'
import { TimePeriod } from '~/appGraphql/data/util'
import { createExploreTablesFilterStore } from '~/pages/Explore/exploreTablesFilterStore'

describe('exploreTablesFilterStore', () => {
  it('starts with empty filterString and DAY timePeriod', () => {
    const store = createExploreTablesFilterStore()
    const state = store.getState()

    expect(state.filterString).toBe('')
    expect(state.timePeriod).toBe(TimePeriod.DAY)
  })
})
