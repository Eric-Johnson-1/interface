import type { ChallengeSolverService } from '@universe/sessions/src/challenge-solvers/types'
import type { PerformanceTracker } from '@universe/sessions/src/performance/types'
import {
  MaxChallengeRetriesError,
  NoSolverAvailableError,
} from '@universe/sessions/src/session-initialization/sessionErrors'
import type { SessionService } from '@universe/sessions/src/session-service/types'
import type { Logger } from 'utilities/src/logger/logger'

interface SessionInitResult {
  sessionId: string | null
}

/**
 * Callbacks for session initialization lifecycle events.
 * Each callback is optional and focused on one event.
 */
export interface SessionInitAnalytics {
  /** Called when session initialization starts */
  onInitStarted?: () => void
  /** Called when session initialization completes (before challenge flow) */
  onInitCompleted?: (data: { needChallenge: boolean; durationMs: number }) => void
  /** Called when a challenge is received from the backend */
  onChallengeReceived?: (data: { challengeType: string; challengeId: string }) => void
  /** Called when session verification completes (success or retry) */
  onVerifyCompleted?: (data: { success: boolean; attemptNumber: number; totalDurationMs: number }) => void
}

interface SessionInitializationService {
  /**
   * Orchestrates the complete session initialization flow:
   * 1. Calls initSession (backend decides whether to create new or reuse existing)
   * 2. Handles challenge solving if required
   *
   * @throws Error if initialization fails
   */
  initialize(): Promise<SessionInitResult>
}

function createSessionInitializationService(ctx: {
  getSessionService: () => SessionService
  challengeSolverService: ChallengeSolverService
  /**
   * Required: Performance tracker for timing measurements.
   * Must be injected - no implicit dependency on globalThis.performance.
   */
  performanceTracker: PerformanceTracker
  getIsSessionUpgradeAutoEnabled?: () => boolean
  maxChallengeRetries?: number
  getLogger?: () => Logger
  /** Analytics callbacks for tracking session initialization lifecycle */
  analytics?: SessionInitAnalytics
}): SessionInitializationService {
  async function handleChallengeFlow(attemptCount = 0, flowStartTime?: number): Promise<void> {
    const startTime = flowStartTime ?? ctx.performanceTracker.now()
    const maxRetries = ctx.maxChallengeRetries ?? 3

    const challenge = await ctx.getSessionService().requestChallenge()

    ctx.getLogger?.().debug('createSessionInitializationService', 'handleChallengeFlow', 'Requesting challenge', {
      challenge,
    })

    // Report challenge received (only on first attempt)
    if (attemptCount === 0) {
      ctx.analytics?.onChallengeReceived?.({
        challengeType: String(challenge.challengeType),
        challengeId: challenge.challengeId,
      })
    }

    // get our solver for the challenge type
    const solver = ctx.challengeSolverService.getSolver(challenge.challengeType)
    if (!solver) {
      throw new NoSolverAvailableError(challenge.challengeType)
    }

    // Solve the challenge — if the solver throws (e.g. Turnstile domain mismatch on
    // Vercel previews), submit a placeholder solution so verifySession can reject it
    // and the retry loop can request a different challenge type (typically Hashcash).
    // Note: we use a non-empty placeholder because proto3 omits empty strings from the
    // wire, which means the backend wouldn't see the solution field at all.
    let solution: string
    try {
      solution = await solver.solve({
        challengeId: challenge.challengeId,
        challengeType: challenge.challengeType,
        extra: challenge.extra,
        challengeData: challenge.challengeData,
      })
    } catch (solverError) {
      ctx
        .getLogger?.()
        .warn(
          'createSessionInitializationService',
          'handleChallengeFlow',
          'Solver failed, submitting placeholder solution to trigger fallback',
          { error: solverError, challengeType: challenge.challengeType },
        )
      solution = 'solver-failed'
    }

    ctx
      .getLogger?.()
      .debug('createSessionInitializationService', 'handleChallengeFlow', 'Solved challenge', { solution })

    // Verify session with the solution
    const result = await ctx.getSessionService().verifySession({
      solution,
      challengeId: challenge.challengeId,
      challengeType: challenge.challengeType,
    })

    if (!result.retry) {
      // Verification was successful
      ctx.analytics?.onVerifyCompleted?.({
        success: true,
        attemptNumber: attemptCount + 1,
        totalDurationMs: ctx.performanceTracker.now() - startTime,
      })
      return
    }

    // Report retry (verification failed but will retry)
    ctx.analytics?.onVerifyCompleted?.({
      success: false,
      attemptNumber: attemptCount + 1,
      totalDurationMs: ctx.performanceTracker.now() - startTime,
    })

    // Handle server retry request
    if (attemptCount >= maxRetries) {
      throw new MaxChallengeRetriesError(maxRetries, attemptCount + 1)
    }

    await handleChallengeFlow(attemptCount + 1, startTime) // Recursive call with incremented count
  }

  async function initialize(): Promise<SessionInitResult> {
    const initStartTime = ctx.performanceTracker.now()

    // Report init started
    ctx.analytics?.onInitStarted?.()

    // Always call initSession - backend decides whether to create new or reuse existing
    // On web: existing session sent via cookie
    // On mobile/extension: existing session sent via X-Session-ID header
    const initResponse = await ctx.getSessionService().initSession()

    // Report init completed
    ctx.analytics?.onInitCompleted?.({
      needChallenge: initResponse.needChallenge,
      durationMs: ctx.performanceTracker.now() - initStartTime,
    })

    // Step 3: Handle challenge if required and enabled
    // Default behavior: disabled (opt-in) if callback is not provided
    if (initResponse.needChallenge && ctx.getIsSessionUpgradeAutoEnabled?.()) {
      await handleChallengeFlow()
    }

    // Return the result
    // sessionId is null for web (stored in cookie), real ID for non-web platforms
    return {
      sessionId: initResponse.sessionId ?? null,
    }
  }

  return { initialize }
}

export { createSessionInitializationService }
export type { SessionInitializationService, SessionInitResult }
