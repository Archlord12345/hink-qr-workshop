import QRCode from "qrcode";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

const json = (status, body) => ({
  statusCode: status,
  headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method ?? "GET";
  const path = event?.rawPath ?? "/";

  if (method === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  if (path === "/health") return json(200, { status: "ok" });

  if (path === "/qr" && method === "POST") {
    let body;
    try {
      const raw = event?.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf-8")
        : event?.body ?? "{}";
      body = JSON.parse(raw);
    } catch {
      return json(400, { error: "Corps JSON invalide." });
    }

    const text = (body.text ?? "").trim();
    if (!text) return json(400, { error: "Le champ 'text' est requis." });
    if (text.length > 2048) return json(400, { error: "Texte trop long (max 2 048 caractères)." });

    const color = /^#[0-9a-f]{6}$/i.test(body.color ?? "") ? body.color : "#000000";
    const bg    = /^#[0-9a-f]{6}$/i.test(body.bg    ?? "") ? body.bg    : "#ffffff";
    const size  = Math.min(800, Math.max(128, Number(body.size) || 512));

    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: { dark: color, light: bg },
      errorCorrectionLevel: "M",
    });

    return json(200, { dataUrl, text, chars: text.length });
  }

  return json(404, { error: "Route inconnue." });
};
