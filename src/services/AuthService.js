const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { User, Entity, Role } = require('../models');
require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
    generateTokens(user) {
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.Role?.name || 'L1', entity_id: user.entity_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
        );

        return { accessToken, refreshToken };
    }

    async verifyEntity(code) {
        const entity = await Entity.findOne({ where: { code, active: true, is_deleted: false } });
        if (!entity) throw new Error('Invalid entity code');
        return entity;
    }

    async verifyPassword(user, password) {
        if (!user.password) throw new Error('Password not set for this account');
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new Error('Invalid email or password');
        return true;
    }

    async findUserByEmailOnly(email) {
        const user = await User.findOne({
            where: { email, active: true, is_deleted: false },
            include: [
                { model: Entity, attributes: ['id', 'name', 'code'] },
                { model: Role, attributes: ['name'] }
            ]
        });
        if (!user) throw new Error('Invalid email or password');
        return user;
    }

    async findUserByEmail(email, entityId) {
        const user = await User.findOne({ where: { email, entity_id: entityId, active: true, is_deleted: false } });
        if (!user) throw new Error('Account access denied for this entity');
        return user;
    }

    async updateRefreshToken(userId, token) {
        await User.update({ refresh_token: token }, { where: { id: userId } });
    }

    async verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
            const user = await User.findByPk(decoded.id);
            if (!user || !user.active || user.is_deleted || user.refresh_token !== token) {
                throw new Error('Invalid refresh token');
            }
            return user;
        } catch (err) {
            throw new Error('Refresh token verification failed');
        }
    }

    async verifyGoogleToken(idToken) {
        try {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            return ticket.getPayload();
        } catch (error) {
            throw new Error('Google token verification failed');
        }
    }

    async verifyGoogleUser(payload) {
        const { sub: google_id, email } = payload;

        let user = await User.findOne({
            where: { email },
            include: [
                { model: Entity, attributes: ['id', 'name', 'code'] },
                { model: Role, attributes: ['name'] }
            ]
        });

        if (!user) {
            throw new Error('This Google account is not registered. Please contact your admin.');
        }

        if (!user.active || user.is_deleted) {
            throw new Error('This account has been disabled');
        }

        // Link Google ID if not already linked
        if (!user.google_id) {
            await user.update({ google_id });
        }

        return user;
    }

    async updatePassword(userId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.update({ password: hashedPassword }, { where: { id: userId } });
    }
}

module.exports = new AuthService();
