'use strict';

const admin = require('firebase-admin');

let database = null;

function serviceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  return parsed;
}

function getDatabase() {
  if (database) return database;
  const databaseURL = process.env.FIREBASE_DATABASE_URL
    || 'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app';
  if (!admin.apps.length) {
    const serviceAccount = serviceAccountFromEnv();
    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL });
    } else if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'livechat-local', databaseURL });
    } else {
      const error = new Error('CHAT_WOLF_BACKEND_NOT_CONFIGURED');
      error.code = 'CHAT_WOLF_BACKEND_NOT_CONFIGURED';
      throw error;
    }
  }
  database = admin.database();
  return database;
}

function roomRef(code) {
  return getDatabase().ref(`chatWolfRooms/${code}`);
}

module.exports = { getDatabase, roomRef };
