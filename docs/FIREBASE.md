# QuestDice online, in plain words

This is for the person who owns the game. If "Play on your own phone" stops working, start here.

## The setup

QuestDice online lives in its **own** Firebase project (planned name `questdice`; Firebase may add a few letters
to make it unique, like `questdice-4f2a1`). It is **not** in Fleet Dice's `space-tribes` project, on purpose: a
Firebase project has only one set of security rules, and deploying QuestDice's rules there would break Fleet Dice.

There is no server to run. Every phone signs in as an anonymous guest (no email, no password). A room is one
document in Firestore: `qdRooms/ABCD`, holding the whole party table. When someone taps a button, their phone runs
the game's own rules (`js/table.js`) inside a transaction and writes the new table back. Everyone else's phone sees
the change within a moment.

The free (Spark) plan is enough: no Cloud Functions are used. Firestore's free allowance is 50,000 reads and 20,000
writes a day, far more than a few game nights need.

## One-time setup (done in the Firebase console)

1. Create the project `questdice` (Google Analytics: off is fine).
2. **Authentication → Sign-in method → Anonymous → Enable.**
3. **Authentication → Settings → Authorised domains:** add `davepartin.github.io` (keep `localhost`).
4. **Firestore Database → Create database**, production mode, any nearby location.
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
npx -y firebase-tools@latest deploy --only firestore:rules --project questdice
```

(Use the real project ID if Firebase added letters to it.)
