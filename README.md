# Hink QR — Code applicatif (atelier serverless)

Générateur de QR Codes : front React + API Lambda.
---

## Contenu du repo

```
hink-qr-workshop/
├── api/
│   ├── index.mjs          # Handler Lambda — génération QR Code
│   └── package.json
├── frontend/
│   ├── src/App.jsx        # Interface React
│   ├── vite.config.js
│   └── package.json
└── docs/
    └── PRESENTATION.md    # Support de cours (architecture, SAM, étapes)
```

## Ce qui n'est PAS dans ce repo

| Fichier | Pourquoi |
|---------|----------|
| `template.yaml` | Infrastructure AWS — à créer par vous |
| `samconfig.toml` | Config de déploiement — généré par `sam deploy --guided` |
| `dist/`, `.aws-sam/` | Artéfacts de build — générés localement |

---

## Prérequis

| Outil | Vérification |
|-------|--------------|
| Compte AWS | — |
| AWS CLI v2 | `aws --version` |
| AWS SAM CLI | `sam --version` |
| Node.js 20+ | `node --version` |

```powershell
aws login
aws sts get-caller-identity
```

---

## Développement local (optionnel)

**Terminal 1 — API :**

```powershell
sam build
sam local start-api
```

**Terminal 2 — Front :**

```powershell
cd frontend
npm install
"VITE_API_URL=http://127.0.0.1:3000" | Out-File .env.local -Encoding utf8
npm run dev
```

---

## API — référence

### `POST /qr`

```json
{ "text": "https://exemple.com", "color": "#000000", "bg": "#ffffff" }
```

Réponse : `{ "dataUrl": "data:image/png;base64,...", "text": "...", "chars": 23 }`

### `GET /health`

Réponse : `{ "status": "ok" }`

---

## Ressources
- [AWS SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/)
