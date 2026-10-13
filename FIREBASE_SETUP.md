# Firebase setup (optional shared product photos)

Used when `window.firebaseReady` becomes `true`.

1. Create a Firebase project.
2. Add a Web app and copy its config into `firebase-config.js`.
3. Enable **Firestore Database** and **Storage**.
4. (Test mode) Security rules examples:

Firestore rules (test):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Storage rules (test):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

When config is filled in, uploaded photos are stored in Firebase Storage and product metadata in Firestore, updating all visitors in realtime. If config is not filled, the site keeps using local browser storage as before.
