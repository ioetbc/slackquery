import admin from "firebase-admin";

import {save} from "./save";
import {home} from "./home";
import {shit} from "./app";
import {logic} from "./logic";
import {auth} from "./auth";

admin.initializeApp();

// Get the Firebase project ID
// const projectId = process.env.FIREBASE_PROJECT;
// const projectId = "slackquery-7c2e0";

// Create a custom Firestore instance that includes the security rules
admin.firestore();

export {auth, home, save, shit, logic};
