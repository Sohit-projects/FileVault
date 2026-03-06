const { Resend } = require("resend");
const logger = require("./logger");

/*
|--------------------------------------------------------------------------
| Validate Email Config
|--------------------------------------------------------------------------
*/

const isEmailConfigured = () => {
  return process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_resend_api_key';
};

/*
|--------------------------------------------------------------------------
| Create Resend Client (Created ONCE)
|--------------------------------------------------------------------------
*/

const createResendClient = () => {
  if (!isEmailConfigured()) {
    logger.warn('Resend not configured. Set RESEND_API_KEY in .env');
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
};

let resend = null;
let resendReady = false;

// Initialize Resend client
const initResend = () => {
  resend = createResendClient();
  resendReady = true;
  if (resend) {
    logger.info("Resend client initialized ✅");
  }
};

initResend();

// Wait for resend to be ready
const waitForResend = async () => {
  let attempts = 0;
  while (!resendReady && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  return resend;
};

/*
|--------------------------------------------------------------------------
| Send OTP Email
|--------------------------------------------------------------------------
*/

const sendOTPEmail = async ({ to, name, otp }) => {
  if (!resend) {
    await waitForResend();
  }
  
  if (!resend) {
    logger.warn(`Email not configured. Would send OTP to ${to} (dev mode)`);
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`DEV MODE - OTP for ${to}: ${otp}`);
    }
    return { success: true, previewUrl: null };
  }

  try {
    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:520px;margin:40px auto;background:#111118;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;">FileVault</h1>
          <p style="color:#ddd;">Secure Cloud Storage</p>
        </div>

        <div style="padding:40px 32px;">
          <h2 style="color:#e2e8f0;">Verify your email</h2>

          <p style="color:#94a3b8;">
            Hi ${name}, use this OTP to verify your email.
            It expires in <b style="color:#6366f1;">10 minutes</b>.
          </p>

          <div style="background:#1e1e2e;border-radius:12px;
            padding:24px;text-align:center;margin:30px 0;">
            <span style="font-size:40px;font-weight:bold;
              letter-spacing:10px;color:#6366f1;">
              ${otp}
            </span>
          </div>

          <p style="color:#64748b;font-size:13px;">
            Never share this code with anyone.
          </p>
        </div>

        <div style="border-top:1px solid #1e1e2e;
          padding:20px;text-align:center;">
          <p style="color:#475569;font-size:12px;">
            © FileVault. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'FileVault <noreply@filevault.com>',
      to,
      subject: `${otp} is your FileVault verification code`,
      html,
    });

    logger.info(`OTP email sent to ${to}`);
    return { success: true };
  } catch (error) {
    logger.error(`OTP email failed: ${error.message}`);
    throw new Error("Failed to send verification email");
  }
};

/*
|--------------------------------------------------------------------------
| Send Welcome Email
|--------------------------------------------------------------------------
*/

const sendWelcomeEmail = async ({ to, name }) => {
  if (!resend) {
    await waitForResend();
  }
  
  if (!resend) {
    logger.warn(`Email not configured. Would send welcome email to ${to} (dev mode)`);
    return { success: true, previewUrl: null };
  }

  try {
    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:520px;margin:40px auto;background:#111118;border-radius:16px;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);
          padding:32px;text-align:center;">
          <h1 style="color:#fff;">Welcome to FileVault 🎉</h1>
        </div>

        <div style="padding:40px 32px;">
          <h2 style="color:#e2e8f0;">Hi ${name}!</h2>

          <p style="color:#94a3b8;">
            Your account is verified successfully.
            You now have <b style="color:#6366f1;">
            5GB free storage</b>.
          </p>

          <a href="${process.env.FRONTEND_URL}/dashboard"
            style="display:inline-block;
            background:linear-gradient(135deg,#6366f1,#8b5cf6);
            color:#fff;text-decoration:none;
            padding:14px 30px;border-radius:8px;
            font-weight:600;margin-top:20px;">
            Go to Dashboard →
          </a>
        </div>
      </div>
    </body>
    </html>
    `;

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'FileVault <noreply@filevault.com>',
      to,
      subject: "Welcome to FileVault!",
      html,
    });

    logger.info(`Welcome email sent to ${to}`);
    return { success: true };
  } catch (error) {
    logger.error(`Welcome email failed: ${error.message}`);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| Send Password Reset Email
|--------------------------------------------------------------------------
*/

const sendPasswordResetEmail = async ({ to, name, otp }) => {
  if (!resend) {
    await waitForResend();
  }
  
  if (!resend) {
    logger.warn(`Email not configured. Would send password reset to ${to} (dev mode)`);
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`DEV MODE - Password reset OTP for ${to}: ${otp}`);
    }
    return { success: true };
  }

  try {
    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:520px;margin:40px auto;background:#111118;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;">FileVault</h1>
          <p style="color:#ddd;">Password Reset</p>
        </div>

        <div style="padding:40px 32px;">
          <h2 style="color:#e2e8f0;">Reset your password</h2>

          <p style="color:#94a3b8;">
            Hi ${name}, we received a request to reset your password.
            Use this OTP code. It expires in <b style="color:#ef4444;">10 minutes</b>.
          </p>

          <div style="background:#1e1e2e;border-radius:12px;
            padding:24px;text-align:center;margin:30px 0;">
            <span style="font-size:40px;font-weight:bold;
              letter-spacing:10px;color:#ef4444;">
              ${otp}
            </span>
          </div>

          <p style="color:#64748b;font-size:13px;">
            If you didn't request this, please ignore this email.
            Never share this code with anyone.
          </p>
        </div>

        <div style="border-top:1px solid #1e1e2e;
          padding:20px;text-align:center;">
          <p style="color:#475569;font-size:12px;">
            © FileVault. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'FileVault <noreply@filevault.com>',
      to,
      subject: `Reset your FileVault password`,
      html,
    });

    logger.info(`Password reset email sent to ${to}`);
    return { success: true };
  } catch (error) {
    logger.error(`Password reset email failed: ${error.message}`);
    throw new Error("Failed to send password reset email");
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};
