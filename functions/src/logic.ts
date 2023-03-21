import * as functions from "firebase-functions";
import {getFirestore} from "firebase-admin/firestore";
import {WebClient} from "@slack/web-api";
import {Configuration, OpenAIApi} from "openai";
import pg from "pg";

import {decrypt} from "./utils/encryption";
import {DB_SQL} from "./utils/sql/schema";
import {ERROR_GIF} from "./utils/gifs";
import {getAccessToken} from "./utils/get-access-token";
import {verifyAccessToken} from "./utils/verify-access-token";

const bot = new WebClient(process.env.SLACK_TOKEN);

export const logic = functions.pubsub
  .topic("slack-query")
  .onPublish(async (message) => {
    const accessToken = await getAccessToken(message.json.teamId);
    console.log("accessToken", accessToken);
    const teamId = await verifyAccessToken(accessToken);
    console.log("teamId", teamId);

    const firestore = getFirestore();
    const documentRef = firestore
      .collection("teams")
      .doc(teamId)
      .collection("channel")
      .doc(message.json.channelId);

    const doc = await documentRef.get();

    if (!doc.exists) {
      return bot.chat.postMessage({
        text: "No document found",
        channel: message.json.channelId,
      });
    }

    // const CONNECTION_STRING = decrypt(doc.data()?.CONNECTION_STRING);
    // const OPEN_AI_SECRET = decrypt(doc.data()?.OPEN_AI_SECRET);
    const CONNECTION_STRING = doc.data()?.CONNECTION_STRING;
    const OPEN_AI_SECRET = doc.data()?.OPEN_AI_SECRET;

    console.log("CONNECTION_STRING", CONNECTION_STRING);

    const client = new pg.Client(CONNECTION_STRING);
    const config = new Configuration({apiKey: OPEN_AI_SECRET});
    const openai = new OpenAIApi(config);

    await client.connect();
    const db = await client.query(DB_SQL);
    const schema = db.rows.map((row) => row["table_schema"]);

    const sql = await openai
      .createCompletion({
        model: "code-davinci-002",
        prompt: `### Postgres SQL tables, with their properties and types:${schema} ### ${message.json.text} wrap all values & membership operators in double quotes ### SELECT`,
        temperature: 0,
        max_tokens: 1000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: ["#", ";"],
      })
      .then((response) => {
        return response.data.choices[0].text;
      })
      .catch(async (error: Error) => {
        console.log("err calling openAI :(", error.message);
        await client.end();
        throw error;
      });

    console.log("sql", `SELECT ${sql}`);

    const data = await client.query(`SELECT ${sql}`).catch(async () => {
      await client.end();
      return bot.chat.postMessage({
        text: ERROR_GIF,
        channel: message.json.channelId,
        unfurl_links: true,
        unfurl_media: true,
      });
    });

    await client.end();

    if (Array.isArray(data?.rows) && data?.rows?.length === 0) {
      return bot.chat.postMessage({
        text: "No results found",
        channel: message.json.channelId,
      });
    }

    await bot.files.upload({
      channels: message.json.channelId,
      title: message.json.text,
      content: JSON.stringify(data.rows),
      filename: "data.json",
    });

    return bot.chat.postMessage({
      channel: message.json.channelId,
      text: "`SELECT" + sql + "`",
    });
  });
