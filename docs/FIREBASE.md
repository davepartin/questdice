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

Solo heroes also live in Firestore: `qdHeroes/{id}` is the save (gold, gear, campaign and all),
`qdHeroNames/{id}` marks that a display name is taken, and `qdHeroPublic/{id}` is a browsable card
(name, class, level, act/step only). The hero document id is a SHA-256 of the name plus the
password, so a phone that does not know the password cannot find or overwrite the save. The public
card is listable so a player can pick a name they have forgotten; it never holds the hash, salt or
hero blob. **These rules are in `firestore.rules` in the repo; they are not published until someone
pastes them into the Firebase console (or runs the deploy command below).** Until then, cloud saves
will fail with a permission error and the name list will be empty.

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
shows the `qdRooms`, `qdHeroNames`, `qdHeroPublic` and `qdHeroes` blocks from `firestore.rules`; Firestore → Usage is not at the daily limit.

## Updating the rules later

**Pending (19 Oct 2026): taking a seat back on a new phone.** `firestore.rules` now lets a phone that is not seated add one
seat to a room after the lobby too (so a hero can take back their seat after opening their cloud save with the password),
and allows up to 12 seat ids (old phones' ids stay in the list). Until these rules are published, everything else works,
but "Join a table → Cloud save" on a game that has already started is refused with "That table will not let this phone in."

Either paste `firestore.rules` into the console's Rules tab and Publish, or from the game folder:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project questdice-eef50
```

## How the game finds the cloud

`js/net.js` asks the page's own server for `/api/ping`. Only `node server.mjs` answers it, so a laptop table still works
on a Wi-Fi with no internet. Everywhere else (GitHub Pages) the game uses Firebase through `js/cloud.js`. A friend can
join with the code or with the invite link (`…/?join=CODE`) the host shares from the lobby.

Rooms are never deleted on their own. Each is small (tens of kilobytes); the free plan holds 1 GB. If they ever pile
up, delete old documents in Firestore → `qdRooms` (each has an `updated` time). Hero saves are similarly sticky: a
name marker cannot be deleted by the rules, so a retired name stays taken.

## Solo hero saves, honestly

This is not an account system. There is no email, no password reset, and no rate limiting (Spark has no Cloud
Functions). The phone hashes the password (SHA-256 with a salt) and never sends the password to Firestore. The
document id is another SHA-256 of name + password, which is a capability: anyone who can guess that id can read
the save. New saves need a password of at least 3 characters; short passwords are still weak against a
guessed-name brute force. HTTPS hides the id in transit. Listing `qdHeroes` is forbidden, so an attacker cannot
browse other people's saves. `qdHeroPublic` *is* listable, on purpose, and is allowed to hold only name, class,
level and act/step. Spark cannot bind that public write to the password, so a signed-in nuisance could change
the listed class or level of a name; they still cannot read or overwrite the save. A write to an existing save
must also carry the same stored salt and hash. Two people cannot take the same hero name; the first to create
the name marker keeps it.

## The daily challenge's leaderboard (Oct 2026)
The daily challenge writes each phone's best score of the day to `qdDaily/{YYYY-MM-DD}/scores/{guest id}` and reads the day's top ten.
It needs the `qdDaily` block in `firestore.rules`: publish the rules again (paste `firestore.rules` into Firestore → Rules → Publish,
or `npx -y firebase-tools@latest deploy --only firestore:rules --project questdice-eef50`). Until then the day still plays and is
scored on the phone; the page says the leaderboard is not open yet. Firestore makes the single-field index for `orderBy('score')`
by itself. Scores are counted on the phone, so a determined cheat could post a fake one; fine for family and friends.
