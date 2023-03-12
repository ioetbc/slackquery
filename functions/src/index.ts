import * as functions from "firebase-functions";
import {Configuration, OpenAIApi} from "openai";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

import {WebClient} from "@slack/web-api";
import {PubSub} from "@google-cloud/pubsub";
import pg from "pg";

import {DBSchemaSQL} from "./utils/sql/schema";

const bot = new WebClient(process.env.SLACK_TOKEN);
const pubsubClient = new PubSub();
initializeApp();

const gifs = [
  "https://media.giphy.com/media/MZQkUm97KTI1gI8sUj/giphy.gif",
  "https://media.giphy.com/media/gEvab1ilmJjA82FaSV/giphy-downsized.gif",
  "https://media.giphy.com/media/lELRD773cY7Sg/giphy-downsized.gif",
  "https://media.giphy.com/media/lKXEBR8m1jWso/giphy.gif",
  "https://media.giphy.com/media/hv53DaYcXWe3nRbR1A/giphy.gif",
  "https://media.giphy.com/media/kaq6GnxDlJaBq/giphy.gif",
  "https://media.giphy.com/media/T4SwrRe4yVNvU0dGIY/giphy-downsized.gif",
  "https://media.giphy.com/media/89f0aOqDRKIeQQfOvx/giphy.gif",
];

export const config = functions.https.onRequest(
  async (request: any, response: any) => {
    console.log("request", request.body);
    bot.views.open({
      trigger_id: JSON.parse(request.body.payload).trigger_id,
      view: {
        type: "modal",
        submit: {
          type: "plain_text",
          text: "Save",
          emoji: true,
        },
        close: {
          type: "plain_text",
          text: "Cancel",
          emoji: true,
        },
        title: {
          type: "plain_text",
          text: "Configure",
          emoji: true,
        },
        blocks: [
          {
            type: "divider",
          },
          {
            type: "input",
            element: {
              type: "plain_text_input",
              action_id: "plain_text_input-action",
            },
            label: {
              type: "plain_text",
              text: "Postgres connection string",
              emoji: true,
            },
          },
          {
            type: "input",
            element: {
              type: "plain_text_input",
              action_id: "plain_text_input-action",
            },
            label: {
              type: "plain_text",
              text: "OpenAi Secret",
              emoji: true,
            },
          },
        ],
      },
    });

    return response.status(200);
  }
);

export const helloWorld = functions.https.onRequest(
  async (request: any, response: any) => {
    const topic = pubsubClient.topic("slack-query");

    console.log("request", request.body);

    topic.publishMessage({
      json: {
        text: request.body.text,
        channelId: request.body.channel_id,
        teamId: request.body.team_id,
      },
    });

    const gif = gifs[Math.floor(Math.random() * gifs.length)];

    return response.status(200).send({
      attachments: [
        {
          blocks: [
            {
              type: "image",
              image_url: gif,
              alt_text: "Loading response...",
            },
          ],
        },
      ],
    });
  }
);

export const slackChannelJoin = functions.pubsub
  .topic("slack-query")
  .onPublish(async (message, context) => {
    console.log("context", context);
    const firestore = getFirestore();
    const documentRef = firestore
      .collection("teams")
      .doc(message.json.teamId)
      .collection("channel")
      .doc(message.json.channelId);

    const doc = await documentRef.get();

    if (!doc.exists) {
      return bot.chat.postMessage({
        text: "No document found",
        channel: message.json.channelId,
      });
    }

    const client = new pg.Client(doc.data()?.CONNECTION_STRING);
    const config = new Configuration({apiKey: doc.data()?.OPEN_AI});
    const openai = new OpenAIApi(config);

    await client.connect();
    const db = await client.query(DBSchemaSQL);
    const schema = db.rows.map((row) => row["?column?"]);

    // Find the previous message??
    // Use the prevMessage as a prompt to the next message
    // You: give me all the users that understand Node.js
    // Bot: SELECT * FROM users WHERE skills LIKE '%Node.js%'

    // const createPrompt = (
    //   schema: string[],
    //   message: string,
    //   prevMessage: string
    // ) => {
    //   const schemaPrompt =
    //     "You are connected to a Postgres database with the following columns and tables";

    //   if (prevMessage) {
    //     return `### Postgres SQL tables, with their properties and types:${schema} ### You: ${message} ### You: ${prevMessage} ensure psql syntax is used wrap column, table names and membership operator in quotes ### SELECT`;
    //   }

    //   return `### Postgres SQL tables, with their properties and types:${schema} ### You: ${message} ensure psql syntax is used wrap column, table names and membership operator in quotes ### SELECT`;
    // };

    const sql = await openai
      .createCompletion({
        model: "code-davinci-002",
        prompt: `### Postgres SQL tables, with their properties and types:${schema} ### ${message.json.text} ensure psql syntax is used wrap column, table names and membership operator in quotes ### SELECT`,
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

    const data = await client.query(`SELECT ${sql}`);
    await client.end();

    if (data.rows.length === 0) {
      return bot.chat.postMessage({
        text: "No results found",
        channel: message.json.channelId,
      });
    }

    console.log("hmmmmmmmm", JSON.stringify(data.rows));

    return bot.files.upload({
      channels: message.json.channelId,
      title: message.json.text,
      content: JSON.stringify(data.rows),
      filename: "data.json",
    });
  });

// PROMPTS
// /sq-dev give me all the messages that were sent from 123
// /sq-dev find all the posts from mahmoud@prisma.io
// /sq-dev give me all the users that understand node

// BUGS
// 2. better way to wrap column and table names in quotes?

// TODO
// 1. Ability to add your connection string & GPT api key in slack using a form?
// 2. Loading state? post a GIF
