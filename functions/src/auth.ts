import * as functions from "firebase-functions";
import {getFirestore} from "firebase-admin/firestore";

import * as admin from "firebase-admin";

import qs from "querystring";
import axios from "axios";

// admin.initializeApp();

export const auth = functions.https.onRequest(
  async (request: functions.Request, response: functions.Response) => {
    const {code} = request.query;
    console.log("code", code);

    if (!code) {
      response.sendStatus(400).send("Bad Request: Missing code parameter");
      return;
    }

    try {
      const access = await axios.post(
        "https://slack.com/api/oauth.v2.access",
        qs.stringify({
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          code: code as string,
        })
      );

      const {data} = access;

      console.log("data", data);

      if (data) {
        const firestore = getFirestore();

        console.log("teamId", data.team.id);
        console.log("ACCESS_TOKEN", data.access_token);
        console.log("REFRESH_TOKEN", data.refresh_token);

        await firestore.collection("teams").doc(data.team.id).set({
          ACCESS_TOKEN: data.access_token,
          REFRESH_TOKEN: data.refresh_token,
        });

        response.status(200).send("Tokens stored successfully");
      } else {
        console.error("Slack OAuth error:", data.error);
        response.status(400).send(`Slack OAuth error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      response.status(500).send("Error exchanging code for tokens");
    }
  }
);
