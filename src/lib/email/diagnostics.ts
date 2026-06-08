import { getActiveEmailProvider, getDefaultSender } from '@/lib/email/send'
import { isSmtpConfigured } from '@/lib/email/smtp'

export function getEmailDiagnostics() {
  const provider = getActiveEmailProvider()
  const sender = getDefaultSender()

  return {
    configured: provider !== null,
    provider:   provider ?? 'ninguno',
    fromName:   sender.name,
    fromEmail:  sender.email,
    smtp: {
      configured: isSmtpConfigured(),
      host:       process.env.SMTP_HOST?.trim() ?? 'smtp.gmail.com (default)',
      port:       process.env.SMTP_PORT?.trim() ?? '587 (default)',
      user:       process.env.SMTP_USER?.trim() ?? null,
      hasPass:    Boolean(process.env.SMTP_PASS?.trim()),
    },
    emailProviderEnv: process.env.EMAIL_PROVIDER?.trim() ?? null,
  }
}
