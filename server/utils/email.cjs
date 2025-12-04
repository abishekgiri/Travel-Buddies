const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (to, subject, text) => {
    // Check if real credentials are provided
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER !== 'your-email@gmail.com') {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            await transporter.sendMail({
                from: '"Travel Buddies" <noreply@travelbuddies.com>',
                to,
                subject,
                text
            });
            console.log(`✅ Email sent to ${to}`);
            return;
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            // Fallback to console log on error
        }
    }

    // Fallback: Log to console if no credentials or error
    console.log('---------------------------------------------------');
    console.log(`📧 MOCK EMAIL TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY: ${text}`);
    console.log('---------------------------------------------------');
};

module.exports = { sendEmail };
