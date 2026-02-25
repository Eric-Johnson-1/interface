import { atomWithReset } from 'jotai/utils'

export enum AuctionVerificationFilter {
  All = 'all',
  Verified = 'verified',
  Unverified = 'unverified',
}

export enum AuctionStatusFilter {
  All = 'all',
  Active = 'active',
  Complete = 'complete',
}

export const auctionVerificationFilterAtom = atomWithReset<AuctionVerificationFilter>(AuctionVerificationFilter.All)

export const auctionStatusFilterAtom = atomWithReset<AuctionStatusFilter>(AuctionStatusFilter.All)
