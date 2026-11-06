// End-to-end tests for /api/v1/auth and /api/v1/otp.
// Runs the real routers against an in-memory MongoDB. Email (Resend) and
// Google token checks are replaced with fakes, so nothing leaves the machine.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client';
process.env.NODE_ENV = 'test';

// --- fakes, installed before the controllers are required -----------------
const sentOtps = new Map();
const emailHelper = require('../utils/emailHelper');
emailHelper.sendOtp = async (email, otp) => {
    sentOtps.set(email, String(otp));
};

const googlePayloads = new Map();
const { OAuth2Client } = require('google-auth-library');
OAuth2Client.prototype.verifyIdToken = async ({ idToken }) => {
    const payload = googlePayloads.get(idToken);
    if (!payload) throw new Error('bad token');
    return { getPayload: () => payload };
};

const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { apiRouter } = require('../api/routes');
const { userModel } = require('../models/userSchema');
const { emailOtpModel } = require('../models/emailOtpSchema');

let mongo;
let server;
let baseUrl;

test.before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'auth-tests' });

    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/v1', apiRouter);

    await new Promise((resolve) => {
        server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
});

// Silence the controllers' console.log noise.
const originalLog = console.log;
test.before(() => {
    console.log = () => {};
});
test.after(() => {
    console.log = originalLog;
});

// --- helpers ---------------------------------------------------------------
// A tiny cookie jar per "browser".
const makeClient = () => {
    const jar = new Map();

    const call = async (method, path, body) => {
        const headers = {};
        if (jar.size) {
            headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
        }
        if (body !== undefined) headers['content-type'] = 'application/json';

        const response = await fetch(`${baseUrl}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });

        const setCookies = response.headers.getSetCookie();
        for (const cookie of setCookies) {
            const [pair, ...attributes] = cookie.split(';');
            const [name, value] = pair.split('=');
            const expired = attributes.some((attr) =>
                /expires=thu, 01 jan 1970/i.test(attr.trim())
            );
            if (expired || value === '') jar.delete(name.trim());
            else jar.set(name.trim(), value);
        }

        const text = await response.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }
        return { status: response.status, data, setCookies };
    };

    return {
        jar,
        get: (path) => call('GET', path),
        post: (path, body) => call('POST', path, body),
        put: (path, body) => call('PUT', path, body),
    };
};

const PASSWORD = 'Candle@123';
let emailCounter = 0;
const uniqueEmail = () => `tester${Date.now()}${emailCounter++}@gmail.com`;

const signUp = (client, email, password = PASSWORD) =>
    client.post('/auth/signUp', {
        name: 'Test User',
        email,
        dateOfBirth: '1995-05-20',
        password,
    });

const createLoggedInUser = async (overrides = {}) => {
    const client = makeClient();
    const email = uniqueEmail();
    await userModel.create({
        name: 'Test User',
        email,
        dateOfBirth: new Date('1995-05-20'),
        password: PASSWORD,
        isVerified: true,
        ...overrides,
    });
    const login = await client.post('/auth/userLogin', { email, password: PASSWORD });
    assert.equal(login.status, 200, `login failed: ${JSON.stringify(login.data)}`);
    return { client, email };
};

// --- sign up + OTP ---------------------------------------------------------
test('signup: full OTP flow creates an account', async () => {
    const client = makeClient();
    const email = uniqueEmail();

    const send = await client.post('/otp/toEmail', { email, name: 'Test User', dateOfBirth: '1995-05-20' });
    assert.equal(send.status, 200);
    assert.ok(sentOtps.get(email), 'OTP should have been "emailed"');

    const verify = await client.post('/otp/verifyEmailOtp', { email, otp: sentOtps.get(email) });
    assert.equal(verify.status, 200);

    const created = await signUp(client, email);
    assert.equal(created.status, 200);
    assert.ok(await userModel.findOne({ email }));
});

test('signup: is refused when the email was never verified with an OTP', async () => {
    const client = makeClient();
    const email = uniqueEmail();

    // Skip /otp entirely and call signUp directly.
    const created = await signUp(client, email);

    assert.notEqual(created.status, 200, 'anyone can register any email without proving they own it');
});

test('signup: rejects a duplicate email', async () => {
    const { email } = await createLoggedInUser();
    const res = await signUp(makeClient(), email);
    assert.equal(res.status, 409);
});

test('signup: rejects a weak password', async () => {
    const res = await signUp(makeClient(), uniqueEmail(), 'password');
    assert.equal(res.status, 400);
});

test('signup: the stored password is hashed', async () => {
    const { email } = await createLoggedInUser();
    const user = await userModel.findOne({ email });
    assert.notEqual(user.password, PASSWORD);
    assert.match(user.password, /^\$2[aby]\$/);
});

test('signup: a role sent in the body is ignored', async () => {
    const client = makeClient();
    const email = uniqueEmail();
    await client.post('/otp/toEmail', { email, name: 'Sneaky', dateOfBirth: '1995-05-20' });
    await client.post('/otp/verifyEmailOtp', { email, otp: sentOtps.get(email) });

    const res = await client.post('/auth/signUp', {
        name: 'Sneaky', email, dateOfBirth: '1995-05-20', password: PASSWORD, role: 'admin',
    });
    assert.equal(res.status, 200);
    const user = await userModel.findOne({ email });
    assert.equal(user.role, 'user');
});

test('signup: a verified OTP can only be used for one account', async () => {
    const client = makeClient();
    const email = uniqueEmail();
    await client.post('/otp/toEmail', { email, name: 'Test User', dateOfBirth: '1995-05-20' });
    await client.post('/otp/verifyEmailOtp', { email, otp: sentOtps.get(email) });
    assert.equal((await signUp(client, email)).status, 200);

    await userModel.deleteOne({ email });
    assert.equal((await signUp(client, email)).status, 403);
});

test('signup: allows passwords longer than 12 characters', async () => {
    const client = makeClient();
    const email = uniqueEmail();
    await client.post('/otp/toEmail', { email, name: 'Test User', dateOfBirth: '1995-05-20' });
    await client.post('/otp/verifyEmailOtp', { email, otp: sentOtps.get(email) });
    assert.equal((await signUp(client, email, 'LongCandle@Password123')).status, 200);
});

test('otp: verifying is locked after repeated wrong guesses', async () => {
    const client = makeClient();
    const email = uniqueEmail();
    await client.post('/otp/toEmail', { email, name: 'Test User', dateOfBirth: '1995-05-20' });
    const realOtp = sentOtps.get(email);
    const wrongOtp = realOtp === '11111' ? '22222' : '11111';

    for (let attempt = 0; attempt < 10; attempt += 1) {
        await client.post('/otp/verifyEmailOtp', { email, otp: wrongOtp });
    }
    const afterGuesses = await client.post('/otp/verifyEmailOtp', { email, otp: realOtp });

    assert.notEqual(afterGuesses.status, 200, 'a 5-digit OTP can be guessed without limit');
});

test('otp: rejects a MongoDB operator instead of an email', async () => {
    const victim = uniqueEmail();
    await makeClient().post('/otp/toEmail', { email: victim, name: 'Victim', dateOfBirth: '1995-05-20' });
    const before = await emailOtpModel.findOne({ email: victim }).lean();

    // Wait out nothing: a NoSQL operator matches the victim's OTP record.
    await emailOtpModel.updateOne({ email: victim }, { $set: { lastSentAt: new Date(0) } });
    const res = await makeClient().post('/otp/resendOtpToEmail', { email: { $gt: '' } });
    const after = await emailOtpModel.findOne({ email: victim }).lean();

    assert.equal(res.status, 400, `expected 400, got ${res.status}`);
    assert.equal(after.otp, before.otp, "someone else's OTP was regenerated");
});

// --- login -----------------------------------------------------------------
test('login: correct password sets httpOnly cookies and returns no secrets', async () => {
    const email = uniqueEmail();
    await userModel.create({
        name: 'Test User', email, dateOfBirth: new Date('1995-05-20'), password: PASSWORD, isVerified: true,
    });
    const client = makeClient();
    const res = await client.post('/auth/userLogin', { email, password: PASSWORD });

    assert.equal(res.status, 200);
    assert.ok(client.jar.has('access_token'));
    assert.ok(client.jar.has('refresh_token'));
    assert.ok(res.setCookies.every((cookie) => /httponly/i.test(cookie)));
    assert.equal(res.data.user.password, undefined);
    assert.equal(res.data.user.sessions, undefined);
});

test('login: wrong password and unknown email give the same answer', async () => {
    const { email } = await createLoggedInUser();
    const wrongPassword = await makeClient().post('/auth/userLogin', { email, password: 'Wrong@1234' });
    const unknownEmail = await makeClient().post('/auth/userLogin', { email: uniqueEmail(), password: PASSWORD });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(wrongPassword.data.message, unknownEmail.data.message);
});

test('login: email is case-insensitive', async () => {
    const { email } = await createLoggedInUser();
    const res = await makeClient().post('/auth/userLogin', { email: email.toUpperCase(), password: PASSWORD });
    assert.equal(res.status, 200);
});

test('login: rejects a MongoDB operator instead of an email', async () => {
    const res = await makeClient().post('/auth/userLogin', { email: { $ne: null }, password: PASSWORD });
    assert.equal(res.status, 400);
});

test('login: an empty request body gives 400, not 500', async () => {
    const res = await makeClient().post('/auth/userLogin');
    assert.equal(res.status, 400);
});

test('login: old sessions do not pile up forever', async () => {
    const { email } = await createLoggedInUser();
    for (let i = 0; i < 25; i += 1) {
        await makeClient().post('/auth/userLogin', { email, password: PASSWORD });
    }
    const user = await userModel.findOne({ email });
    assert.ok(user.sessions.length <= 20, `user has ${user.sessions.length} stored sessions`);
});

// --- session status / refresh / logout ------------------------------------
test('status: returns the signed-in user', async () => {
    const { client, email } = await createLoggedInUser();
    const res = await client.get('/auth/userStatus');
    assert.equal(res.status, 200);
    assert.equal(res.data.user.email, email);
});

test('status: 401 without a cookie', async () => {
    const res = await makeClient().get('/auth/userStatus');
    assert.equal(res.status, 401);
});

test('status: rejects a token signed with the wrong secret', async () => {
    const client = makeClient();
    client.jar.set('access_token', jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, 'not-the-secret'));
    const res = await client.get('/auth/userStatus');
    assert.equal(res.status, 401);
});

test('refresh: issues new tokens and the old refresh token stops working', async () => {
    const { client } = await createLoggedInUser();
    const oldRefresh = client.jar.get('refresh_token');

    const first = await client.post('/auth/refreshToken');
    assert.equal(first.status, 200);
    assert.notEqual(client.jar.get('refresh_token'), oldRefresh);

    const replay = makeClient();
    replay.jar.set('refresh_token', oldRefresh);
    const second = await replay.post('/auth/refreshToken');
    assert.equal(second.status, 401);
});

test('logout: ends the session so the refresh token no longer works', async () => {
    const { client } = await createLoggedInUser();
    const refresh = client.jar.get('refresh_token');

    const res = await client.post('/auth/userLogout');
    assert.equal(res.status, 200);

    const replay = makeClient();
    replay.jar.set('refresh_token', refresh);
    assert.equal((await replay.post('/auth/refreshToken')).status, 401);
});

test('logout: still works after the 1-hour access token has expired', async () => {
    const { client } = await createLoggedInUser();
    const refresh = client.jar.get('refresh_token');

    // Simulate the browser after the access cookie expired: only the refresh cookie is left.
    client.jar.delete('access_token');
    const res = await client.post('/auth/userLogout');

    const replay = makeClient();
    replay.jar.set('refresh_token', refresh);
    const refreshAfterLogout = await replay.post('/auth/refreshToken');

    assert.equal(res.status, 200, `logout returned ${res.status}`);
    assert.equal(refreshAfterLogout.status, 401, 'the session survived logout, so a page reload logs the user back in');
});

test('logout: cookies are cleared with the same attributes they were set with', async () => {
    const { client } = await createLoggedInUser();
    const res = await client.post('/auth/userLogout');
    // In production cookies are set with SameSite=None; Secure. A clear without
    // those attributes is ignored by browsers on a cross-site request.
    const cleared = res.setCookies.filter((cookie) => /access_token=;|refresh_token=;/.test(cookie));
    assert.equal(cleared.length, 2);
    for (const cookie of cleared) {
        assert.match(cookie, /httponly/i, `cleared without HttpOnly: ${cookie}`);
        assert.match(cookie, /samesite/i, `cleared without SameSite: ${cookie}`);
    }
});

// --- forgot / reset password ----------------------------------------------
test('forgot password: same answer for known and unknown emails', async () => {
    const { email } = await createLoggedInUser();
    const known = await makeClient().post('/auth/forgotPassword', { email });
    const unknown = await makeClient().post('/auth/forgotPassword', { email: uniqueEmail() });
    assert.equal(known.status, 200);
    assert.equal(unknown.status, 200);
    assert.equal(known.data.message, unknown.data.message);
});

test('reset password: works with the OTP and logs out every session', async () => {
    const { client, email } = await createLoggedInUser();
    await makeClient().post('/auth/forgotPassword', { email });
    const otp = sentOtps.get(email);

    const res = await makeClient().post('/auth/resetPassword', { email, otp, newPassword: 'Newwax@123' });
    assert.equal(res.status, 200);

    const oldPassword = await makeClient().post('/auth/userLogin', { email, password: PASSWORD });
    const newPassword = await makeClient().post('/auth/userLogin', { email, password: 'Newwax@123' });
    assert.equal(oldPassword.status, 401);
    assert.equal(newPassword.status, 200);

    const refresh = await client.post('/auth/refreshToken');
    assert.equal(refresh.status, 401, 'old refresh token should be dead');
});

test('reset password: an old access token stops working straight away', async () => {
    const { client, email } = await createLoggedInUser();
    await makeClient().post('/auth/forgotPassword', { email });
    await makeClient().post('/auth/resetPassword', { email, otp: sentOtps.get(email), newPassword: 'Newwax@123' });

    const status = await client.get('/auth/userStatus');
    assert.equal(status.status, 401, 'a stolen access token keeps working for up to an hour after a password reset');
});

test('reset password: OTP is locked after 5 wrong guesses', async () => {
    const { email } = await createLoggedInUser();
    await makeClient().post('/auth/forgotPassword', { email });
    const realOtp = sentOtps.get(email);
    const wrongOtp = realOtp === '11111' ? '22222' : '11111';

    for (let attempt = 0; attempt < 5; attempt += 1) {
        await makeClient().post('/auth/resetPassword', { email, otp: wrongOtp, newPassword: 'Newwax@123' });
    }
    const res = await makeClient().post('/auth/resetPassword', { email, otp: realOtp, newPassword: 'Newwax@123' });
    assert.notEqual(res.status, 200);
});

// --- Google ----------------------------------------------------------------
test('google: creates a user and signs them in', async () => {
    const email = uniqueEmail();
    googlePayloads.set('good-token', {
        email, name: 'G User', sub: 'google-123', email_verified: true, iss: 'https://accounts.google.com',
    });
    const client = makeClient();
    const res = await client.post('/auth/google', { idToken: 'good-token' });

    assert.equal(res.status, 200);
    assert.equal(res.data.user.authProvider, 'google');
    assert.ok(client.jar.has('refresh_token'));
});

test('google: rejects an invalid token with 401, not 500', async () => {
    const res = await makeClient().post('/auth/google', { idToken: 'forged' });
    assert.equal(res.status, 401);
});

test('google: rejects an unverified Google email', async () => {
    googlePayloads.set('unverified', {
        email: uniqueEmail(), name: 'G', sub: 'g-2', email_verified: false, iss: 'accounts.google.com',
    });
    const res = await makeClient().post('/auth/google', { idToken: 'unverified' });
    assert.equal(res.status, 401);
});

// --- profile ---------------------------------------------------------------
test('profile: updates name and rejects bad input', async () => {
    const { client } = await createLoggedInUser();
    const good = await client.put('/auth/profile', { name: 'New Name' });
    assert.equal(good.status, 200);
    assert.equal(good.data.user.name, 'New Name');

    const bad = await client.put('/auth/profile', { phone: { countryCode: '+999', number: '123' } });
    assert.equal(bad.status, 400);
});

test('profile: cannot be used to change role or email', async () => {
    const { client, email } = await createLoggedInUser();
    await client.put('/auth/profile', { name: 'Still User', role: 'admin', email: 'other@gmail.com' });
    const user = await userModel.findOne({ email });
    assert.equal(user.role, 'user');
});

// --- delete account --------------------------------------------------------
test('delete account: wrong password is refused with 403', async () => {
    const { client } = await createLoggedInUser();
    const res = await client.post('/auth/deleteAccount', { password: 'Wrong@1234' });
    assert.equal(res.status, 403);
});

test('delete account: the only admin cannot delete themselves', async () => {
    await userModel.deleteMany({ role: 'admin' });
    const { client } = await createLoggedInUser({ role: 'admin' });
    const res = await client.post('/auth/deleteAccount', { password: PASSWORD });
    assert.equal(res.status, 409);
});

test('delete account: correct password deletes the user and clears cookies', async () => {
    const { client, email } = await createLoggedInUser();
    const res = await client.post('/auth/deleteAccount', { password: PASSWORD });

    assert.equal(res.status, 200);
    assert.equal(await userModel.findOne({ email }), null);
    assert.equal((await client.post('/auth/refreshToken')).status, 401);
});
