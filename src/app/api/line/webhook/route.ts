import { messagingApi } from "@line/bot-sdk";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { formatThaiDateShort } from "@/lib/thai-date";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

function getStatusColor(status: string) {
  switch (status) {
    case "pending": return "#FFC107";
    case "confirmed": return "#28A745";
    case "completed": return "#007BFF";
    default: return "#666666";
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "pending": return "รอยืนยัน";
    case "confirmed": return "ยืนยันแล้ว";
    case "completed": return "เสร็จสิ้น";
    default: return status;
  }
}

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
    const events: any[] = payload.events;

    // Process all events
    await Promise.all(
      events.map(async (event) => {
        if (event.type === "message" && event.message.type === "text") {
          const text = event.message.text.trim();
          const lineId = event.source?.userId || "";
          console.log(`Received message: ${text} from ${lineId}`);

          if (text === "จองคิว") {
            const bookingUrl = `https://medthscphpl.online/booking?line_id=${encodeURIComponent(lineId)}`;

            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [
                {
                  type: "flex",
                  altText: "กรุณากดที่ปุ่มด้านล่างเพื่อจองคิว",
                  contents: {
                    type: "bubble",
                    body: {
                      type: "box",
                      layout: "vertical",
                      spacing: "md",
                      contents: [
                        {
                          type: "text",
                          text: "กรุณากดที่ปุ่มด้านล่าง",
                          wrap: true,
                          size: "md",
                        },
                      ],
                    },
                    footer: {
                      type: "box",
                      layout: "vertical",
                      spacing: "sm",
                      contents: [
                        {
                          type: "button",
                          style: "primary",
                          action: {
                            type: "uri",
                            label: "ปุ่มกดจองคิว",
                            uri: bookingUrl,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            });

            return;
          }

          if (text === "ประวัติการจอง") {
            const searchUrl = "https://medthscphpl.online/booking/search-booking";

            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [
                {
                  type: "flex",
                  altText: "เลือกวิธีค้นหาประวัติการจอง",
                  contents: {
                    type: "bubble",
                    body: {
                      type: "box",
                      layout: "vertical",
                      spacing: "md",
                      contents: [
                        {
                          type: "text",
                          text: "ประวัติการจอง",
                          weight: "bold",
                          size: "lg",
                          color: "#1B4F72",
                        },
                        {
                          type: "text",
                          text: "เลือกวิธีดูประวัติการจองของคุณ",
                          size: "sm",
                          color: "#666666",
                          wrap: true,
                        },
                      ],
                    },
                    footer: {
                      type: "box",
                      layout: "vertical",
                      spacing: "sm",
                      contents: [
                        {
                          type: "button",
                          style: "primary",
                          action: {
                            type: "message",
                            label: "รายการจองผ่านไลน์",
                            text: "รายการจองผ่านไลน์",
                          },
                        },
                        {
                          type: "button",
                          style: "secondary",
                          action: {
                            type: "uri",
                            label: "ค้นด้วยเบอร์โทร",
                            uri: searchUrl,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            });

            return;
          }

          if (text === "รายการจองผ่านไลน์") {
            if (!lineId) {
              await client.replyMessage({
                replyToken: event.replyToken,
                messages: [{ type: "text", text: "ไม่พบข้อมูล LINE ID ของคุณค่ะ" }],
              });
              return;
            }

            const bookings = await query<any[]>(
              `SELECT
                b.booking_code,
                b.customer_name,
                b.booking_date,
                b.booking_status,
                br.name AS branch_name,
                s.full_name AS staff_name,
                ts.begin_time,
                ts.end_time
              FROM bookings b
              JOIN branches br ON b.branch_id = br.id
              JOIN staff s ON b.staff_id = s.id
              JOIN time_slots ts ON b.time_slot_id = ts.id
              WHERE b.line_id = ? AND b.is_deleted = 0
              ORDER BY b.booking_date DESC, ts.begin_time DESC
              LIMIT 10`,
              [lineId]
            );

            if (bookings.length === 0) {
              await client.replyMessage({
                replyToken: event.replyToken,
                messages: [{ type: "text", text: "คุณยังไม่มีประวัติการจองค่ะ" }],
              });
              return;
            }

            const flexMessages: any = {
              type: "carousel",
              contents: bookings.map((b) => ({
                type: "bubble",
                size: "mega",
                header: {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#EBF5FB",
                  contents: [
                    {
                      type: "text",
                      text: `รหัสการจอง: ${b.booking_code}`,
                      weight: "bold",
                      size: "sm",
                      color: "#1B4F72",
                    },
                  ],
                },
                body: {
                  type: "box",
                  layout: "vertical",
                  spacing: "md",
                  contents: [
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "ผู้จอง", color: "#aaaaaa", size: "sm", flex: 2 },
                        { type: "text", text: b.customer_name || "-", size: "sm", color: "#333333", flex: 5, wrap: true, weight: "bold" },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "วันที่", color: "#aaaaaa", size: "sm", flex: 2 },
                        { type: "text", text: formatThaiDateShort(b.booking_date), size: "sm", color: "#666666", flex: 5, wrap: true },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "เวลา", color: "#aaaaaa", size: "sm", flex: 2 },
                        { type: "text", text: `${b.begin_time.slice(0, 5)} - ${b.end_time.slice(0, 5)} น.`, size: "sm", color: "#666666", flex: 5 },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "สาขา", color: "#aaaaaa", size: "sm", flex: 2 },
                        { type: "text", text: b.branch_name, size: "sm", color: "#666666", flex: 5 },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "พนักงาน", color: "#aaaaaa", size: "sm", flex: 2 },
                        { type: "text", text: b.staff_name, size: "sm", color: "#666666", flex: 5 },
                      ],
                    },
                    {
                      type: "separator",
                      margin: "md",
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      margin: "md",
                      contents: [
                        { type: "text", text: "สถานะ", color: "#aaaaaa", size: "sm", flex: 2 },
                        {
                          type: "text",
                          text: getStatusText(b.booking_status),
                          size: "sm",
                          color: getStatusColor(b.booking_status),
                          flex: 5,
                          weight: "bold",
                        },
                      ],
                    },
                  ],
                },
              })),
            };

            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [
                {
                  type: "flex",
                  altText: "ประวัติการจองของคุณ",
                  contents: flexMessages,
                },
              ],
            });

            return;
          }

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
