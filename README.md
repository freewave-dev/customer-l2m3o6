# medicalans.com — Medical ANS

Marketing site for Medical ANS (Advanced Network Solutions). Static HTML + CSS, deployed via Cloudflare Pages.

## Structure
- `index.html` — homepage
- `about.html`, `solutions.html`, `industries.html`, `partners.html`, `case-studies.html`, `resources.html`, `compliance.html`, `careers.html`, `contact.html` — top-level pages
- `solutions/` — six solution detail pages
- `case-studies/` — three case study detail pages
- `privacy.html`, `terms.html`, `accessibility.html` — legal
- `styles.css` — design system + components
- `main.js` — nav toggle, active-link, contact-form stub
- `sitemap.xml`, `robots.txt`

## Customer placeholders to replace
- **Leadership bios** (`about.html`) — initials avatars and bios are placeholders for the real team
- **Logo strip** (`index.html`) — client names used are illustrative; replace with permitted client logos
- **Case studies** — anonymized engagements; identify and replace with real, permission-cleared metrics where possible
- **Office address / phone** (`contact.html`, `privacy.html`) — placeholder NY address and `+1 (888) 555-0199` phone
- **Compliance dates** (`compliance.html`) — SOC 2 attestation timing is illustrative
- **Email addresses** (`hello@`, `security@`, `careers@`, `privacy@`, `legal@`, `rfp@`, `accessibility@`) — confirm or alias to a real inbox

## Customer form wiring
The contact form on `contact.html` posts to `#` and shows a client-side success state. To wire to the central Freewave endpoint, update the `<form>` to:
```html
<form action="https://freewave.dev/customer-form.php?id={customer_id}" method="post">
```

## Local preview
```
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Deploys
Pushes to the `main` branch on GitHub auto-deploy via Cloudflare Pages. No build step.
