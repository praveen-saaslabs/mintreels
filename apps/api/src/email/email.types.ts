export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface VerificationEmailContent {
  subject: string;
  text: string;
  html: string;
}
