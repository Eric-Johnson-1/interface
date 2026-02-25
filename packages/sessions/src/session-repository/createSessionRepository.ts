import { VerifyFailure_Reason } from '@uniswap/client-platform-service/dist/uniswap/platformservice/v1/sessionService_pb'
import type { SessionServiceClient } from '@universe/sessions/src/session-repository/createSessionClient'
import type { SessionRepository, TypedChallengeData } from '@universe/sessions/src/session-repository/types'
import { VerifyFailureReason } from '@universe/sessions/src/session-repository/types'
import type { Logger } from 'utilities/src/logger/logger'

/**
 * Creates a session repository that handles communication with the session service.
 * This is the layer that makes actual API calls to the backend.
 */
function createSessionRepository(ctx: { client: SessionServiceClient; getLogger?: () => Logger }): SessionRepository {
  const initSession: SessionRepository['initSession'] = async () => {
    try {
      const response = await ctx.client.initSession({})

      return {
        sessionId: response.sessionId,
        deviceId: response.deviceId,
        needChallenge: response.needChallenge || false,
        extra: response.extra,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to initialize session: ${errorMessage}`, { cause: error })
    }
  }

  const challenge: SessionRepository['challenge'] = async (request) => {
    try {
      const response = await ctx.client.challenge({
        challengeType: request.challengeType,
        identifier: request.identifier,
      })

      const logger = ctx.getLogger?.()

      logger?.debug('createSessionRepository', 'challenge', 'Raw challenge response', {
        challengeId: response.challengeId,
        challengeType: response.challengeType,
        extraKeys: Object.keys(response.extra),
        extra: response.extra,
        challengeDataCase: response.challengeData.case,
        challengeDataValue: response.challengeData.value,
      })

      // Map proto oneof challengeData to our typed interface
      let challengeData: TypedChallengeData = { case: undefined }
      let authorizeUrl: string | undefined
      const protoChallengeData = response.challengeData

      if (protoChallengeData.case === 'turnstile') {
        challengeData = {
          case: 'turnstile',
          value: {
            siteKey: protoChallengeData.value.siteKey,
            action: protoChallengeData.value.action,
          },
        }
      } else if (protoChallengeData.case === 'hashcash') {
        challengeData = {
          case: 'hashcash',
          value: {
            difficulty: protoChallengeData.value.difficulty,
            subject: protoChallengeData.value.subject,
            algorithm: protoChallengeData.value.algorithm,
            nonce: protoChallengeData.value.nonce,
            maxProofLength: protoChallengeData.value.maxProofLength,
            verifier: protoChallengeData.value.verifier,
          },
        }
      } else if (protoChallengeData.case === 'github') {
        challengeData = {
          case: 'github',
          value: {
            authorizeUrl: protoChallengeData.value.authorizeUrl,
          },
        }
        authorizeUrl = protoChallengeData.value.authorizeUrl
      } else {
        // Fallback to legacy extra field for authorize URL
        const legacyChallengeData = response.extra['challengeData']
        // Legacy format is JSON: {"authorizeUrl":"https://..."} or a raw URL
        if (legacyChallengeData?.startsWith('http')) {
          authorizeUrl = legacyChallengeData
        } else if (legacyChallengeData) {
          try {
            const parsed = JSON.parse(legacyChallengeData) as { authorizeUrl?: string }
            authorizeUrl = parsed.authorizeUrl
          } catch {
            // Not JSON, not a URL — skip
          }
        }

        logger?.debug('createSessionRepository', 'challenge', 'No typed challengeData, falling back to extra', {
          legacyChallengeData,
          resolvedAuthorizeUrl: authorizeUrl,
        })
      }

      logger?.debug('createSessionRepository', 'challenge', 'Mapped challenge response', {
        challengeDataCase: challengeData.case,
        authorizeUrl,
      })

      return {
        challengeId: response.challengeId || '',
        challengeType: response.challengeType || 0,
        extra: response.extra,
        challengeData,
        authorizeUrl,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to get challenge: ${errorMessage}`, { cause: error })
    }
  }

  const verifySession: SessionRepository['verifySession'] = async (request) => {
    try {
      const response = await ctx.client.verify({
        solution: request.solution,
        challengeId: request.challengeId,
        type: request.challengeType,
      })

      const logger = ctx.getLogger?.()
      logger?.debug('createSessionRepository', 'verifySession', 'Raw verify response', {
        retry: response.retry,
        retryType: typeof response.retry,
        outcomeCase: response.outcome.case,
        outcomeValue: JSON.stringify(response.outcome.value),
        newSessionId: response.newSessionId,
        responseKeys: Object.keys(response),
      })

      // Extract userInfo from success outcome, waitSeconds from failure outcome
      const userInfo =
        response.outcome.case === 'success'
          ? response.outcome.value.userInfo
            ? { name: response.outcome.value.userInfo.name, email: response.outcome.value.userInfo.email }
            : undefined
          : undefined

      const waitSeconds = response.outcome.case === 'failure' ? response.outcome.value.waitSeconds : undefined

      // Extract failure info — cast the constructed string to the typed VerifyFailureReason union
      const failureReasonEnum = response.outcome.case === 'failure' ? response.outcome.value.reason : undefined
      const failureReason =
        failureReasonEnum !== undefined
          ? (`REASON_${VerifyFailure_Reason[failureReasonEnum]}` as VerifyFailureReason)
          : undefined
      const failureMessage = response.outcome.case === 'failure' ? response.outcome.value.message : undefined

      return {
        retry: response.retry,
        waitSeconds,
        userInfo,
        failureReason,
        failureMessage,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to verify session: ${errorMessage}`, { cause: error })
    }
  }

  const deleteSession: SessionRepository['deleteSession'] = async () => {
    try {
      // Proto renamed deleteSession to signout
      await ctx.client.signout({})
      return {}
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to delete session: ${errorMessage}`, { cause: error })
    }
  }

  const getChallengeTypes: SessionRepository['getChallengeTypes'] = async () => {
    try {
      const response = await ctx.client.getChallengeTypes({})
      return response.challengeTypeConfig.map((config) => ({
        type: config.type,
        config: config.config,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to get challenge types: ${errorMessage}`, { cause: error })
    }
  }

  return {
    initSession,
    challenge,
    verifySession,
    deleteSession,
    getChallengeTypes,
  }
}

export { createSessionRepository }
