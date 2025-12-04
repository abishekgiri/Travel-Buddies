const { sendEmail } = require('./server/utils/email.cjs');
require('dotenv').config();

console.log('Testing email sending...');
console.log('User:', process.env.EMAIL_USER);
// Don't log the full password for security, just check if it exists
console.log('Pass exists:', !!process.env.EMAIL_PASS);

(async () => {
    try {
        await sendEmail(process.env.EMAIL_USER, 'Test Email', 'This is a test email from the debugger.');
        console.log('Test script finished.');
    } catch (error) {
        console.error('Test script failed:', error);
    }
})();
