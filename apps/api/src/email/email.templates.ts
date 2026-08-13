import type { VerificationEmailContent } from './email.types';

export function buildVerificationEmail(otp: string): VerificationEmailContent {
  const escapedOtp = escapeHtml(otp);
  return {
    subject: 'Verify your email',
    text: [
      `Your verification code is ${otp}.`,
      'This code expires in 2 minutes.',
      "If you didn't request this, you can ignore this email.",
    ].join('\n\n'),
    html: [
      `<p>Your verification code is <strong>${escapedOtp}</strong>.</p>`,
      '<p>This code expires in 2 minutes.</p>',
      "<p>If you didn't request this, you can ignore this email.</p>",
    ].join('\n'),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
