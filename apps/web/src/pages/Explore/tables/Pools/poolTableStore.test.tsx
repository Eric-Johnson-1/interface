import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { describe, expect, it } from 'vitest'
import { PoolSortFields } from '~/appGraphql/data/pools/useTopPools'
import { createPoolTableStore } from '~/pages/Explore/tables/Pools/poolTableStore'

describe('poolTableStore', () => {
  it('starts with TVL, sortAscending false, and UNSPECIFIED protocol', () => {
    const store = createPoolTableStore()
    const state = store.getState()

    expect(state.sortMethod).toBe(PoolSortFields.TVL)
    expect(state.sortAscending).toBe(false)
    expect(state.selectedProtocol).toBe(ProtocolVersion.UNSPECIFIED)
  })

  it('setSort with a new category sets sortMethod and resets sortAscending to false', () => {
    const store = createPoolTableStore()

    store.getState().actions.setSort(PoolSortFields.Apr)

    expect(store.getState().sortMethod).toBe(PoolSortFields.Apr)
    expect(store.getState().sortAscending).toBe(false)
  })

  it('setSort with the same category toggles sortAscending', () => {
    const store = createPoolTableStore()

    store.getState().actions.setSort(PoolSortFields.TVL)
    expect(store.getState().sortAscending).toBe(true)

    store.getState().actions.setSort(PoolSortFields.TVL)
    expect(store.getState().sortAscending).toBe(false)
  })

  it('setSelectedProtocol updates selectedProtocol', () => {
    const store = createPoolTableStore()

    store.getState().actions.setSelectedProtocol(ProtocolVersion.V3)

    expect(store.getState().selectedProtocol).toBe(ProtocolVersion.V3)
  })

  it('resetSort restores initial sortMethod and sortAscending', () => {
    const store = createPoolTableStore()

    store.getState().actions.setSort(PoolSortFields.Apr)
    store.getState().actions.setSort(PoolSortFields.Apr)
    expect(store.getState().sortMethod).toBe(PoolSortFields.Apr)
    expect(store.getState().sortAscending).toBe(true)

    store.getState().actions.resetSort()

    expect(store.getState().sortMethod).toBe(PoolSortFields.TVL)
    expect(store.getState().sortAscending).toBe(false)
  })

  it('resetSort does not change selectedProtocol', () => {
    const store = createPoolTableStore()

    store.getState().actions.setSelectedProtocol(ProtocolVersion.V4)
    store.getState().actions.resetSort()

    expect(store.getState().selectedProtocol).toBe(ProtocolVersion.V4)
  })
})
