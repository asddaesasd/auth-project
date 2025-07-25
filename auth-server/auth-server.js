const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors());

// Initialize Firebase
let serviceAccount;
try {
    if (process.env.FIREBASE_CONFIG) {
        serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    } else {
        serviceAccount = require('./firebase-config.json');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.DATABASE_URL
    });
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Simple home route
app.get('/', (req, res) => {
    res.send('Authentication server is running');
});


async function deleteExpiredKeys() {
    try {
        const keysRef = admin.database().ref('keys');
        const snapshot = await keysRef.once('value');
        const now = new Date().getTime();
        const deletePromises = [];
        
        snapshot.forEach(childSnapshot => {
            const key = childSnapshot.key;
            const keyData = childSnapshot.val();
            
            // Only delete keys that have been activated and are expired
            if (keyData.activated && keyData.expiresAt < now) {
                console.log(`Deleting expired key: ${key}`);
                deletePromises.push(keysRef.child(key).remove());
                
                // If we have application info, update the key count
                if (keyData.application) {
                    const appRef = admin.database().ref('applications').child(keyData.application);
                    deletePromises.push(
                        appRef.once('value').then(appSnapshot => {
                            if (appSnapshot.exists()) {
                                const appData = appSnapshot.val();
                                const keyCount = Math.max(0, (appData.keyCount || 0) - 1);
                                return appRef.update({ keyCount });
                            }
                        })
                    );
                }
            }
        });
        
        await Promise.all(deletePromises);
        console.log(`Deleted ${deletePromises.length} expired keys`);
    } catch (error) {
        console.error('Error deleting expired keys:', error);
    }
}

// Authentication endpoint
app.post('/auth', async (req, res) => {
    try {
        const { key, hwid, appName = 'default' } = req.body;
        
        if (!key || !hwid) {
            return res.status(400).json({ success: false, message: 'Key and HWID are required' });
        }
        
        // Get key info from database
        const keysRef = admin.database().ref('keys').child(key);
        const keySnapshot = await keysRef.once('value');
        
        if (!keySnapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Invalid key' });
        }
        
        const keyData = keySnapshot.val();
        const now = new Date().getTime();
        
        // Check if key is valid
        if (keyData.isBanned) {
            return res.status(403).json({ success: false, message: 'Key is banned' });
        }
        
        if (!keyData.isActive) {
            return res.status(403).json({ success: false, message: 'Key is paused' });
        }
        
        // Check if the key is being used with the correct application
        const keyApplication = keyData.application || 'default';
        if (keyApplication !== appName) {
            return res.status(403).json({ 
                success: false, 
                message: `Login failed: This key is for ${keyApplication} application, not ${appName}` 
            });
        }
        
        // Check if application is active
        const appsRef = admin.database().ref('applications').child(appName);
        const appSnapshot = await appsRef.once('value');
        
        if (!appSnapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }
        
        if (!appSnapshot.val().isActive) {
            return res.status(403).json({ success: false, message: 'Application is currently disabled' });
        }
        
        // Check HWID binding
        if (keyData.hwid && keyData.hwid !== hwid) {
            return res.status(403).json({
                success: false,
                message: 'HWID mismatch. This key is bound to another device.'
            });
        }
        
        // Update key with HWID if not set and update last used time
        const updates = {
            lastUsed: now
        };
        
        if (!keyData.hwid) {
            updates.hwid = hwid;
        }
        
        // If key hasn't been activated yet, set activation time and calculate expiration
        let expiresAt = keyData.expiresAt;
        if (!keyData.activated) {
            // Calculate expiration based on the key type and current time
            const keyType = keyData.type;
            let duration;
            
            if (keyType === 'lifetime') {
                duration = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
            } else if (keyType === 'month') {
                duration = 30 * 24 * 60 * 60 * 1000; // 30 days
            } else if (keyType === 'week') {
                duration = 7 * 24 * 60 * 60 * 1000; // 7 days
            } else if (keyType === '3day') {
                duration = 3 * 24 * 60 * 60 * 1000; // 3 days
            } else if (keyType === 'day') {
                duration = 24 * 60 * 60 * 1000; // 1 day
            } else if (keyType === 'second') {
                duration = 1000; // 1 second (for testing)
            } else if (keyType.includes('days')) {
                // Extract number of days from custom duration (e.g., "5 days")
                const days = parseInt(keyType.split(' ')[0]);
                duration = days * 24 * 60 * 60 * 1000;
            } else {
                // Default to 1 day if type is unknown
                duration = 24 * 60 * 60 * 1000;
            }
            
            expiresAt = now + duration;
            updates.activated = true;
            updates.activatedAt = now;
            updates.expiresAt = expiresAt;
        } else {
            // If already activated, check if it's expired
            if (keyData.expiresAt < now) {
                // Delete the expired key
                await keysRef.remove();
                
                // Update key count for the application
                if (keyApplication) {
                    const appRef = admin.database().ref('applications').child(keyApplication);
                    const appData = (await appRef.once('value')).val();
                    if (appData) {
                        const keyCount = Math.max(0, (appData.keyCount || 0) - 1);
                        await appRef.update({ keyCount });
                    }
                }
                
                return res.status(403).json({ success: false, message: 'Key has expired and has been removed' });
            }
        }
        
        await keysRef.update(updates);
        
        // Return success with user info
        return res.json({
            success: true,
            message: 'Authentication successful',
            username: keyData.username || 'User',
            keyType: keyData.type,
            expiresAt: expiresAt
        });
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});
// Heartbeat endpoint to keep session alive and verify key is still valid
app.post('/heartbeat', async (req, res) => {
    try {
        const { key, hwid, appName = 'default' } = req.body;
        
        if (!key || !hwid) {
            return res.status(400).json({ success: false, message: 'Key and HWID are required' });
        }
        
        // Similar validation as auth endpoint
        const keysRef = admin.database().ref('keys').child(key);
        const keySnapshot = await keysRef.once('value');
        
        if (!keySnapshot.exists()) {
            return res.status(403).json({ success: false, message: 'Session invalid' });
        }
        
        const keyData = keySnapshot.val();
        
        if (keyData.isBanned || !keyData.isActive) {
            return res.status(403).json({ success: false, message: 'Session invalid' });
        }
        
        // Check if key has been activated
        if (!keyData.activated) {
            return res.status(403).json({ success: false, message: 'Key not activated' });
        }
        
        // Check if key has expired
        if (keyData.expiresAt < Date.now()) {
            // Delete the expired key
            await keysRef.remove();
            
            // Update key count for the application
            const keyApplication = keyData.application || 'default';
            if (keyApplication) {
                const appRef = admin.database().ref('applications').child(keyApplication);
                const appData = (await appRef.once('value')).val();
                if (appData) {
                    const keyCount = Math.max(0, (appData.keyCount || 0) - 1);
                    await appRef.update({ keyCount });
                }
            }
            
            return res.status(403).json({ success: false, message: 'Key has expired and has been removed' });
        }
        
        // Check if HWID matches
        if (keyData.hwid && keyData.hwid !== hwid) {
            return res.status(403).json({ success: false, message: 'HWID mismatch' });
        }
        
        // Check if the key is being used with the correct application
        const keyApplication = keyData.application || 'default';
        if (keyApplication !== appName) {
            return res.status(403).json({ 
                success: false, 
                message: `Session invalid: This key is for ${keyApplication} application, not ${appName}` 
            });
        }
        
        // Check if application is still active
        const appsRef = admin.database().ref('applications').child(appName);
        const appSnapshot = await appsRef.once('value');
        
        if (!appSnapshot.exists() || !appSnapshot.val().isActive) {
            return res.status(403).json({ success: false, message: 'Application disabled' });
        }
        
        // Update last used time
        await keysRef.update({ lastUsed: Date.now() });
        
        return res.json({ success: true });
    } catch (error) {
        console.error('Heartbeat error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Authentication server running on port ${PORT}`);
});

