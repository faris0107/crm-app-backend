const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { validate } = require('../middleware/validator.middleware');
const { verifyToken } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/auth/verify-entity:
 *   post:
 *     summary: Verify organization code
 *     tags: [Authentication]
 */
router.post('/verify-entity', [
    body('code').notEmpty().withMessage('Entity code is required').trim(),
    validate
], AuthController.verifyEntity);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 */
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    validate
], AuthController.login);

/**
 * @swagger
 * /api/auth/google-login:
 *   post:
 *     summary: Login with Google ID Token
 *     tags: [Authentication]
 */
router.post('/google-login', AuthController.googleLogin);

router.post('/request-otp', [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    validate
], AuthController.requestOTP);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and get JWT tokens
 *     tags: [Authentication]
 */
router.post('/verify-otp', [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    validate
], AuthController.verifyOTP);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh expired access token
 *     tags: [Authentication]
 */
router.post('/refresh-token', AuthController.refreshToken);

router.post('/change-password', verifyToken, AuthController.changePassword);
router.post('/forgot-password/request', AuthController.forgotPasswordRequest);
router.post('/forgot-password/reset', AuthController.forgotPasswordReset);

module.exports = router;
