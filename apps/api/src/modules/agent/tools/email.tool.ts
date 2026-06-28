import { sendEmail } from '../../../lib/email.js';

export const EmailToolSchema = {
  type: 'function',
  function: {
    name: 'send_email',
    description: 'Send an email to a specific address',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'The email address of the recipient',
        },
        subject: {
          type: 'string',
          description: 'The subject line of the email',
        },
        body: {
          type: 'string',
          description: 'The HTML body content of the email',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
};

export async function executeEmailTool(args: any): Promise<string> {
  const { to, subject, body } = args;
  try {
    await sendEmail({
      to,
      subject,
      html: body,
    });
    return JSON.stringify({ success: true, message: `Email sent successfully to ${to}` });
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to send email: ${error.message}` });
  }
}
