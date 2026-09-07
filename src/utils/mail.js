import nodemailer from 'nodemailer'
import { ApiError } from '../utils/apiError.js'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
})

const sendMail = async ({ to, from, subject, html }) => {
  if (!to || !subject || !html) {
    throw new ApiError(400, "To, subject, and html fields are required")
  }

  const sender = from || `Civic Management System <${process.env.EMAIL}>`

  const info = await transporter.sendMail({
    from: sender,
    to,
    subject,
    html
  })

  if (!info) {
    throw new ApiError(500, "Failed to send email")
  }

  return info
}

const sendOtpMail = async (to, otp) => {
  return sendMail({
    to,
    subject: "Your password reset OTP",
    html: `
      <div style="font-family: sans-serif; max-width:480px; margin: auto;">
        <h2>Password Reset Request</h2>
        <p>Use the OTP below to reset your password. This code is valid for 10 minutes.</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p style="color: #666; font-size: 13px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>`
  })
}

const sendIssueResolved = async (to, issue) => {
  return sendMail({
    to,
    subject: `Your reported issue "${issue.title}" has been resolved`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Issue Resolved</h2>
        <p>Good news — the issue you reported has been marked as resolved:</p>
        <p><strong>${issue.title}</strong></p>
        <p style="color: #666; font-size: 13px;">
          Issue ID: ${issue._id}
        </p>
        <p>If you believe this issue isn't actually fixed, you can reopen it from your dashboard.</p>
      </div>`
  })
}

export { sendIssueResolved, sendOtpMail, sendMail }
