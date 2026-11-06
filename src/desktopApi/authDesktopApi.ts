/**
 * Auth extras — changeOwnPassword / security Q / password reset
 * Mount: /api/auth/*
 */
import type {
  ApiResult,
  AuthUser,
  ChangeOwnPasswordPayload,
  ChangeOwnSecurityQuestionPayload,
  InitialAdminPayload,
  OwnSecurityStatus,
  PasswordResetQuestionResult,
  ResetPasswordWithSecurityPayload
} from '@shared/types'
import { desktopAuthRequest, desktopPublicRequest } from './apiResult'

function notPorted(name: string): () => Promise<ApiResult<never>> {
  return async () => ({
    success: false,
    error: `${name} SaaS’ta web oturumu ile yönetilir.`
  })
}

export const authDesktopApi = {
  hasUsers: notPorted('auth.hasUsers'),
  createInitialAdmin: notPorted('auth.createInitialAdmin') as (
    payload: InitialAdminPayload
  ) => Promise<ApiResult<AuthUser>>,
  login: notPorted('auth.login') as (
    username: string,
    password: string
  ) => Promise<ApiResult<AuthUser>>,
  logout: notPorted('auth.logout') as () => Promise<ApiResult<void>>,
  getSession: notPorted('auth.getSession') as () => Promise<ApiResult<AuthUser | null>>,

  async changeOwnPassword(payload: ChangeOwnPasswordPayload): Promise<ApiResult<void>> {
    return desktopAuthRequest<void>('/api/auth/change-own-password', {
      method: 'POST',
      body: payload
    })
  },

  async changeOwnSecurityQuestion(
    payload: ChangeOwnSecurityQuestionPayload
  ): Promise<ApiResult<void>> {
    return desktopAuthRequest<void>('/api/auth/change-own-security-question', {
      method: 'POST',
      body: payload
    })
  },

  async getOwnSecurityStatus(): Promise<ApiResult<OwnSecurityStatus>> {
    return desktopAuthRequest<OwnSecurityStatus>('/api/auth/own-security-status')
  },

  async getPasswordResetQuestion(
    username: string
  ): Promise<ApiResult<PasswordResetQuestionResult>> {
    // Backend POST + body (email|username); masaüstü IPC "username" adını korur.
    return desktopPublicRequest<PasswordResetQuestionResult>('/api/auth/password-reset-question', {
      method: 'POST',
      body: { email: username.trim(), username: username.trim() }
    })
  },

  async resetPasswordWithSecurityAnswer(
    payload: ResetPasswordWithSecurityPayload
  ): Promise<ApiResult<void>> {
    return desktopPublicRequest<void>('/api/auth/reset-password-with-security-answer', {
      method: 'POST',
      body: {
        ...payload,
        email: payload.username,
        username: payload.username
      }
    })
  }
}
