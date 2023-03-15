import * as functions from "firebase-functions";
import {getFirestore} from "firebase-admin/firestore";

import {encrypt} from "./utils/encryption";

export const save = functions.https.onRequest(
  async (request: functions.Request, response: functions.Response) => {
    const {view, user} = JSON.parse(request.body.payload);
    const state = Object.values(view.state.values) as any;

    const connectionString = encrypt(state[0]["plain_text_input-action"].value);
    const openAiSecret = encrypt(state[1]["plain_text_input-action"].value);
    const channel = state[2]["actionId-2"].selected_channel;

    const firestore = getFirestore();

    await firestore
      .collection("teams")
      .doc(user.team_id)
      .collection("channel")
      .doc(channel)
      .set({
        CONNECTION_STRING: connectionString.encryptedData,
        OPEN_AI: openAiSecret.encryptedData,
      });

    response.sendStatus(200);
  }
);
