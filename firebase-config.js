// firebase-config.js — shared by emotion.html and emotion-card.html.
// Fill in YOUR Firebase project's values below so the two pages can sync
// through the same Realtime Database (host deals -> player's page updates live).
//
// Setup (~5 minutes, free, no credit card needed):
//   1. https://console.firebase.google.com -> Add project (any name).
//   2. Left menu -> Build -> Realtime Database -> Create Database
//      -> pick any region -> start in "test mode" (or paste the rules below).
//   3. Project settings (gear icon, top left) -> General tab -> "Your apps"
//      -> Add app -> Web (</>) -> register it (no hosting needed)
//      -> copy the config values it shows you into FIREBASE_CONFIG below.
//
// Suggested Realtime Database rules (Database -> Rules tab) — scopes
// read/write to only the /sessions path, no login required:
//   {
//     "rules": {
//       "sessions": {
//         "$sessionId": {
//           ".read": true,
//           ".write": true
//         }
//       }
//     }
//   }

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDojGHsk2N6EssSWrmEbfeN3abZ7lQt9wY",
  authDomain: "livechat-92f66.firebaseapp.com",
  databaseURL: "https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "livechat-92f66",
};
