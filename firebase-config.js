// firebase-config.js — shared by every game that needs live host-to-player sync
// (Word Wolf: word-wolf.html, Kangaroo Court: kangaroo-court.html, and any
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
// "roster" is a separate, openly-readable path per room used only by Word
// Wolf's voting feature — it holds nothing but each player's number and name
// (which the host already shows on the shared screen anyway), so it's safe to
// leave broadly readable/writable. It never contains secret words, votes, or
// who is the Wolf — only the "players" leaf above holds that, and it stays
// locked to the exact token.
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
//       }
//     }
//   }

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDojGHsk2N6EssSWrmEbfeN3abZ7lQt9wY",
  authDomain: "livechat-92f66.firebaseapp.com",
  databaseURL: "https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "livechat-92f66",
};
