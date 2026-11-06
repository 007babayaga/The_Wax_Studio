// All OTP reads and writes for sign-up and password reset.
//
// Every write that guards security is a single atomic MongoDB operation, so
// parallel requests can't slip past the cooldown, the send limit or the
// wrong-guess limit.
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { emailOtpModel, OTP_PURPOSES } = require('../models/emailOtpSchema');
// Called as emailHelper.sendOtp(...) at send time (not destructured), so
// tests can swap in a fake.
const emailHelper = require('./emailHelper');

const OTP_TTL_MS = 5 * 60 * 1000;                  // keep in sync with OTP_TTL_MINUTES in emailHelper
const OTP_RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const OTP_MAX_VERIFY_ATTEMPTS = 5;                 // per code
const OTP_SEND_WINDOW_MS = 60 * 60 * 1000;
const OTP_MAX_SENDS_PER_WINDOW = 5;                // per email and purpose
const SIGNUP_VERIFIED_WINDOW_MS = 30 * 60 * 1000;  // time to finish sign-up after verifying
const OTP_HASH_ROUNDS = 10;

const SIGNUP_COOKIE_NAME = 'signup_verification';

const generateOtp = () => crypto.randomInt(10000, 100000).toString(); // 5 digits
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const toSeconds = (ms) => Math.max(1, Math.ceil(ms / 1000));
const cleanText = (value, maxLength) =>
    typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

/**
 * Creates (or replaces) the code for this email and purpose and emails it.
 *
 * deliver: false runs every check and stores a record without sending an
 * email. Forgot-password uses it for unknown emails so they answer exactly
 * like real accounts, cooldown included.
 *
 * Returns one of:
 *   { status: 'sent' }
 *   { status: 'cooldown', retryAfterSeconds }
 *   { status: 'limit',    retryAfterSeconds }
 *   { status: 'send_failed', error }
 */
const issueOtp = async ({ email, purpose, profile, deliver = true }) => {
    const now = Date.now();
    const existing = await emailOtpModel.findOne({ email, purpose }).lean();

    if (existing?.lastSentAt) {
        const wait = new Date(existing.lastSentAt).getTime() + OTP_RESEND_COOLDOWN_MS - now;
        if (wait > 0) {
            return { status: 'cooldown', retryAfterSeconds: toSeconds(wait) };
        }
    }

    let firstSentAt = new Date(now);
    let sendCount = 1;
    if (existing?.firstSentAt && now - new Date(existing.firstSentAt).getTime() < OTP_SEND_WINDOW_MS) {
        if ((existing.sendCount || 0) >= OTP_MAX_SENDS_PER_WINDOW) {
            const wait = new Date(existing.firstSentAt).getTime() + OTP_SEND_WINDOW_MS - now;
            return { status: 'limit', retryAfterSeconds: toSeconds(wait) };
        }
        firstSentAt = new Date(existing.firstSentAt);
        sendCount = (existing.sendCount || 0) + 1;
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, OTP_HASH_ROUNDS);

    const update = {
        otp: otpHash,
        otpExpiryTime: new Date(now + OTP_TTL_MS),
        lastSentAt: new Date(now),
        firstSentAt,
        sendCount,
        attempts: 0,
        isVerified: false,
        verifiedAt: null,
        signupTokenHash: null,
        // Outlives the code, the sign-up window and the send window.
        expiresAt: new Date(now + OTP_SEND_WINDOW_MS)
    };
    if (profile) {
        update.name = cleanText(profile.name, 100);
        update.dateOfBirth = cleanText(profile.dateOfBirth, 30);
    }

    let record;
    try {
        // Matches only if no code was sent within the cooldown. If one was
        // (a parallel request won), the upsert tries to insert a second
        // record and the unique index rejects it with E11000.
        record = await emailOtpModel.findOneAndUpdate(
            {
                email,
                purpose,
                lastSentAt: { $not: { $gt: new Date(now - OTP_RESEND_COOLDOWN_MS) } }
            },
            { $set: update },
            { upsert: true, returnDocument: 'after' }
        );
    } catch (err) {
        if (err?.code === 11000) {
            return { status: 'cooldown', retryAfterSeconds: toSeconds(OTP_RESEND_COOLDOWN_MS) };
        }
        throw err;
    }

    if (!deliver) {
        return { status: 'sent' };
    }

    try {
        await emailHelper.sendOtp(email, otp, { purpose });
    } catch (error) {
        // The user never got this code: kill it and lift the cooldown so they
        // can retry straight away. The otp filter skips this if a newer code
        // has replaced it meanwhile.
        await emailOtpModel.updateOne(
            { _id: record._id, otp: otpHash },
            {
                $set: { otpExpiryTime: new Date(0), lastSentAt: null },
                $inc: { sendCount: -1 }
            }
        ).catch(() => {});
        return { status: 'send_failed', error };
    }

    return { status: 'sent' };
};

/**
 * Checks a code. Each check uses up one attempt BEFORE the comparison, in a
 * single atomic update, so firing many guesses in parallel can't exceed
 * OTP_MAX_VERIFY_ATTEMPTS.
 *
 * Returns one of:
 *   { status: 'matched', record }
 *   { status: 'invalid', attemptsLeft }
 *   { status: 'locked' }      too many wrong guesses; a new code is needed
 *   { status: 'expired' }
 *   { status: 'not_found' }
 */
const verifyOtp = async ({ email, purpose, otp }) => {
    const now = new Date();

    const record = await emailOtpModel.findOneAndUpdate(
        {
            email,
            purpose,
            otpExpiryTime: { $gt: now },
            attempts: { $lt: OTP_MAX_VERIFY_ATTEMPTS }
        },
        { $inc: { attempts: 1 } },
        { returnDocument: 'after' }
    );

    if (!record) {
        const current = await emailOtpModel.findOne({ email, purpose }).lean();
        if (!current) return { status: 'not_found' };
        if (new Date(current.otpExpiryTime) <= now) return { status: 'expired' };
        return { status: 'locked' };
    }

    const matched = await bcrypt.compare(String(otp), record.otp);
    if (matched) {
        return { status: 'matched', record };
    }

    // The record is kept (not deleted) when locked, so its cooldown and send
    // count still apply to the next request.
    if (record.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
        return { status: 'locked' };
    }
    return { status: 'invalid', attemptsLeft: OTP_MAX_VERIFY_ATTEMPTS - record.attempts };
};

/**
 * Marks a matched sign-up code as verified and returns a random token for the
 * browser, or null if a newer code replaced this one during the check.
 */
const markSignupVerified = async (record) => {
    const token = crypto.randomBytes(32).toString('hex');
    const result = await emailOtpModel.updateOne(
        { _id: record._id, otp: record.otp },
        {
            $set: {
                isVerified: true,
                verifiedAt: new Date(),
                signupTokenHash: sha256(token)
            }
        }
    );
    return result.matchedCount === 1 ? token : null;
};

/**
 * Uses up the sign-up verification for this email. Succeeds only for the
 * browser that verified (it holds the token), within the time window, and
 * only once: findOneAndDelete is atomic, so two parallel sign-ups can't both
 * pass. Returns true when the email may be registered.
 */
const consumeSignupVerification = async ({ email, token }) => {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
        return false;
    }
    const record = await emailOtpModel.findOneAndDelete({
        email,
        purpose: OTP_PURPOSES.SIGNUP,
        isVerified: true,
        verifiedAt: { $gte: new Date(Date.now() - SIGNUP_VERIFIED_WINDOW_MS) },
        signupTokenHash: sha256(token)
    });
    return Boolean(record);
};

/**
 * Uses up a matched reset code. Returns false if it was already used (or
 * replaced) by a parallel request, so one code can reset a password only once.
 */
const consumeOtp = async (record) => {
    const result = await emailOtpModel.deleteOne({ _id: record._id, otp: record.otp });
    return result.deletedCount === 1;
};

const deleteAllOtpsForEmail = (email) => emailOtpModel.deleteMany({ email });

/**
 * Run once at startup: drops records from before `purpose` existed (they can't
 * satisfy the unique index and are at most minutes old) and builds the indexes.
 */
const prepareOtpCollection = async () => {
    await emailOtpModel.deleteMany({
        $or: [{ purpose: { $exists: false } }, { expiresAt: { $exists: false } }]
    });
    await emailOtpModel.syncIndexes();
};

module.exports = {
    OTP_PURPOSES,
    SIGNUP_COOKIE_NAME,
    SIGNUP_VERIFIED_WINDOW_MS,
    issueOtp,
    verifyOtp,
    markSignupVerified,
    consumeSignupVerification,
    consumeOtp,
    deleteAllOtpsForEmail,
    prepareOtpCollection
};
