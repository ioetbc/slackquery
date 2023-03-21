import * as functions from "firebase-functions";
import {PubSub} from "@google-cloud/pubsub";

import {THINKING_GIFS} from "./utils/gifs";

const pubsubClient = new PubSub();

export const shit = functions.https.onRequest(
  async (
    request: functions.Request,
    response: functions.Response
  ): Promise<void> => {
    const topic = pubsubClient.topic("slack-query");

    topic.publishMessage({
      json: {
        text: request.body.text,
        channelId: request.body.channel_id,
        channelName: request.body.channel_name,
        teamId: request.body.team_id,
      },
    });

    response.status(200).send({
      attachments: [
        {
          blocks: [
            {
              type: "image",
              image_url:
                THINKING_GIFS[Math.floor(Math.random() * THINKING_GIFS.length)],
              alt_text: "Loading response...",
            },
          ],
        },
      ],
    });
  }
);
