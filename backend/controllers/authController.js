const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { generateOTP, getOtpExpiry } = require('../utils/otp');
const { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const { cloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── REGISTER (step 1: send OTP) ────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email }).select('+otpCode +otpExpiresAt +otpAttempts');
    if (existingUser?.isEmailVerified) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const otp = generateOTP();
    const otpExpiry = getOtpExpiry();

    if (existingUser && !existingUser.isEmailVerified) {
      // Update existing unverified user
      existingUser.name = name;
      existingUser.password = password;
      existingUser.otpCode = otp;
      existingUser.otpExpiresAt = otpExpiry;
      existingUser.otpAttempts = 0;
      await existingUser.save();
    } else {
      // Create new user
      await User.create({
        name,
        email,
        password,
        otpCode: otp,
        otpExpiresAt: otpExpiry,
        otpAttempts: 0,
        isEmailVerified: false,
      });
    }

    await sendOTPEmail({ to: email, name, otp });

    logger.info(`Registration OTP sent to ${email}`);
    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email. Please check your inbox.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── VERIFY OTP ──────────────────────────────────────────────────────────────
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otpCode +otpExpiresAt +otpAttempts +refreshToken');
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    if (user.otpAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new code.',
      });
    }

    if (!user.isOtpValid(otp)) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    }

    const isNewUser = !user.isEmailVerified;
    user.isEmailVerified = true;
    user.clearOtp();
    user.lastLogin = new Date();

    const { accessToken, refreshToken } = generateTokenPair(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    if (isNewUser) {
      sendWelcomeEmail({ to: user.email, name: user.name }).catch(() => {});
    }

    logger.info(`User ${email} verified and logged in`);
    res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit,
          authProvider: user.authProvider,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── RESEND OTP ──────────────────────────────────────────────────────────────
exports.resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).select('+otpCode +otpExpiresAt +otpAttempts');
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    if (user.isEmailVerified && !user.otpCode) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    const otp = generateOTP();
    user.otpCode = otp;
    user.otpExpiresAt = getOtpExpiry();
    user.otpAttempts = 0;
    await user.save();

    await sendOTPEmail({ to: email, name: user.name, otp });

    res.status(200).json({ success: true, message: 'New verification code sent.' });
  } catch (error) {
    next(error);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshToken +otpCode +otpExpiresAt +otpAttempts');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Please log in with Google.',
      });
    }

    if (!user.isEmailVerified) {
      // Resend OTP for unverified users
      const otp = generateOTP();
      user.otpCode = otp;
      user.otpExpiresAt = getOtpExpiry();
      user.otpAttempts = 0;
      await user.save();
      await sendOTPEmail({ to: email, name: user.name, otp });
      return res.status(403).json({
        success: false,
        message: 'Email not verified. A new verification code has been sent.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    user.lastLogin = new Date();
    const { accessToken, refreshToken } = generateTokenPair(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`User ${email} logged in`);
    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit,
          authProvider: user.authProvider,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GOOGLE LOGIN ─────────────────────────────────────────────────────────────
exports.googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ email }).select('+refreshToken');

    if (user && user.authProvider === 'local') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in with your password.',
      });
    }

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        authProvider: 'google',
        isEmailVerified: true,
      });
      sendWelcomeEmail({ to: email, name }).catch(() => {});
    } else {
      user.lastLogin = new Date();
      user.avatar = picture || user.avatar;
    }

    const { accessToken, refreshToken } = generateTokenPair(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`Google user ${email} logged in`);
    res.status(200).json({
      success: true,
      message: 'Google login successful.',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit,
          authProvider: user.authProvider,
        },
      },
    });
  } catch (error) {
    logger.error(`Google login error: ${error.message}`);
    if (error.message?.includes('Token used too late') || error.message?.includes('Invalid token')) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Google credentials.' });
    }
    next(error);
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const tokens = generateTokenPair(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(200).json({ success: true, data: tokens });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Refresh token expired. Please log in again.', code: 'REFRESH_TOKEN_EXPIRED' });
    }
    next(error);
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── FORGOT PASSWORD ───────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, authProvider: 'local' });
    if (!user) {
      // Don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: 'If an account exists, a password reset code has been sent.',
      });
    }

    const otp = generateOTP();
    const otpExpiry = getOtpExpiry();

    user.otpCode = otp;
    user.otpExpiresAt = otpExpiry;
    user.otpAttempts = 0;
    await user.save();

    await sendPasswordResetEmail({ to: email, name: user.name, otp });

    logger.info(`Password reset OTP sent to ${email}`);
    res.status(200).json({
      success: true,
      message: 'If an account exists, a password reset code has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email }).select('+otpCode +otpExpiresAt +otpAttempts +password +authProvider');
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    if (user.authProvider === 'google') {
      return res.status(400).json({ 
        success: false, 
        message: 'This account uses Google Sign-In. Please log in with Google.' 
      });
    }

    if (user.otpAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new code.',
      });
    }

    if (!user.isOtpValid(otp)) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
    }

    user.password = newPassword;
    user.clearOtp();
    user.refreshToken = null; // Invalidate all sessions
    await user.save();

    logger.info(`Password reset successful for ${email}`);
    res.status(200).json({
      success: true,
      message: 'Password reset successful. Please log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({ success: false, message: 'Name cannot exceed 50 characters.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true }
    ).select('-password -refreshToken -otpCode -otpExpiresAt -otpAttempts');

    logger.info(`Profile updated for user ${user.email}`);
    res.status(200).json({ success: true, message: 'Profile updated successfully.', data: { user } });
  } catch (error) {
    next(error);
  }
};

// ─── UPLOAD AVATAR ───────────────────────────────────────────────────────────
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    // Validate image type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only JPG, PNG, GIF, and WebP images are allowed.' });
    }

    // Validate file size (max 2MB)
    if (req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Image must be less than 2MB.' });
    }

    const user = await User.findById(req.user._id).select('+avatar');
    
    // Delete old avatar if exists and not a Google avatar
    if (user.avatar && !user.avatar.includes('googleusercontent.com')) {
      try {
        const publicId = user.avatar.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`filestorage/avatars/${publicId}`);
      } catch (err) {
        logger.warn(`Could not delete old avatar: ${err.message}`);
      }
    }

    // Upload new avatar to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'filestorage/avatars',
          public_id: `avatar_${user._id}`,
          width: 200,
          height: 200,
          crop: 'fill',
          gravity: 'face',
          format: 'webp',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    user.avatar = uploadResult.secure_url;
    await user.save();

    logger.info(`Avatar uploaded for user ${user.email}`);
    res.status(200).json({ 
      success: true, 
      message: 'Avatar updated successfully.', 
      data: { avatar: uploadResult.secure_url } 
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE AVATAR ───────────────────────────────────────────────────────────
exports.deleteAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+avatar');

    if (!user.avatar) {
      return res.status(400).json({ success: false, message: 'No avatar to remove.' });
    }

    // Don't allow deleting Google avatar
    if (user.avatar.includes('googleusercontent.com')) {
      return res.status(400).json({ success: false, message: 'Cannot remove Google profile picture.' });
    }

    // Delete from Cloudinary
    try {
      const publicId = user.avatar.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`filestorage/avatars/${publicId}`);
    } catch (err) {
      logger.warn(`Could not delete avatar from Cloudinary: ${err.message}`);
    }

    user.avatar = null;
    await user.save();

    logger.info(`Avatar removed for user ${user.email}`);
    res.status(200).json({ success: true, message: 'Avatar removed successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password +authProvider');
    
    if (user.authProvider === 'google') {
      return res.status(400).json({ 
        success: false, 
        message: 'Google users cannot change password. Use Google Sign-In.' 
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    user.refreshToken = null; // Invalidate all sessions
    await user.save();

    logger.info(`Password changed for user ${user.email}`);
    res.status(200).json({ success: true, message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    next(error);
  }
};

// ─── GET ME ───────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        storageUsed: req.user.storageUsed,
        storageLimit: req.user.storageLimit,
        authProvider: req.user.authProvider,
        createdAt: req.user.createdAt,
      },
    },
  });
};
