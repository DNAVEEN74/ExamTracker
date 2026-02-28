export function getOtpTemplate(otp: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .header { background-color: #2563eb; padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
        .content { padding: 40px 32px; text-align: center; }
        .content p { color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px; }
        .otp-container { background-color: #f1f5f9; border-radius: 8px; padding: 24px; margin: 32px 0; border: 1px dashed #cbd5e1; }
        .otp-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 700; color: #0f172a; letter-spacing: 6px; margin: 0; }
        .warning { color: #71717a; font-size: 14px; margin-top: 32px; }
        .footer { background-color: #fafafa; border-top: 1px solid #e4e4e7; padding: 24px; text-align: center; color: #a1a1aa; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ExamTracker</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Please use the verification code below to sign in or register for your ExamTracker account. This code is valid for 5 minutes.</p>
            
            <div class="otp-container">
                <p class="otp-code">${otp}</p>
            </div>
            
            <p class="warning">If you didn't request this code, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ExamTracker. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `
}
