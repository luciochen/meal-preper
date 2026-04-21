import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = (body.message as string | undefined)?.trim();
  const contactEmail = (body.contactEmail as string | undefined)?.trim();

  if (!message || message.length < 1) {
    return NextResponse.json({ error: "Message too short" }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: "Tangie Feedback <feedback@tangie.app>",
    to: "luciochen.design@gmail.com",
    replyTo: contactEmail || undefined,
    subject: "Tangie feedback",
    text: [
      message,
      contactEmail ? `\nReply to: ${contactEmail}` : "",
    ].join("\n"),
  });

  if (error) {
    console.error("[feedback]", JSON.stringify(error));
    return NextResponse.json({ error: "Failed to send", detail: error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
