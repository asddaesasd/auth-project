const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Firebase configuration
const firebaseConfig = {
    "type": "service_account",
    "project_id": "sinwareperm",
    "private_key_id": "2a90933b2fb489efcb69e2e68d3006c15dd28002",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCh14jMihxyvDGk\ns8z1eo+oaw8wtXNhU2EnFpx01HSS2LM8APzN4oXOxmlRtAOyfdU8Jt6ntG+Q9flb\n8CdBmrUzuHbi/rDj7ov1NOtIuED8atEgoiZdhWqnyGdovWOqEMcVSRcPzfRiKotx\nZAVFwZyUil7yebfZ5iN5tZj8KWF7QhEsZSzqRrUBH2NEMa3S6mD589EpF1rsZl6W\n83jsJzIVN4U6EDel8WoUTt7pTPtxgQOoU5egzPPej0Ei7GtgNxZ4Lgc8RYNPQyTH\nzV7rGhQkCQ7K2q9nS+w+lnyBjQfbqAzxaVAT9B7gzhCEGjP+jgA56/QDSv5R128B\n48GURJgzAgMBAAECggEASXDgq4yqzyf2URqkUertgMwgRwa4Fny7M/0vP1bflXmP\nkBWUoqr99HCV/1T0bo1qc5Lh6/FVxU7RerZ2Ye9d9dvp2yUfSTeJPFrowAWYu9KP\nFsNuLHcsCHpI7r8umFBnvxF9TRc1JEzRHUH5oId00fUek+LHGrKz+3l8NEVk7oS5\n94UOJHx3tJPysFnVdy2Gwcd5HvwjRWIs7WG0VgNFcJH06vye+RvmshYQ7usYHYUH\nGD0VHbzOh0WExJeg5fg8P7sKeg1CNoPgHyI4W85bw7cF75i1ku/W2gpqiSaR/SZn\nEipvrdtB9a1SJk/FhO9fzGqGLFUprKN/F+y+xjBJwQKBgQDXOfcm43XHLf11qN78\nw3mFS61iXIs8909zsZAXpB1MrAEc6E5z/OcvF1so1gsxEMc4W4Tq8dvs/eWQvJ9w\nYWRCfv8l209ImgBws5S2fSYdN3GKRX0wQ7ThAafjWmJvwKDEN/l//HsCXepPGCGR\nuX6qVuFdUqg6vJmCvIVmBLKuQQKBgQDAgIgif1vCKyCXcz92eCUyrhRX3ysu++Yj\nH6ACV0zDnNuLhcimrvwkA2N6duL9TWC75MFw3PGZ7/abMVGg/0C3hiI2OTdffO7N\nuO4AB4ci46rH/6iyAvLsj1Jr05o/lR4nYnpWaxNHhI/AM9wxuL2R06W3585v4TTr\n0vONGu4RcwKBgQCqXPPKEJqWA01x6S45HfH/FRw1k9OTep+lkJPiYsHegviOjUQs\ng6/rkq1R8bwCJqnLboYUA0Z2nbMtkmESb8UQ7b3BlYt4iI54p2271expjA2PydmC\nbtWqlcjzKgRpOS0IpNYV/SDRis2BtjQ8SXx+ES9q05beh5Nr7RYa3vUhAQKBgEsp\npH37xmMhHb+kwzHJpZSNPeo1fBIDTw+FyJ9BYPq740kt+nOCvXZ+UDg/9U88CDo1\nDoa37inR9TMRZbL8F1PRLsiHPKSvDjsLKvqd9djclhEzNLYUyq8tItxxKbgLzFNK\nc0QM2OFC1DISzbYoUPSAdCNDgmpSv6wYmPoOesgbAoGBALZ2kZrcUHH1wRl1W/Gv\n9+F4zBWtSrKJSDgmxmNgRSU89cDKY9jL7Pdw4eDM2FiPoLQ/in4BMO4WMqK6v6Wn\nJVk6fdKunpNu3UsNFu8QZcLlLRJpuV99L8KoAMlHldMERMjnSeP1+6lYpDXZKWMT\ni1ITmQoqI+W3K+mhTTK3yTtz\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-fbsvc@sinwareperm.iam.gserviceaccount.com",
    "client_id": "100526199132791755884",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40sinwareperm.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
};

// Initialize Firebase
admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    databaseURL: "https://sinwareperm-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const keysRef = db.ref('keys');
const appsRef = db.ref('applications');
const adminsRef = db.ref('admins');

// Helper functions
function generateKey() {
    return 'SINW-' + crypto.randomBytes(4).toString('hex').toUpperCase() +
        '-' + crypto.randomBytes(4).toString('hex').toUpperCase() +
        '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function calculateExpiration(type, customDays = null) {
    const now = new Date();
    if (customDays !== null && !isNaN(customDays)) {
        return now.getTime() + customDays * 24 * 60 * 60 * 1000;
    }

    switch (type) {
        case 'second':
            return now.getTime() + 1000; // 1 second (for testing)
        case 'day':
            return now.getTime() + 24 * 60 * 60 * 1000; // 1 day
        case '3day':
            return now.getTime() + 3 * 24 * 60 * 60 * 1000; // 3 days
        case 'week':
            return now.getTime() + 7 * 24 * 60 * 60 * 1000; // 1 week
        case 'month':
            return now.getTime() + 30 * 24 * 60 * 60 * 1000; // 30 days
        case 'lifetime':
            return now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
        default:
            return now.getTime() + 24 * 60 * 60 * 1000; // Default: 1 day
    }
}

// Authentication middleware
async function authenticateAdmin(req, res, next) {
    // Allow only username and password both equal to '1'
    const { username, password } = req.body;
    if (username === '1' && password === '1') {
        return next();
    }
    return res.status(401).json({ success: false, message: 'Invalid credentials (dev override)' });
}

// Initialize admin if none exists
async function initializeAdmin() {
    try {
        const snapshot = await adminsRef.once('value');
        if (!snapshot.exists()) {
            await adminsRef.child('admin').set({
                password: 'admin123',
                role: 'admin',
                createdAt: new Date().getTime()
            });
            console.log('Default admin account created');
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
    }
}

// Initialize default application if none exists
async function initializeDefaultApp() {
    try {
        const snapshot = await appsRef.once('value');
        if (!snapshot.exists()) {
            await appsRef.child('default').set({
                isActive: true,
                createdAt: new Date().getTime(),
                keyCount: 0
            });
            console.log('Default application created');
        }
    } catch (error) {
        console.error('Error initializing default app:', error);
    }
}

// API Routes

// Admin login
app.post('/api/admin/login', async (req, res) => {
    // Allow only username and password both equal to '1'
    const { username, password } = req.body;
    if (username === '1' && password === '1') {
        return res.json({
            success: true,
            message: 'Login successful (dev override)',
            admin: {
                username: '1',
                role: 'admin'
            }
        });
    }
    return res.status(401).json({ success: false, message: 'Invalid credentials (dev override)' });
});

// Create a new key
app.post('/api/keys/create', authenticateAdmin, async (req, res) => {
    try {
        const { type, username, application = 'default', customDays } = req.body;

        const keyString = generateKey();
        const now = new Date().getTime();

        // Set a placeholder expiration time (will be updated on first activation)
        // We'll still calculate a tentative expiration for display purposes
        let tentativeExpiresAt;
        if (type === 'custom' && customDays) {
            tentativeExpiresAt = calculateExpiration(null, parseInt(customDays));
        } else {
            tentativeExpiresAt = calculateExpiration(type);
        }

        await keysRef.child(keyString).set({
            type: type === 'custom' ? `${customDays} days` : type,
            createdAt: now,
            expiresAt: tentativeExpiresAt, // This will be recalculated on first activation
            isActive: true,
            isBanned: false,
            username: username || null,
            application: application,
            activated: false // New field to track if key has been activated
        });

        // Update key count for the application
        const appSnapshot = await appsRef.child(application).once('value');
        if (appSnapshot.exists()) {
            const appData = appSnapshot.val();
            const keyCount = appData.keyCount || 0;
            await appsRef.child(application).update({ keyCount: keyCount + 1 });
        }

        res.json({
            success: true,
            message: 'Key created successfully',
            key: {
                key: keyString,
                type: type === 'custom' ? `${customDays} days` : type,
                expiresAt: new Date(tentativeExpiresAt).toLocaleString(),
                username: username || null,
                application: application,
                activated: false
            }
        });
    } catch (error) {
        console.error('Error creating key:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// List all keys
app.get('/api/keys', authenticateAdmin, async (req, res) => {
    try {
        const snapshot = await keysRef.once('value');
        const keys = [];

        snapshot.forEach(childSnapshot => {
            const key = childSnapshot.key;
            const data = childSnapshot.val();
            keys.push({
                key,
                type: data.type,
                createdAt: data.createdAt,
                expiresAt: data.expiresAt,
                isActive: data.isActive,
                isBanned: data.isBanned,
                username: data.username || null,
                hwid: data.hwid || null,
                lastUsed: data.lastUsed || null,
                application: data.application || 'default'
            });
        });

        res.json({ success: true, keys });
    } catch (error) {
        console.error('Error listing keys:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get key info
app.get('/api/keys/:key', authenticateAdmin, async (req, res) => {
    try {
        const key = req.params.key;
        const snapshot = await keysRef.child(key).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        const keyData = snapshot.val();

        res.json({
            success: true,
            key: {
                key,
                type: keyData.type,
                createdAt: keyData.createdAt,
                expiresAt: keyData.expiresAt,
                isActive: keyData.isActive,
                isBanned: keyData.isBanned,
                username: keyData.username || null,
                hwid: keyData.hwid || null,
                lastUsed: keyData.lastUsed || null,
                application: keyData.application || 'default'
            }
        });
    } catch (error) {
        console.error('Error getting key info:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete a key
app.delete('/api/keys/:key', authenticateAdmin, async (req, res) => {
    try {
        const key = req.params.key;
        const snapshot = await keysRef.child(key).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        const keyData = snapshot.val();
        const application = keyData.application || 'default';

        await keysRef.child(key).remove();

        // Update key count for the application
        const appSnapshot = await appsRef.child(application).once('value');
        if (appSnapshot.exists()) {
            const appData = appSnapshot.val();
            const keyCount = Math.max(0, (appData.keyCount || 0) - 1);
            await appsRef.child(application).update({ keyCount });
        }

        res.json({ success: true, message: 'Key deleted successfully' });
    } catch (error) {
        console.error('Error deleting key:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Ban a key
app.put('/api/keys/:key/ban', authenticateAdmin, async (req, res) => {
    try {
        const key = req.params.key;
        const snapshot = await keysRef.child(key).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        await keysRef.child(key).update({ isBanned: true });

        res.json({ success: true, message: 'Key banned successfully' });
    } catch (error) {
        console.error('Error banning key:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Unban a key
app.put('/api/keys/:key/unban', authenticateAdmin, async (req, res) => {
    try {
        const key = req.params.key;
        const snapshot = await keysRef.child(key).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        await keysRef.child(key).update({ isBanned: false });

        res.json({ success: true, message: 'Key unbanned successfully' });
    } catch (error) {
        console.error('Error unbanning key:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Pause a key
app.put('/api/keys/:key/pause', authenticateAdmin, async (req, res) => {
    try {
        const key = req.params.key;
        const snapshot = await keysRef.child(key).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        await keysRef.child(key).update({ isActive: false });

        res.json({ success: true, message: 'Key paused successfully' });
    } catch (error) {
        console.error('Error pausing key:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Resume a key
app.put('/api/keys/:key/resume', authenticateAdmin, async (req, res) => {
    try {
        const key = req.params.key;
        const snapshot = await keysRef.child(key).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        await keysRef.child(key).update({ isActive: true });

        res.json({ success: true, message: 'Key resumed successfully' });
    } catch (error) {
        console.error('Error resuming key:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Extend a key
app.put('/api/keys/:key/extend', authenticateAdmin, async (req, res) => {
    try {
        const key = req.params.key;
        const { type, customDays } = req.body;

        const snapshot = await keysRef.child(key).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        const keyData = snapshot.val();
        let additionalTime;

        if (type === 'custom' && customDays) {
            additionalTime = parseInt(customDays) * 24 * 60 * 60 * 1000;
        } else if (type === 'lifetime') {
            // For lifetime, set to 10 years from now
            const newExpiry = new Date().getTime() + 10 * 365 * 24 * 60 * 60 * 1000;
            await keysRef.child(key).update({
                expiresAt: newExpiry,
                type: 'lifetime'
            });

            return res.json({
                success: true,
                message: 'Key extended to lifetime',
                expiresAt: newExpiry
            });
        } else {
            switch (type) {
                case 'day': additionalTime = 24 * 60 * 60 * 1000; break;
                case '3day': additionalTime = 3 * 24 * 60 * 60 * 1000; break;
                case 'week': additionalTime = 7 * 24 * 60 * 60 * 1000; break;
                case 'month': additionalTime = 30 * 24 * 60 * 60 * 1000; break;
                default: additionalTime = 24 * 60 * 60 * 1000; // Default: 1 day
            }
        }

        // Calculate new expiry time
        const currentExpiry = keyData.expiresAt;
        const now = new Date().getTime();

        // If key is expired, extend from now, otherwise extend from current expiry
        const newExpiry = currentExpiry < now ? now + additionalTime : currentExpiry + additionalTime;

        // Update the key with new expiry
        await keysRef.child(key).update({
            expiresAt: newExpiry,
            type: type === 'custom' ? `${customDays} days` : type
        });

        res.json({
            success: true,
            message: 'Key extended successfully',
            expiresAt: newExpiry
        });
    } catch (error) {
        console.error('Error extending key:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Reset HWID for a key
app.put('/api/keys/:key/reset-hwid', authenticateAdmin, async (req, res) => {
    try {
        const key = req.params.key;
        const snapshot = await keysRef.child(key).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        await keysRef.child(key).update({ hwid: null });

        res.json({ success: true, message: 'HWID reset successfully' });
    } catch (error) {
        console.error('Error resetting HWID:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Pause all keys
app.put('/api/keys/pause-all', authenticateAdmin, async (req, res) => {
    try {
        const snapshot = await keysRef.once('value');
        const updates = {};

        snapshot.forEach(childSnapshot => {
            updates[`${childSnapshot.key}/isActive`] = false;
        });

        await keysRef.update(updates);

        res.json({ success: true, message: 'All keys paused successfully' });
    } catch (error) {
        console.error('Error pausing all keys:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Resume all keys
app.put('/api/keys/resume-all', authenticateAdmin, async (req, res) => {
    try {
        const snapshot = await keysRef.once('value');
        const updates = {};

        snapshot.forEach(childSnapshot => {
            updates[`${childSnapshot.key}/isActive`] = true;
        });

        await keysRef.update(updates);

        res.json({ success: true, message: 'All keys resumed successfully' });
    } catch (error) {
        console.error('Error resuming all keys:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get users (based on unique usernames in keys)
app.get('/api/users', authenticateAdmin, async (req, res) => {
    try {
        const keysSnapshot = await keysRef.once('value');
        const users = {};

        keysSnapshot.forEach(childSnapshot => {
            const keyData = childSnapshot.val();
            const username = keyData.username;

            if (username) {
                if (!users[username]) {
                    users[username] = {
                        username,
                        hwid: keyData.hwid || null,
                        lastLogin: keyData.lastUsed || null,
                        keyCount: 1,
                        keys: [childSnapshot.key]
                    };
                } else {
                    users[username].keyCount++;
                    users[username].keys.push(childSnapshot.key);

                    // Update last login if this key was used more recently
                    if (keyData.lastUsed && (!users[username].lastLogin || keyData.lastUsed > users[username].lastLogin)) {
                        users[username].lastLogin = keyData.lastUsed;
                    }

                    // Use the most recent HWID
                    if (keyData.hwid) {
                        users[username].hwid = keyData.hwid;
                    }
                }
            }
        });

        res.json({ success: true, users: Object.values(users) });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get keys for a specific user
app.get('/api/users/:username/keys', authenticateAdmin, async (req, res) => {
    try {
        const username = req.params.username;
        const keysSnapshot = await keysRef.orderByChild('username').equalTo(username).once('value');
        const keys = [];

        keysSnapshot.forEach(childSnapshot => {
            const key = childSnapshot.key;
            const data = childSnapshot.val();
            keys.push({
                key,
                type: data.type,
                createdAt: data.createdAt,
                expiresAt: data.expiresAt,
                isActive: data.isActive,
                isBanned: data.isBanned,
                hwid: data.hwid || null,
                lastUsed: data.lastUsed || null,
                application: data.application || 'default'
            });
        });

        res.json({ success: true, username, keys });
    } catch (error) {
        console.error('Error getting user keys:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Reset HWID for a user (all keys)
app.put('/api/users/:username/reset-hwid', authenticateAdmin, async (req, res) => {
    try {
        const username = req.params.username;
        const keysSnapshot = await keysRef.orderByChild('username').equalTo(username).once('value');
        const updates = {};

        keysSnapshot.forEach(childSnapshot => {
            updates[`${childSnapshot.key}/hwid`] = null;
        });

        if (Object.keys(updates).length === 0) {
            return res.status(404).json({ success: false, message: 'No keys found for this user' });
        }

        await keysRef.update(updates);

        res.json({ success: true, message: `HWID reset for user ${username}` });
    } catch (error) {
        console.error('Error resetting user HWID:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// List applications
app.get('/api/applications', authenticateAdmin, async (req, res) => {
    try {
        const snapshot = await appsRef.once('value');
        const apps = [];

        snapshot.forEach(childSnapshot => {
            const name = childSnapshot.key;
            const data = childSnapshot.val();
            apps.push({
                name,
                isActive: data.isActive,
                keyCount: data.keyCount || 0,
                createdAt: data.createdAt || null
            });
        });

        res.json({ success: true, applications: apps });
    } catch (error) {
        console.error('Error listing applications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add application
app.post('/api/applications', authenticateAdmin, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Application name is required' });
        }

        const snapshot = await appsRef.child(name).once('value');

        if (snapshot.exists()) {
            return res.status(400).json({ success: false, message: 'Application already exists' });
        } await appsRef.child(name).set({
            isActive: true,
            keyCount: 0,
            createdAt: new Date().getTime()
        });

        res.json({
            success: true,
            message: 'Application added successfully',
            application: {
                name,
                isActive: true,
                keyCount: 0,
                createdAt: new Date().getTime()
            }
        });
    } catch (error) {
        console.error('Error adding application:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete application
app.delete('/api/applications/:name', authenticateAdmin, async (req, res) => {
    try {
        const name = req.params.name;

        if (name === 'default') {
            return res.status(400).json({ success: false, message: 'Cannot delete default application' });
        }

        const snapshot = await appsRef.child(name).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        await appsRef.child(name).remove();

        // Update all keys that use this application to use 'default' instead
        const keysSnapshot = await keysRef.orderByChild('application').equalTo(name).once('value');
        const updates = {};

        keysSnapshot.forEach(childSnapshot => {
            updates[`${childSnapshot.key}/application`] = 'default';
        });

        if (Object.keys(updates).length > 0) {
            await keysRef.update(updates);
        }

        res.json({ success: true, message: 'Application deleted successfully' });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// Add this endpoint to initialize admin if it doesn't exist
app.post('/api/admin/initialize', async (req, res) => {
    try {
        const snapshot = await adminsRef.once('value');

        if (!snapshot.exists() || !snapshot.hasChild('admin')) {
            await adminsRef.child('admin').set({
                password: 'admin123',
                role: 'admin',
                createdAt: new Date().getTime()
            });
            res.json({ success: true, message: 'Admin initialized successfully' });
        } else {
            res.json({ success: true, message: 'Admin already exists' });
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add this endpoint to check if admin exists
app.get('/api/check-admin', async (req, res) => {
    try {
        const snapshot = await adminsRef.child('admin').once('value');
        res.json({
            adminExists: snapshot.exists(),
            adminData: snapshot.exists() ? {
                role: snapshot.val().role,
                createdAt: snapshot.val().createdAt
            } : null
        });
    } catch (error) {
        console.error('Error checking admin:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toggle application status (pause/resume)
app.put('/api/applications/:name/toggle', authenticateAdmin, async (req, res) => {
    try {
        const name = req.params.name;
        const snapshot = await appsRef.child(name).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        const appData = snapshot.val();
        const newStatus = !appData.isActive;

        await appsRef.child(name).update({ isActive: newStatus });

        res.json({
            success: true,
            message: `Application ${newStatus ? 'resumed' : 'paused'} successfully`,
            isActive: newStatus
        });
    } catch (error) {
        console.error('Error toggling application status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize admin and default application
initializeAdmin();
initializeDefaultApp();

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
