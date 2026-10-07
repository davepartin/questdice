# QuestDice online, in plain words

This is for the person who owns the game. If "Play on your own phone" stops working, start here.

## The setup

QuestDice online lives in its **own** Firebase project, **`questdice-eef50`** (console:
https://console.firebase.google.com/project/questdice-eef50). It is **not** in Fleet Dice's `space-tribes` project, on purpose: a
Firebase project has only one set of security rules, and deploying QuestDice's rules there would break Fleet Dice.

There is no server to run. Every phone signs in as an anonymous guest (no email, no password). A room is one
document in Firestore: `qdRooms/ABCD`, holding the whole party table. When someone taps a button, their phone runs
the game's own rules (`js/table.js`) inside a transaction and writes the new table back. Everyone else's phone sees
the change within a moment.

The free (Spark) plan is enough: no Cloud Functions are used. Firestore's free allowance is 50,000 reads and 20,000
writes a day, far more than a few game nights need.

## One-time setup (done in the Firebase console)

Done on 7 October 2026 (with Claude in Chrome). Kept here in case it ever has to be redone.

1. Create the project (it became `questdice-eef50`; Google Analytics was left on, which is harmless).
2. **Authentication → Sign-in method → Anonymous → Enable.**
3. **Authentication → Settings → Authorised domains:** add `davepartin.github.io` (keep `localhost`).
4. **Firestore Database → Create database**, production mode, any nearby location.
   (Scheduled backups need the paid Blaze plan; skip them. The project stays on the free Spark plan.)
5. **Firestore Database → Rules:** replace everything with the contents of `firestore.rules` from this repo, then **Publish**.
6. **Project settings → General → Your apps → Web app** (the `</>` button), nickname `QuestDice web`, no hosting. Copy the
   `firebaseConfig` it shows (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) into `js/firebase-config.js`.
   Those values are public identifiers, not secrets; the rules are what protect the data.

## If joining suddenly breaks for everyone

Check, in order: Anonymous sign-in is still on; `davepartin.github.io` is still an authorised domain; the Rules tab
shows the `qdRooms` block from `firestore.rules`; Firestore → Usage is not at the daily limit.

## Updating the rules later

Either paste `firestore.rules` into the console's Rules tab and Publish, or from the game folder:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project questdice-eef50
```

## How the game finds the cloud

`js/net.js` asks the page's own server for `/api/ping`. Only `node server.mjs` answers it, so a laptop table still works
on a Wi-Fi with no internet. Everywhere else (GitHub Pages) the game uses Firebase through `js/cloud.js`. A friend can
join with the code or with the invite link (`…/?join=CODE`) the host shares from the lobby.

Rooms are never deleted on their own. Each is small (tens of kilobytes); the free plan holds 1 GB. If they ever pile
up, delete old documents in Firestore → `qdRooms` (each has an `updated` time).
