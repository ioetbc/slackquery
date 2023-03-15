import * as functions from "firebase-functions";
import {WebClient} from "@slack/web-api";

const bot = new WebClient(process.env.SLACK_TOKEN);

export const home = functions.https.onRequest(
  async (request: functions.Request, response: functions.Response) => {
    const {user} = request.body.event;

    const blocks = [
      {
        type: "input",
        element: {
          type: "plain_text_input",
          action_id: "plain_text_input-action",
        },
        label: {
          type: "plain_text",
          text: "Add your database connection string",
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
          text: "Add your OpenAi Secret",
          emoji: true,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "channels_select",
            placeholder: {
              type: "plain_text",
              text: "Select a channel",
              emoji: true,
            },
            initial_channel: "C12345678",
            action_id: "actionId-2",
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Save",
              emoji: true,
            },
            value: "save",
            action_id: "actionId-0",
          },
        ],
      },
    ];

    await bot.views.publish({
      user_id: user,
      view: {
        type: "home",
        callback_id: "home_view",
        blocks,
      },
    });

    response.sendStatus(200);
  }
);
