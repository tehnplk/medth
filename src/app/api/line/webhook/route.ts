import { WebhookEvent, messagingApi } from "@line/bot-sdk";
import { NextResponse } from "next/server";
import crypto from "crypto";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-line-signature") || "";
    const body = await req.text();

    // Verify Signature
    const hash = crypto
      .createHmac("sha256", config.channelSecret)
      .update(body)
      .digest("base64");

    if (hash !== signature) {
      console.error("Invalid LINE signature");
      return NextResponse.json({ status: "error", message: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const events: WebhookEvent[] = payload.events;

    // Process all events
    await Promise.all(
      events.map(async (event) => {
        if (event.type === "message" && event.message.type === "text") {
          const text = event.message.text;
          console.log(`Received message: ${text} from ${event.source.userId}`);

          // Reply with a confirmation
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
                type: "text",
                text: `ระบบได้รับข้อความ "${text}" เรียบร้อยแล้วค่ะ`,
              },
            ],
          });
        }
      })
    );

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("LINE Webhook Error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
