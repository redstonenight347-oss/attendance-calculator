import { getUserByName, createUserService, getUserByEmail, saveSubjectsService, getUserById, updateUser, updateUserPasswordService } from "../services/users.services.js";
import { sendEmailChangeNotification, sendPasswordChangeEmail, sendPasswordOTPEmail, sendSignupOTPEmail, sendWelcomeEmail } from "../services/email.services.js";
import { logger } from "../utils/logger.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function getUser(req, res, next) {
  try {
    const name = req.query.name;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "*name required" });
    }

    const user = await getUserByName(name);

    if (!user || user.length === 0) {
      return res.status(500).json({ message: "failed to get user details" });
    }

    const safeUser = { ...user[0] };
    delete safeUser.password;

    res.json(safeUser);
  } catch (err) {
    next(err);
  }
}

// In-memory store for signup verification OTPs
const signupOtpStore = new Map();

export async function requestSignupOTP(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || name.trim() === "") {
      logger.warn("Signup OTP failed: Name is required", { email });
      return res.status(400).json({ message: "*name required" });
    }
    if (!email || email.trim() === "") {
      logger.warn("Signup OTP failed: Email is required", { name });
      return res.status(400).json({ message: "*email required" });
    }
    if (!password || password.trim() === "") {
      logger.warn("Signup OTP failed: Password is required", { name, email });
      return res.status(400).json({ message: "*password required" });
    }

    // Name Validation
    if (name.length < 2 || name.length > 50) {
      logger.warn("Signup OTP failed: Name length must be between 2 and 50 characters", { nameLength: name.length });
      return res.status(400).json({ message: "*name must be between 2 and 50 characters" });
    }
    if (/[<>]/.test(name)) {
      logger.warn("Signup OTP failed: Name contains HTML characters", { name });
      return res.status(400).json({ message: "*name cannot contain HTML characters" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn("Signup OTP failed: Invalid email format", { email });
      return res.status(400).json({ message: "*valid email required" });
    }

    // Password strength check
    if (password.length < 8) {
      logger.warn("Signup OTP failed: Password is too short", { email });
      return res.status(400).json({ message: "*password must be at least 8 characters" });
    }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W_]{8,}$/;
    if (!passwordRegex.test(password)) {
      logger.warn("Signup OTP failed: Password does not meet complexity requirements", { email });
      return res.status(400).json({ message: "*password must contain at least one letter and one number" });
    }

    const existingUsers = await getUserByEmail(email);
    if (existingUsers && existingUsers.length > 0) {
      logger.warn("Signup OTP failed: Email already exists", { email });
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP under email key (valid for 10 minutes)
    signupOtpStore.set(email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Send email
    logger.info("Sending signup verification OTP email", { email });
    const emailSent = await sendSignupOTPEmail(email, name, otp);

    if (!emailSent) {
      logger.error("Email send failed for signup OTP", null, { email });
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    res.json({ message: "Verification OTP sent successfully" });
  } catch (err) {
    logger.error("Signup OTP request failed due to internal error", err, { email: req.body.email });
    next(err);
  }
}

export async function signup(req, res, next) {
  try {
    const { name, email, password, otp } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({ message: "Name, email, password, and OTP are required" });
    }

    // Validate OTP
    const storedData = signupOtpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ message: "No verification requested or code expired" });
    }

    if (Date.now() > storedData.expiresAt) {
      signupOtpStore.delete(email);
      return res.status(400).json({ message: "Verification code has expired" });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // OTP is valid, clear it
    signupOtpStore.delete(email);

    // Double check email uniqueness just in case
    const existingUsers = await getUserByEmail(email);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await createUserService(name, email, hashedPassword);

    // Send welcome email asynchronously to avoid blocking the response
    sendWelcomeEmail(email, name).catch(err => {
      logger.error("Failed to send welcome email after signup", err, { email });
    });

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    logger.info("User signup succeeded", { userId: newUser.id, email });

    res.json({
      message: "User signed up successfully",
      userId: newUser.id,
      token: token
    });
  } catch (err) {
    logger.error("User signup failed due to internal error", err, { email: req.body.email });
    next(err);
  }
}

export async function signin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "*email required" });
    }
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "*password required" });
    }

    const users = await getUserByEmail(email);
    if (!users || users.length === 0) {
      logger.warn("Signin failed: User not found", { email });
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    let isMatch = false;

    // Try bcrypt comparison first
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (e) {
      // If comparison fails due to invalid hash format, it might be plaintext
      isMatch = false;
    }

    // Fallback for existing plaintext passwords
    if (!isMatch && password === user.password) {
      isMatch = true;
      // Auto-migrate to hashed password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await updateUserPasswordService(user.id, hashedPassword);
      logger.info(`Migrated user ${user.email} to hashed password`, { userId: user.id });
    }

    if (!isMatch) {
      logger.warn("Signin failed: Invalid password", { email, userId: user.id });
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    logger.info("User signin succeeded", { userId: user.id, email });

    res.json({
      message: "Signed in successfully",
      userId: user.id,
      name: user.name,
      token: token
    });
  } catch (err) {
    logger.error("User signin failed due to internal error", err, { email: req.body.email });
    next(err);
  }
}

export async function verifyToken(req, res) {
  // req.user is populated by authMiddleware
  res.json({
    valid: true,
    user: req.user
  });
}

export async function saveSubjects(req, res, next) {
  try {
    const id = req.user.id; // Secure extraction from token
    const { subjects } = req.body;

    if (!subjects || !Array.isArray(subjects)) {
      return res.status(400).json({ message: "Subjects array is required" });
    }

    // Subject validation
    for (const sub of subjects) {
      if (!sub || typeof sub.name !== 'string' || sub.name.trim().length < 2 || sub.name.trim().length > 40) {
        logger.warn("Save subjects failed: invalid subject name length", { userId: id, subject: sub });
        return res.status(400).json({ message: "Subject names must be between 2 and 40 characters" });
      }
      if (/[<>]/.test(sub.name)) {
        logger.warn("Save subjects failed: subject name contains HTML characters", { userId: id, subjectName: sub.name });
        return res.status(400).json({ message: "Subject names cannot contain HTML characters" });
      }
    }

    await saveSubjectsService(id, subjects);

    logger.info("Subjects saved successfully", { userId: id, count: subjects.length });
    res.json({ message: "Subjects saved successfully" });
  } catch (err) {
    next(err);
  }
}

export async function getUserProfile(req, res, next) {
  try {
    const id = req.user.id; // Secure extraction from token
    const users = await getUserById(id);

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const safeUser = { ...users[0] };
    delete safeUser.password;

    res.json(safeUser);
  } catch (err) {
    next(err);
  }
}

export async function updateUserProfile(req, res, next) {
  try {
    const id = req.user.id; // Secure extraction from token
    const { name, email, startMarker } = req.body;

    if (
      (!name || name.trim() === "") &&
      (!email || email.trim() === "") &&
      (startMarker === undefined)
    ) {
      return res.status(400).json({ message: "Name, email, or start marker is required" });
    }

    if (name) {
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({ message: "Name must be between 2 and 50 characters" });
      }
      if (/[<>]/.test(name)) {
        return res.status(400).json({ message: "Name cannot contain HTML characters" });
      }
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Valid email required" });
      }

      const existingUsers = await getUserByEmail(email);
      if (existingUsers && existingUsers.length > 0 && existingUsers[0].id !== parseInt(id)) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
    }

    const updatedData = {};
    if (name) updatedData.name = name;
    if (email) updatedData.email = email;
    if (startMarker !== undefined) updatedData.startMarker = startMarker;

    const updatedUsers = await updateUser(id, updatedData);

    if (!updatedUsers || updatedUsers.length === 0) {
      return res.status(500).json({ message: "Failed to update user profile" });
    }

    // Send email notification if email was updated
    if (email) {
      logger.info("Sending email change notification", { userId: id, email });
      sendEmailChangeNotification(email, updatedUsers[0].name).catch(e => {
        logger.error("Email send failed for email change notification", e, { userId: id, email });
      });
    }

    const safeUser = { ...updatedUsers[0] };
    delete safeUser.password;

    logger.info("User profile updated successfully", { userId: id });
    res.json({ message: "Profile updated successfully", user: safeUser });
  } catch (err) {
    next(err);
  }
}

// In-memory store for OTPs (for production, use Redis or DB)
const otpStore = new Map();

export async function requestPasswordOTP(req, res, next) {
  try {
    const id = req.user.id; // Secure extraction from token

    const users = await getUserById(id);
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    if (!user.email) {
      return res.status(400).json({ message: "No email associated with this account" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with 10 minute expiration
    otpStore.set(String(id), {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Send email
    logger.info("Sending password change OTP email", { userId: id });
    const emailSent = await sendPasswordOTPEmail(user.email, user.name, otp);

    if (!emailSent) {
      logger.error("Email send failed for password reset OTP", null, { userId: id, email: user.email });
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const id = req.user.id; // Secure extraction from token
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      return res.status(400).json({ message: "OTP and new password are required" });
    }

    // Password strength check
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W_]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: "Password must contain at least one letter and one number" });
    }

    // Verify OTP
    const storedData = otpStore.get(String(id));
    if (!storedData) {
      return res.status(400).json({ message: "No OTP requested or OTP expired" });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(String(id));
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP is valid, clear it
    otpStore.delete(String(id));

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in DB
    await updateUserPasswordService(id, hashedPassword);

    // Send confirmation email
    const users = await getUserById(id);
    if (users && users.length > 0 && users[0].email) {
      logger.info("Sending password change confirmation email", { userId: id });
      sendPasswordChangeEmail(users[0].email, users[0].name).catch(e => {
        logger.error("Email send failed for password change confirmation", e, { userId: id, email: users[0].email });
      });
    }

    logger.info("User password changed successfully via OTP", { userId: id });
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
}

// In-memory store for Forgot Password OTPs
const forgotPasswordOtpStore = new Map();

export async function forgotPasswordOTP(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const users = await getUserByEmail(email);
    if (!users || users.length === 0) {
      logger.warn("Forgot password OTP request failed: Email not found", { email });
      return res.status(404).json({ message: "User with this email not found" });
    }

    const user = users[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP under the email key
    forgotPasswordOtpStore.set(email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Send email
    logger.info("Sending forgot password OTP email", { email });
    const emailSent = await sendPasswordOTPEmail(email, user.name, otp);

    if (!emailSent) {
      logger.error("Email send failed for forgot password OTP", null, { email });
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordReset(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    // Password strength check
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W_]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: "Password must contain at least one letter and one number" });
    }

    // Verify OTP
    const storedData = forgotPasswordOtpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ message: "No OTP requested or OTP expired" });
    }

    if (Date.now() > storedData.expiresAt) {
      forgotPasswordOtpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP is valid, clear it
    forgotPasswordOtpStore.delete(email);

    // Find user to get ID
    const users = await getUserByEmail(email);
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = users[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await updateUserPasswordService(user.id, hashedPassword);

    // Send confirmation email
    logger.info("Sending password change confirmation email for reset", { email });
    sendPasswordChangeEmail(user.email, user.name).catch(e => {
      logger.error("Email send failed for forgot password reset confirmation", e, { email: user.email });
    });

    logger.info("Forgot password reset completed successfully", { userId: user.id, email });
    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    next(err);
  }
}