# Déployez vos applications web sur des fonctions serverless AWS

**Atelier technique — Hink QR**  
Générateur de QR Codes · React + Lambda + S3 + CloudFront

---

## Slide 1 — Titre

# Serverless AWS
## Déployez vos applications web sur des fonctions serverless

- Application : **Hink QR**
- Stack : React · Lambda · API Gateway · S3 · CloudFront
- Outil : **AWS SAM** (Infrastructure as Code)

---

## Slide 2 — Qu'est-ce que le serverless ?

**Serverless ≠ sans serveur**

Les serveurs existent. **AWS les gère pour vous.**

| Principe | Description |
|----------|-------------|
| Pas de gestion de serveur | Pas de VM à provisionner, patcher ou scaler |
| Paiement à l'usage | Facturation à la milliseconde d'exécution |
| Scaling automatique | 1 requête ou 10 000 — AWS s'adapte seul |

---

## Slide 3 — Classique vs Serverless

```
Architecture classique (EC2)          Architecture serverless (Lambda)
────────────────────────────          ─────────────────────────────────
Serveur allumé 24h/24                 Fonction invoquée à la demande
Scaling manuel                        Scaling automatique
Coût fixe même à l'arrêt              Coût proportionnel au trafic
Vous gérez l'OS et le runtime          AWS gère le runtime
```

**Cas d'usage idéal :** trafic variable, fonctions courtes, stateless, prototypage rapide.

---

## Slide 4 — L'application Hink QR

Application web de génération de QR Codes :

- URL, texte libre, e-mail, réseau Wi-Fi
- Personnalisation des couleurs
- Téléchargement PNG
- Historique de session

**Découpage :**

| Partie | Technologie | Hébergement AWS |
|--------|-------------|-----------------|
| Frontend | React + Vite | S3 + CloudFront |
| Backend | Node.js + `qrcode` | Lambda + API Gateway |

---

## Slide 5 — Architecture globale

```
┌─────────────┐
│ Navigateur  │
└──────┬──────┘
       │
       ├─ HTTPS ──────────► CloudFront ──► S3 (fichiers React)
       │
       └─ POST /qr ───────► API Gateway ──► Lambda (Node.js)
                                                  │
                                                  └── PNG base64
```

**5 services AWS · 0 serveur géré par nous**

---

## Slide 6 — Rôle de chaque service

| Service | Rôle | Pourquoi serverless |
|---------|------|---------------------|
| **Lambda** | Génère le QR Code en PNG | Exécution à la demande, stateless |
| **API Gateway** | Expose `POST /qr` et `GET /health` | Point d'entrée HTTP sans serveur |
| **S3** | Stocke le front React compilé | Stockage objet, pas de serveur web |
| **CloudFront** | CDN global + HTTPS | Cache edge, certificat TLS inclus |
| **CloudFormation** | Crée toutes les ressources | Infrastructure as Code via SAM |

---

## Slide 7 — Le code fourni (repo GitHub)

Le dépôt contient **uniquement le code applicatif** :

```
hink-qr-workshop/
├── api/
│   ├── index.mjs       ← Handler Lambda
│   └── package.json
└── frontend/
    ├── src/App.jsx     ← Interface React
    └── ...
```

**Ce qui n'est PAS dans le repo (volontairement) :**

- `template.yaml` — infrastructure AWS
- `samconfig.toml` — config de déploiement
- `dist/`, `.aws-sam/`, `node_modules/`

→ **Vous créerez l'infrastructure vous-même pendant l'atelier.**

---

## Slide 8 — Le backend Lambda

Fichier `api/index.mjs` — handler unique :

```javascript
export const handler = async (event) => {
  const method = event?.requestContext?.http?.method;
  const path   = event?.rawPath;

  if (path === "/health") return json(200, { status: "ok" });

  if (path === "/qr" && method === "POST") {
    const body = JSON.parse(event.body);
    const dataUrl = await QRCode.toDataURL(body.text, {
      width: 512,
      color: { dark: body.color, light: body.bg },
    });
    return json(200, { dataUrl, text: body.text });
  }
};
```

| Route | Méthode | Réponse |
|-------|---------|---------|
| `/health` | GET | `{ "status": "ok" }` |
| `/qr` | POST | `{ "dataUrl": "data:image/png;base64,..." }` |

---

## Slide 9 — Le frontend React

Fichier `frontend/src/App.jsx` — appelle l'API via une variable d'environnement :

```javascript
const API = import.meta.env.VITE_API_URL;

const res = await fetch(`${API}/qr`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ text, color, bg }),
});
```

**Point clé :** `VITE_API_URL` est injectée **au build** (`npm run build`), pas au runtime.

Le front est servi en statique depuis S3 — il n'y a pas de serveur pour lire des variables d'env à l'exécution.

---

## Slide 10 — AWS SAM : qu'est-ce que c'est ?

**SAM** = **S**erverless **A**pplication **M**odel

Extension de CloudFormation avec des raccourcis pour le serverless.

```
Votre template.yaml (abstractions SAM)
            │
            ▼  sam build
Template CloudFormation complet + ZIP Lambda
            │
            ▼  sam deploy
Stack CloudFormation → ressources AWS créées
```

| Commande | Action |
|----------|--------|
| `sam build` | Compile le code, zippe la Lambda |
| `sam deploy` | Provisionne l'infra sur AWS |
| `sam local start-api` | Émule API Gateway + Lambda en local |
| `sam delete` | Supprime toute la stack |

---

## Slide 11 — Le fichier `template.yaml` (à créer)

Fichier à créer à la racine du projet. Structure :

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31    # ← Active SAM

Globals:
  Function:
    Timeout: 15
    MemorySize: 256
    Runtime: nodejs24.x

Resources:
  # ... ressources ici ...

Outputs:
  SiteURL: ...
  ApiUrl: ...
  BucketName: ...
  DistributionId: ...
```

**2 lignes essentielles :**
- `AWSTemplateFormatVersion` → dialecte CloudFormation
- `Transform: AWS::Serverless-2016-10-31` → SAM transforme les abstractions

---

## Slide 12 — Ressource Lambda dans le template

```yaml
ApiFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: api/                    # Dossier zippé par sam build
    Handler: index.handler           # Export dans index.mjs
    Architectures:
      - arm64                        # Graviton : ~20 % moins cher
    Events:
      ApiEvent:
        Type: HttpApi
        Properties:
          ApiId: !Ref WebApi
```

**Ce que SAM fait automatiquement avec `Events` :**
1. Crée la permission Lambda pour API Gateway
2. Crée l'intégration API GW → Lambda
3. Configure le routage HTTP

Sans SAM : **3 ressources CloudFormation** à écrire à la main.

---

## Slide 13 — API Gateway HTTP API

```yaml
WebApi:
  Type: AWS::Serverless::HttpApi
  Properties:
    CorsConfiguration:
      AllowOrigins: ["*"]
      AllowMethods: [GET, POST, OPTIONS]
      AllowHeaders: ["*"]
```

**HTTP API** (v2) vs REST API (v1) :
- Plus léger, moins cher
- Suffisant pour notre cas (2 routes)
- CORS configuré en 4 lignes

---

## Slide 14 — S3 + CloudFront (hébergement front)

```yaml
SiteBucket:
  Type: AWS::S3::Bucket
  Properties:
    PublicAccessBlockConfiguration:    # Bucket PRIVÉ
      BlockPublicAcls: true
      RestrictPublicBuckets: true
    VersioningConfiguration:
      Status: Enabled

SiteDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      DefaultRootObject: index.html
      Origins:
        - DomainName: !GetAtt SiteBucket.RegionalDomainName
          OriginAccessControlId: !GetAtt SiteOAC.Id
      CustomErrorResponses:            # SPA React
        - ErrorCode: 404
          ResponseCode: 200
          ResponsePagePath: /index.html
```

**Sécurité :** le bucket S3 n'est jamais public. Seul CloudFront y accède via **OAC** (Origin Access Control).

---

## Slide 15 — Fonctions intrinsèques CloudFormation

| Syntaxe | Rôle | Exemple |
|---------|------|---------|
| `!Ref Ressource` | Référence l'ID d'une ressource | `!Ref SiteBucket` |
| `!GetAtt Ressource.Attribut` | Lit un attribut | `!GetAtt SiteBucket.RegionalDomainName` |
| `!Sub "texte ${Var}"` | Substitution de variables | `!Sub "https://${WebApi}.execute-api..."` |

Ces fonctions **lient les ressources entre elles** sans connaître leurs valeurs à l'avance.

CloudFormation calcule l'ordre de création via un graphe de dépendances.

---

## Slide 16 — Les Outputs (après déploiement)

```yaml
Outputs:
  SiteURL:
    Value: !Sub "https://${SiteDistribution.DomainName}"
  ApiUrl:
    Value: !Sub "https://${WebApi}.execute-api.${AWS::Region}.${AWS::URLSuffix}"
  BucketName:
    Value: !Ref SiteBucket
  DistributionId:
    Value: !Ref SiteDistribution
```

Ces 4 valeurs sont **indispensables** pour les étapes suivantes :

| Output | Utilisation |
|--------|-------------|
| `ApiUrl` | `VITE_API_URL` au build du front |
| `BucketName` | `aws s3 sync dist/ s3://...` |
| `DistributionId` | Invalidation cache CloudFront |
| `SiteURL` | URL publique du site |

---

## Slide 17 — Cycle de vie d'une requête

```
1. Utilisateur clique "Générer"
         │
2. fetch("POST /qr", { text, color, bg })
         │
3. API Gateway formate un event JSON
         │
4. Lambda démarre (cold start ou warm)
         │
5. QRCode.toDataURL() → PNG base64
         │
6. Réponse { dataUrl, text, chars }
         │
7. React affiche <img src={dataUrl} />
```

**Cold start :** 200–800 ms au premier appel. Négligeable pour cette app.

---

## Slide 18 — Pipeline de déploiement complet

```
Étape 1 — Créer template.yaml (vous)
Étape 2 — sam build
Étape 3 — sam deploy --guided     →  Outputs (ApiUrl, BucketName…)
Étape 4 — Tester l'API seule
Étape 5 — npm run build           →  dist/ (avec VITE_API_URL)
Étape 6 — aws s3 sync dist/       →  publier le front
Étape 7 — invalidation CloudFront
Étape 8 — Ouvrir SiteURL
```

**Pourquoi le front APRÈS l'infra ?**  
L'`ApiUrl` n'existe qu'une fois la stack déployée.

---

## Slide 19 — Démo : `sam build`

```powershell
sam build
```

**Ce qui se passe :**
- Lit `template.yaml`
- Installe les dépendances de `api/`
- Zippe le code → `.aws-sam/build/ApiFunction/`
- Transforme le template SAM → CloudFormation

---

## Slide 20 — Démo : `sam deploy --guided`

```powershell
sam deploy --guided
```

| Question | Réponse recommandée |
|----------|---------------------|
| Stack Name | `hink-qr-<votre-nom>` |
| AWS Region | `eu-west-1` |
| Confirm changes | `Y` |
| Allow IAM role creation | `Y` |
| Save to samconfig.toml | `Y` |

CloudFormation crée **11 ressources** en ~5 minutes.

---

## Slide 21 — Démo : tester l'API

```powershell
Invoke-RestMethod -Uri "https://<ApiUrl>/health"

Invoke-RestMethod -Method Post -Uri "https://<ApiUrl>/qr" `
  -ContentType "application/json" `
  -Body '{"text":"https://aws.amazon.com"}'
```

La Lambda répond avec un `dataUrl` — image PNG en base64.  
L'API serverless fonctionne **avant** le déploiement du front.

---

## Slide 22 — Démo : publier le frontend

```powershell
cd frontend
npm install
$env:VITE_API_URL = "https://<ApiUrl>"
npm run build

aws s3 sync dist/ s3://<BucketName>/ --delete

aws cloudfront create-invalidation `
  --distribution-id <DistributionId> `
  --paths "/*"
```

Propagation CloudFront : **2–5 minutes**.

---

## Slide 23 — Démo live application

1. Ouvrir `SiteURL`
2. Entrer `https://aws.amazon.com`
3. Générer le QR Code
4. Changer les couleurs
5. Télécharger le PNG
6. Scanner avec un téléphone

---

## Slide 24 — Console AWS (aperçu)

| Service | Ce qu'on observe |
|---------|------------------|
| **Lambda** | Invocations, durée, logs CloudWatch |
| **API Gateway** | Routes, latence |
| **S3** | Fichiers `dist/` uploadés |
| **CloudFront** | Hits, cache |
| **CloudFormation** | Stack, ressources, Outputs |

---

## Slide 25 — Sécurité de l'architecture

- Bucket S3 **privé** (pas d'accès public)
- CloudFront force **HTTPS**
- **OAC** : seul CloudFront lit S3
- Chiffrement **AES-256** au repos
- Politique **DenyNonHTTPS** sur les buckets
- **CORS** configuré sur l'API

---

## Slide 26 — Coûts estimés

| Service | Coût (faible trafic) |
|---------|----------------------|
| Lambda | Free tier : 1M req/mois |
| API Gateway | Free tier : 1M req/mois |
| S3 | ~0,01 $/Go |
| CloudFront | Free tier : 1 To/mois |
| **Total atelier** | **< 1 $/mois** |

---

## Slide 27 — Votre exercice

Le repo GitHub contient le **code applicatif uniquement**.

**À faire de votre côté :**

1. Cloner le repo
2. **Créer** `template.yaml` (structure vue dans cette présentation)
3. `sam build` + `sam deploy --guided`
4. Builder et publier le front
5. Tester l'application
6. `sam delete` pour nettoyer

---

## Slide 28 — Pour aller plus loin

- Nom de domaine custom (Route 53 + ACM)
- Historique persistant (DynamoDB)
- Authentification (Cognito)
- CI/CD (GitHub Actions)
- Monitoring (X-Ray, CloudWatch Alarms)

---

## Slide 29 — Récapitulatif

| Message | Détail |
|---------|--------|
| Serverless | Pas de serveur à gérer, paiement à l'usage |
| SAM | Infrastructure as Code simplifiée |
| Découplage | S3/CloudFront (statique) + Lambda (calcul) |
| Reproductible | `sam build` + `sam deploy` = même résultat |
| Nettoyage | `sam delete` détruit tout proprement |

---

## Slide 30 — Questions ?

**Ressources :**
- [AWS SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Lambda Node.js](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- Repo atelier : `hink-qr-workshop`