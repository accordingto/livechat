// firebase-config.js — shared by every game that needs live host-to-player sync
// (Say It Without Saying It, Kangaroo Court: kangaroo-court.html, and any
// future one, all sending to the single shared player page play.html). Fill
// in YOUR Firebase project's values below so those pages can sync through the
// same Realtime Database (host deals -> player's page updates live).
//
// Setup (~5 minutes, free, no credit card needed):
//   1. https://console.firebase.google.com -> Add project (any name).
//   2. Left menu -> Build -> Realtime Database -> Create Database
//      -> pick any region -> start in "test mode" (or paste the rules below).
//   3. Project settings (gear icon, top left) -> General tab -> "Your apps"
//      -> Add app -> Web (</>) -> register it (no hosting needed)
//      -> copy the config values it shows you into FIREBASE_CONFIG below.
//
// Required Realtime Database rules (Database -> Rules tab) — grants read/write
// ONLY on the exact per-player token path, not on the room or players list.
// This matters: each player's link contains a long random token (not a
// guessable number), and these rules make sure knowing the token for your OWN
// link never lets you read anyone else's node or list who else is in the room.
// All games share one "rooms" key so the SAME room code and SAME player links
// keep working no matter which game the host switches to.
//
// "roster" is a separate, openly-readable path per room. Nothing writes or
// reads it any more — it existed only for Word Wolf's vote buttons, and that
// game has been removed — but the rule below is left in place so an older tab
// still open somewhere doesn't start failing writes mid-session. It only ever
// held each player's number and name (which the host shows on the shared screen
// anyway); secret words and answers live under "players", locked to the exact
// token, and always did.
//   {
//     "rules": {
//       "rooms": {
//         "$roomCode": {
//           "players": {
//             "$token": {
//               ".read": true,
//               ".write": true
//             }
//           },
//           "roster": {
//             ".read": true,
//             ".write": true
//           }
//         }
//       },
//       "chatWolfRooms": {
//         ".read": false,
//         ".write": false
//       }
//     }
//   }
// Chat Wolf is different from the legacy card games: only its trusted Vercel
// API uses Firebase Admin to access chatWolfRooms. Never grant browser access
// to that path and never put the service-account JSON in this public file.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDojGHsk2N6EssSWrmEbfeN3abZ7lQt9wY",
  authDomain: "livechat-92f66.firebaseapp.com",
  databaseURL: "https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "livechat-92f66",
};
