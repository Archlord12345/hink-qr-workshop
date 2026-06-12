import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "";

const TYPES = [
  { id: "url",   label: "URL" },
  { id: "text",  label: "Texte" },
  { id: "email", label: "E-mail" },
  { id: "wifi",  label: "Wi-Fi" },
];

function buildText(type, f) {
  switch (type) {
    case "url":   return f.url ?? "";
    case "text":  return f.text ?? "";
    case "email": {
      const qs = f.emailSubject ? `?subject=${encodeURIComponent(f.emailSubject)}` : "";
      return f.emailTo ? `mailto:${f.emailTo}${qs}` : "";
    }
    case "wifi":
      return f.wifiSsid
        ? `WIFI:T:${f.wifiSec || "WPA"};S:${f.wifiSsid};P:${f.wifiPass ?? ""};;`
        : "";
    default: return "";
  }
}

const EMPTY = { url: "", text: "", emailTo: "", emailSubject: "", wifiSsid: "", wifiPass: "", wifiSec: "WPA" };

export default function App() {
  const [type,    setType]    = useState("url");
  const [fields,  setFields]  = useState(EMPTY);
  const [color,   setColor]   = useState("#000000");
  const [bg,      setBg]      = useState("#ffffff");
  const [qr,      setQr]      = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [copied,  setCopied]  = useState(false);
  const [history, setHistory] = useState([]);

  const text = buildText(type, fields);
  const f = (key, val) => setFields(prev => ({ ...prev, [key]: val }));

  async function generate() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/qr`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, color, bg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setQr(data);
      setHistory(prev => [data, ...prev.filter(h => h.text !== data.text)].slice(0, 8));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!qr) return;
    const a = Object.assign(document.createElement("a"), { href: qr.dataUrl, download: "hink-qr.png" });
    a.click();
  }

  async function copyText() {
    if (!qr) return;
    await navigator.clipboard.writeText(qr.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="app">
      <nav>
        <div className="nav-inner">
          <div className="logo">
            Hink <span className="logo-badge">QR</span>
          </div>
        </div>
      </nav>

      <main>
        <div className="headline">
          <h1>Générez vos QR Codes<br />en quelques secondes</h1>
          <p>URL, texte, e-mail, Wi-Fi — choisissez vos couleurs et téléchargez.</p>
        </div>

        <div className="workspace">
          {/* ── Left: form ── */}
          <section className="card form-card">
            <div className="tabs">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  className={`tab${type === t.id ? " active" : ""}`}
                  onClick={() => setType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="fields">
              {type === "url" && (
                <label className="field">
                  <span>URL</span>
                  <input
                    type="url"
                    placeholder="https://exemple.com"
                    value={fields.url}
                    onChange={e => f("url", e.target.value)}
                    onKeyDown={e => e.key === "Enter" && generate()}
                  />
                </label>
              )}

              {type === "text" && (
                <label className="field">
                  <span>Texte libre</span>
                  <textarea
                    placeholder="Entrez votre texte…"
                    rows={4}
                    value={fields.text}
                    onChange={e => f("text", e.target.value)}
                  />
                </label>
              )}

              {type === "email" && (
                <>
                  <label className="field">
                    <span>Adresse e-mail</span>
                    <input
                      type="email"
                      placeholder="contact@exemple.com"
                      value={fields.emailTo}
                      onChange={e => f("emailTo", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Sujet <em>(optionnel)</em></span>
                    <input
                      type="text"
                      placeholder="Bonjour !"
                      value={fields.emailSubject}
                      onChange={e => f("emailSubject", e.target.value)}
                    />
                  </label>
                </>
              )}

              {type === "wifi" && (
                <>
                  <label className="field">
                    <span>Nom du réseau (SSID)</span>
                    <input
                      type="text"
                      placeholder="MonWiFi"
                      value={fields.wifiSsid}
                      onChange={e => f("wifiSsid", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Mot de passe</span>
                    <input
                      type="text"
                      placeholder="motdepasse"
                      value={fields.wifiPass}
                      onChange={e => f("wifiPass", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Sécurité</span>
                    <select value={fields.wifiSec} onChange={e => f("wifiSec", e.target.value)}>
                      <option value="WPA">WPA / WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="">Aucune</option>
                    </select>
                  </label>
                </>
              )}
            </div>

            <div className="appearance">
              <span className="appear-label">Couleurs</span>
              <div className="color-row">
                <label className="swatch-label">
                  <span>QR Code</span>
                  <div className="swatch" style={{ background: color }}>
                    <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                  </div>
                </label>
                <label className="swatch-label">
                  <span>Fond</span>
                  <div className="swatch swatch-bordered" style={{ background: bg }}>
                    <input type="color" value={bg} onChange={e => setBg(e.target.value)} />
                  </div>
                </label>
              </div>
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button
              className="btn-generate"
              onClick={generate}
              disabled={loading || !text.trim()}
            >
              {loading ? <span className="spinner" /> : "Générer →"}
            </button>
          </section>

          {/* ── Right: preview ── */}
          <section className="card preview-card">
            {qr ? (
              <div className="qr-result">
                <div className="qr-frame" style={{ background: qr.dataUrl ? bg : "#fff" }}>
                  <img src={qr.dataUrl} alt="QR Code" className="qr-img" />
                </div>
                <p className="qr-source">
                  {qr.text.length > 64 ? qr.text.slice(0, 62) + "…" : qr.text}
                </p>
                <div className="action-row">
                  <button className="btn-dl" onClick={download}>↓ Télécharger</button>
                  <button className="btn-copy" onClick={copyText}>
                    {copied ? "✓ Copié !" : "Copier le texte"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="qr-empty">
                <QrIcon />
                <p>Votre QR Code<br />apparaîtra ici</p>
              </div>
            )}
          </section>
        </div>

        {history.length > 1 && (
          <div className="history">
            <h2>Récents</h2>
            <div className="history-list">
              {history.slice(1).map((h, i) => (
                <button key={i} className="history-item" onClick={() => setQr(h)} title={h.text}>
                  <img src={h.dataUrl} alt="QR" />
                  <span>{h.text.length > 22 ? h.text.slice(0, 20) + "…" : h.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer>
        Hink QR · Propulsé par AWS Lambda + CloudFront
      </footer>
    </div>
  );
}

function QrIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="qr-icon">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2.5" />
      <rect x="8" y="8" width="8" height="8" fill="currentColor" />
      <rect x="28" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2.5" />
      <rect x="32" y="8" width="8" height="8" fill="currentColor" />
      <rect x="4" y="28" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2.5" />
      <rect x="8" y="32" width="8" height="8" fill="currentColor" />
      <line x1="28" y1="28" x2="28" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="36" x2="44" y2="36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="44" y1="28" x2="44" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="28" x2="36" y2="28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="36" y1="44" x2="36" y2="44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
