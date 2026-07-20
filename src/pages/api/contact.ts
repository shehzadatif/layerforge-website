import type { APIRoute } from "astro";
import { Resend } from "resend";

import { isSameOriginRequest } from "../../lib/isSameOriginRequest";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const prerender = false;

const CONTACT_PATH = "/contact";
const SUCCESS_PATH = "/contact-success";

function redirectTo(request: Request, path: string, error?: string): Response {
  const url = new URL(path, request.url);

  if (error) {
    url.searchParams.set("error", error);
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: `${url.pathname}${url.search}`,
    },
  });
}

function textValue(
  formData: FormData,
  key: string,
  maxLength: number,
  required = true,
): string {
  const value = String(formData.get(key) ?? "").trim();

  if (required && !value) {
    throw new Error(`Missing ${key}.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${key} is too long.`);
  }

  return value;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

async function verifyTurnstile(
  request: Request,
  token: string,
): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY?.trim();

  /*
   * Turnstile is optional in development. In production, configure both
   * Turnstile variables to require a verified challenge for every message.
   */
  if (!secret) {
    return true;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  const remoteIp = request.headers.get("CF-Connecting-IP")?.trim();

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as {
      success?: boolean;
    };

    return result.success === true;
  } catch (error) {
    console.error("Unable to verify Turnstile contact challenge.", {
      error,
    });

    return false;
  }
}

async function getContactRecipient(): Promise<string> {
  const configuredRecipient = import.meta.env.CONTACT_TO_EMAIL?.trim();

  if (configuredRecipient) {
    return configuredRecipient;
  }

  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("setting_value")
    .eq("setting_key", "support_email")
    .maybeSingle();

  if (error) {
    console.warn("Unable to load the support email setting.", {
      error,
    });
  }

  return (
    String(data?.setting_value ?? "").trim() || "support@layerforgecanada.com"
  );
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const formData = await request.formData();

    /* Silently accept honeypot submissions without sending email. */
    if (String(formData.get("website") ?? "").trim()) {
      return redirectTo(request, SUCCESS_PATH);
    }

    const name = textValue(formData, "name", 120);
    const email = textValue(formData, "email", 254).toLowerCase();
    const phone = textValue(formData, "phone", 40, false);
    const subject = textValue(formData, "subject", 160);
    const message = textValue(formData, "message", 5000);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return redirectTo(request, CONTACT_PATH, "invalid");
    }

    const turnstileToken = String(
      formData.get("cf-turnstile-response") ?? "",
    ).trim();

    if (!(await verifyTurnstile(request, turnstileToken))) {
      return redirectTo(request, CONTACT_PATH, "verification");
    }

    const apiKey = import.meta.env.RESEND_API_KEY?.trim();
    const fromEmail =
      import.meta.env.CONTACT_FROM_EMAIL?.trim() ||
      import.meta.env.FROM_EMAIL?.trim();

    if (!apiKey || !fromEmail) {
      console.error("Contact email settings are incomplete.", {
        apiKeyConfigured: Boolean(apiKey),
        fromEmailConfigured: Boolean(fromEmail),
      });

      return redirectTo(request, CONTACT_PATH, "unavailable");
    }

    const recipient = await getContactRecipient();
    const resend = new Resend(apiKey);
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

    const emailSubject = subject.replace(/[\r\n]+/g, " ");
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: recipient,
      replyTo: email,
      subject: `Website inquiry: ${emailSubject}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;">
          <h1>New Layer Forge website inquiry</h1>
          <table style="border-collapse:collapse;margin:24px 0;">
            <tr>
              <td style="padding:7px 24px 7px 0;font-weight:bold;">Name</td>
              <td>${safeName}</td>
            </tr>
            <tr>
              <td style="padding:7px 24px 7px 0;font-weight:bold;">Email</td>
              <td>${safeEmail}</td>
            </tr>
            <tr>
              <td style="padding:7px 24px 7px 0;font-weight:bold;">Phone</td>
              <td>${safePhone || "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding:7px 24px 7px 0;font-weight:bold;">Subject</td>
              <td>${safeSubject}</td>
            </tr>
          </table>
          <h2>Message</h2>
          <p style="line-height:1.7;">${safeMessage}</p>
        </div>
      `,
    });

    if (emailError) {
      throw new Error(
        `Resend rejected the contact email: ${emailError.message}`,
      );
    }

    return redirectTo(request, SUCCESS_PATH);
  } catch (error) {
    console.error("Unable to process contact form.", {
      error,
    });

    return redirectTo(request, CONTACT_PATH, "invalid");
  }
};
