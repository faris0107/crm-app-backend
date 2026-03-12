const AuthService = require('../services/AuthService');
const MailService = require('../services/MailService');
const logger = require('../utils/logger');

// Mock OTP storage (use Redis in production)
const otps = new Map();

/**
 * @swagger
 * /api/auth/verify-entity:
 *   post:
 *     summary: Verify organization entity code
 *     tags: [Auth]
 */
exports.verifyEntity = async (req, res) => {
    try {
        const { entityCode } = req.body;
        const entity = await AuthService.verifyEntity(entityCode);
        res.json({ success: true, entity: { id: entity.id, name: entity.name } });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await AuthService.findUserByEmailOnly(email);

        await AuthService.verifyPassword(user, password);

        const tokens = AuthService.generateTokens(user);
        await AuthService.updateRefreshToken(user.id, tokens.refreshToken);

        const responsePayload = {
            ...tokens,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.Role?.name || 'L1',
                entity_id: user.entity_id,
                workspace: user.Entity?.name || (user.entity_id ? 'Workspace' : 'System')
            }
        };

        logger.info(`Login successful for user ID: ${user.id}`);

        res.json(responsePayload);
    } catch (error) {
        logger.error(`Login failed for email: ${req.body.email}. Error: ${error.message}`);
        res.status(401).json({ message: error.message });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        const payload = await AuthService.verifyGoogleToken(idToken);
        const user = await AuthService.verifyGoogleUser(payload);

        const tokens = AuthService.generateTokens(user);
        await AuthService.updateRefreshToken(user.id, tokens.refreshToken);

        res.json({
            ...tokens,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.Role?.name || 'L1',
                entity_id: user.entity_id,
                workspace: user.Entity?.name || (user.entity_id ? 'Workspace' : 'System')
            }
        });
    } catch (error) {
        logger.error(`Google Login attempt failed: ${error.message}`);
        res.status(400).json({ message: error.message || 'Social authentication failed' });
    }
};

exports.requestOTP = async (req, res) => {
    try {
        const { email, entityId } = req.body;
        const user = await AuthService.findUserByEmail(email, entityId);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otps.set(email, { otp, expires: Date.now() + 300000 });

        await MailService.sendOTP(email, otp);
        res.json({ success: true, message: 'OTP has been generated. Check server logs in current version.' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp, entityId } = req.body;
        const stored = otps.get(email);

        if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        otps.delete(email);

        const user = await AuthService.findUserByEmail(email, entityId);
        const tokens = AuthService.generateTokens(user);

        await AuthService.updateRefreshToken(user.id, tokens.refreshToken);

        res.json({
            ...tokens,
            user: { id: user.id, name: user.name, role: user.role }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const user = await AuthService.verifyRefreshToken(refreshToken);
        const tokens = AuthService.generateTokens(user);

        await AuthService.updateRefreshToken(user.id, tokens.refreshToken);
        res.json(tokens);
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await AuthService.findUserByEmailOnly(req.user.email);

        if (oldPassword === newPassword) {
            return res.status(400).json({ message: 'New password cannot be the same as the old password' });
        }

        await AuthService.verifyPassword(user, oldPassword);
        await AuthService.updatePassword(user.id, newPassword);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.forgotPasswordRequest = async (req, res) => {
    try {
        const { email } = req.body;
        // Verify user exists
        const user = await AuthService.findUserByEmailOnly(email);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otps.set(email, { otp, expires: Date.now() + 300000 }); // 5 minutes

        await MailService.sendOTP(email, otp);
        res.json({ success: true, message: 'Password reset OTP has been generated' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.forgotPasswordReset = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const stored = otps.get(email);

        if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const user = await AuthService.findUserByEmailOnly(email);
        await AuthService.updatePassword(user.id, newPassword);

        otps.delete(email);

        res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
