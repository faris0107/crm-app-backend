class MailService {
    /**
     * Mail configuration has been removed as per user request.
     * OTPs are now only logged to the server console for testing/development.
     */
    async sendOTP(to, otp) {
        console.log('------------------------------------------');
        console.log(`[MAIL SERVICE] To: ${to}`);
        console.log(`[MAIL SERVICE] OTP: ${otp}`);
        console.log('------------------------------------------');
        return true;
    }
}

module.exports = new MailService();
