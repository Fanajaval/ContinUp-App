const env = require('../config/env');

/**
 * Email Service — Resend
 * Envoi des signaux S3 par email (l'absent n'ouvre pas l'app)
 */

let resendClient = null;

function getClient() {
  if (!resendClient && env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Envoie un email de signal (S3 principalement)
 */
async function sendSignalEmail({ to, pseudo, projectName, signal, progression, etapeSemantique, microAction, proofText, dreamLink }) {
  if (!env.EMAIL_ENABLED) {
    console.log(`[EMAIL] Disabled — would send to ${to}`);
    return { id: 'disabled' };
  }

  const client = getClient();
  if (!client) {
    console.error('[EMAIL] Resend client not initialized');
    return null;
  }

  const htmlContent = buildSignalEmailHTML({
    pseudo,
    projectName,
    signal,
    progression,
    etapeSemantique,
    microAction,
    proofText,
    dreamLink,
  });

  try {
    const result = await client.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: `🏠 ${projectName} — il te reste une brique à poser`,
      html: htmlContent,
    });
    console.log(`[EMAIL] Sent to ${to}: ${result.id}`);
    return result;
  } catch (error) {
    console.error(`[EMAIL] Failed to send to ${to}:`, error.message);
    return null;
  }
}

/**
 * Construit le HTML de l'email de signal
 */
function buildSignalEmailHTML({ pseudo, projectName, signal, progression, etapeSemantique, microAction, proofText, dreamLink }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 8px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .proof { background: #f0f4ff; border-radius: 12px; padding: 16px; margin: 16px 0; border-left: 4px solid #667eea; }
    .proof strong { color: #667eea; }
    .progress { background: #e2e8f0; border-radius: 8px; height: 12px; margin: 12px 0; overflow: hidden; }
    .progress-bar { background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; border-radius: 8px; transition: width 0.3s; }
    .action { background: #fff7ed; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .action-title { font-weight: 600; color: #c2410c; margin-bottom: 8px; }
    .cta { display: block; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-weight: 600; margin: 20px 0; }
    .message { font-style: italic; color: #4a5568; padding: 16px; background: #f7fafc; border-radius: 8px; margin: 16px 0; }
    .footer { text-align: center; padding: 20px; color: #a0aec0; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 ${projectName}</h1>
      <p>Ton rêve t'attend, ${pseudo}</p>
    </div>
    <div class="content">
      <div class="proof">
        <strong>📊 Preuve de progrès :</strong>
        <p>${proofText}</p>
        <div class="progress">
          <div class="progress-bar" style="width: ${progression}%"></div>
        </div>
        <small>Étape actuelle : <strong>${etapeSemantique}</strong> — ${progression}%</small>
      </div>

      <div class="message">
        "${signal}"
      </div>

      <div class="action">
        <div class="action-title">🎯 UNE micro-action pour toi :</div>
        <p>${microAction}</p>
      </div>

      <a href="${dreamLink}" class="cta">Reprendre mon projet →</a>
    </div>
    <div class="footer">
      <p>Ton repo construit ta vie rêvée 💎</p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  sendSignalEmail,
};
