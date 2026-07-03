import { isPrivateOrLocalOrigin, isVercelDeploymentOrigin, normalizeOrigin } from '@/lib/safe-origin'

type EmailButton = {
  label: string
  href: string
}

type EmailCard = {
  title: string
  html: string
}

type EmailOptions = {
  to: string
  subject: string
  title: string
  preview: string
  intro?: string
  cards?: EmailCard[]
  button?: EmailButton
  footer?: string
  text: string
}

type OrderLine = {
  label: string
  quantity: number
  total?: string
}

const DEFAULT_FROM = 'Hanut <noreply@hanut.tn>'
// hanut.tn redirige (308) vers www.hanut.tn au niveau du domaine — un <img>
// dans un email ne suit pas cette redirection de façon fiable, d'où un logo
// qui ne s'affichait dans aucun email tant que ce host pointait sur l'apex.
const DEFAULT_PUBLIC_ASSET_URL = 'https://www.hanut.tn'

export function getAppUrl() {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
  if (configured && !isPrivateOrLocalOrigin(configured) && !isVercelDeploymentOrigin(configured)) {
    return configured
  }
  return DEFAULT_PUBLIC_ASSET_URL
}

function getEmailAssetUrl() {
  const explicitAssetUrl = normalizeOrigin(
    process.env.NEXT_PUBLIC_EMAIL_ASSET_URL ?? process.env.HANUT_EMAIL_ASSET_URL,
  )
  if (explicitAssetUrl && !isVercelDeploymentOrigin(explicitAssetUrl)) return explicitAssetUrl

  const appUrl = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
  if (appUrl && !isPrivateOrLocalOrigin(appUrl) && !isVercelDeploymentOrigin(appUrl)) return appUrl

  return DEFAULT_PUBLIC_ASSET_URL
}

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => {
    switch (char) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
      default: return char
    }
  })
}

function paragraph(text: string) {
  return `<p style="margin:0 0 16px;color:#57534E;font-size:15px;line-height:1.6">${escapeEmailHtml(text)}</p>`
}

function renderEmail(options: EmailOptions) {
  const appUrl = getAppUrl()
  const logoUrl = `${getEmailAssetUrl()}/icon-512.png`
  const cards = options.cards?.map(card => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
      <tr>
        <td style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:14px;padding:20px">
          <p style="margin:0 0 8px;color:#78716C;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">
            ${escapeEmailHtml(card.title)}
          </p>
          ${card.html}
        </td>
      </tr>
    </table>
  `).join('') ?? ''

  const button = options.button ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0">
      <tr>
        <td align="center">
          <a href="${escapeEmailHtml(options.button.href)}"
             style="display:inline-block;background:#16A34A;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px">
            ${escapeEmailHtml(options.button.label)}
          </a>
        </td>
      </tr>
    </table>
  ` : ''

  return `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>${escapeEmailHtml(options.subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:#F5F5F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          ${escapeEmailHtml(options.preview)}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F4;padding:32px 14px">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E7E5E4;border-radius:18px;overflow:hidden">
                <tr>
                  <td style="background:#0B5E46;padding:28px 28px;text-align:center">
                    <img src="${logoUrl}" alt="Hanut" width="54" height="54" style="display:block;margin:0 auto 14px;border-radius:13px;background:#ffffff;padding:4px">
                    <p style="margin:0;color:#DCFCE7;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Hanut</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px 28px">
                    <h1 style="margin:0 0 14px;color:#1C1917;font-size:24px;line-height:1.25;font-weight:800">
                      ${escapeEmailHtml(options.title)}
                    </h1>
                    ${options.intro ? paragraph(options.intro) : ''}
                    ${cards}
                    ${button}
                    <p style="margin:24px 0 0;color:#78716C;font-size:13px;line-height:1.6">
                      ${options.footer
                        ? options.footer
                        : `Besoin d'aide ? Contactez Hanut depuis <a href="${appUrl}/contact" style="color:#16A34A;text-decoration:underline">la page contact</a>.`}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="max-width:560px;margin:16px auto 0;color:#A8A29E;font-size:12px;line-height:1.5;text-align:center">
                Vous recevez cet email parce qu'une action a ete demandee sur Hanut.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export class EmailDeliveryError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'EmailDeliveryError'
    this.status = status
  }
}

export async function sendHanutEmail(options: EmailOptions): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM
  const html = renderEmail(options)

  if (!resendApiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new EmailDeliveryError('RESEND_API_KEY is missing in production')
    }
    console.log(`[EMAIL DEV] ${options.subject} -> ${options.to}\n${options.text}`)
    return
  }

  let lastError: unknown = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from,
          to: options.to,
          subject: options.subject,
          html,
          text: options.text,
        }),
        signal: AbortSignal.timeout(10_000),
      })

      if (response.ok) return
      const body = await response.text().catch(() => '')
      lastError = new EmailDeliveryError(
        `Resend HTTP ${response.status}: ${body.slice(0, 240)}`,
        response.status,
      )
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new EmailDeliveryError('Email delivery failed')
}

export function sendSignupConfirmationEmail(opts: {
  to: string
  name?: string | null
  confirmationUrl: string
}) {
  const name = opts.name?.trim()
  return sendHanutEmail({
    to: opts.to,
    subject: 'Confirmez votre compte Hanut',
    title: name ? `Bienvenue ${name}` : 'Bienvenue sur Hanut',
    preview: 'Confirmez votre adresse email pour activer votre essai Pro Hanut.',
    intro: 'Confirmez votre adresse email pour activer votre compte et demarrer votre essai Pro gratuit de 14 jours.',
    cards: [{
      title: 'Essai Pro',
      html: '<p style="margin:0;color:#166534;font-size:15px;line-height:1.6">Toutes les fonctionnalites Pro sont disponibles pendant 14 jours, sans carte bancaire.</p>',
    }],
    button: { label: 'Confirmer mon email', href: opts.confirmationUrl },
    text: `Confirmez votre compte Hanut : ${opts.confirmationUrl}`,
  })
}

export function sendPasswordResetEmail(opts: { to: string; resetUrl: string }) {
  return sendHanutEmail({
    to: opts.to,
    subject: 'Reinitialiser votre mot de passe Hanut',
    title: 'Reinitialisation du mot de passe',
    preview: 'Utilisez ce lien pour definir un nouveau mot de passe Hanut.',
    intro: 'Vous avez demande la reinitialisation de votre mot de passe. Le lien ci-dessous vous permet de choisir un nouveau mot de passe.',
    cards: [{
      title: 'Securite',
      html: '<p style="margin:0;color:#57534E;font-size:15px;line-height:1.6">Si vous n\'etes pas a l\'origine de cette demande, ignorez simplement cet email.</p>',
    }],
    button: { label: 'Choisir un nouveau mot de passe', href: opts.resetUrl },
    text: `Reinitialisez votre mot de passe Hanut : ${opts.resetUrl}`,
  })
}

export function sendTeamInvitationEmail(opts: {
  to: string
  invitationUrl: string
  inviterEmail?: string | null
  roleLabel: string
}) {
  const inviter = opts.inviterEmail ? escapeEmailHtml(opts.inviterEmail) : 'Un administrateur'
  return sendHanutEmail({
    to: opts.to,
    subject: 'Invitation a rejoindre une equipe Hanut',
    title: 'Vous etes invite sur Hanut',
    preview: 'Activez votre acces equipe Hanut.',
    intro: 'Vous avez ete invite a rejoindre une equipe Hanut. Creez votre mot de passe pour acceder au tableau de bord.',
    cards: [{
      title: 'Invitation',
      html: `
        <p style="margin:0 0 6px;color:#1C1917;font-size:15px;line-height:1.6"><strong>Invite par :</strong> ${inviter}</p>
        <p style="margin:0;color:#1C1917;font-size:15px;line-height:1.6"><strong>Role :</strong> ${escapeEmailHtml(opts.roleLabel)}</p>
      `,
    }, {
      title: 'Expiration',
      html: '<p style="margin:0;color:#57534E;font-size:15px;line-height:1.6">Cette invitation expire dans 7 jours.</p>',
    }],
    button: { label: "Accepter l'invitation", href: opts.invitationUrl },
    text: `Vous etes invite sur Hanut comme ${opts.roleLabel}. Acceptez l'invitation : ${opts.invitationUrl}`,
  })
}

export function sendEmailChangeCurrentEmail(opts: {
  to: string
  newEmail: string
  confirmationUrl: string
}) {
  return sendHanutEmail({
    to: opts.to,
    subject: "Confirmez le changement d'email Hanut",
    title: 'Confirmez depuis votre email actuel',
    preview: 'Une demande de changement d’adresse email a ete faite sur votre compte Hanut.',
    intro: `Vous avez demande a remplacer cette adresse par ${opts.newEmail}. Confirmez depuis votre email actuel pour continuer.`,
    cards: [{
      title: 'Securite',
      html: '<p style="margin:0;color:#57534E;font-size:15px;line-height:1.6">Si vous n\'etes pas a l\'origine de cette demande, ignorez cet email et contactez le support.</p>',
    }],
    button: { label: 'Confirmer le changement', href: opts.confirmationUrl },
    text: `Confirmez le changement d'email Hanut vers ${opts.newEmail} : ${opts.confirmationUrl}`,
  })
}

export function sendEmailChangeNewEmail(opts: {
  to: string
  confirmationUrl: string
}) {
  return sendHanutEmail({
    to: opts.to,
    subject: 'Confirmez votre nouvelle adresse Hanut',
    title: 'Confirmez votre nouvelle adresse',
    preview: 'Confirmez cette adresse pour terminer le changement d’email Hanut.',
    intro: 'Cette adresse a ete choisie comme nouvelle adresse de connexion Hanut. Confirmez-la pour terminer le changement.',
    cards: [{
      title: 'Important',
      html: '<p style="margin:0;color:#57534E;font-size:15px;line-height:1.6">Le changement sera finalise uniquement apres validation des deux emails requis par la securite Hanut.</p>',
    }],
    button: { label: 'Confirmer cette adresse', href: opts.confirmationUrl },
    text: `Confirmez votre nouvelle adresse Hanut : ${opts.confirmationUrl}`,
  })
}

export function sendWelcomeEmail(opts: {
  to: string
  name?: string | null
  dashboardUrl?: string
}) {
  const appUrl = getAppUrl()
  const name = opts.name?.trim()
  return sendHanutEmail({
    to: opts.to,
    subject: 'Bienvenue sur Hanut',
    title: name ? `Votre compte est actif, ${name}` : 'Votre compte Hanut est actif',
    preview: 'Votre espace Hanut est pret.',
    intro: 'Bienvenue dans Hanut. Votre tableau de bord est pret pour gerer vos commandes, votre stock, vos clients et vos livraisons.',
    cards: [{
      title: 'Essai Pro',
      html: '<p style="margin:0;color:#166534;font-size:15px;line-height:1.6">Votre essai Pro gratuit de 14 jours est actif. Vous pouvez tester les fonctionnalites avancees sans carte bancaire.</p>',
    }],
    button: { label: 'Acceder au tableau de bord', href: opts.dashboardUrl ?? `${appUrl}/dashboard` },
    text: `Bienvenue sur Hanut. Accedez a votre tableau de bord : ${opts.dashboardUrl ?? `${appUrl}/dashboard`}`,
  })
}

export function sendOrderOtpEmail(opts: {
  to: string
  code: string
  sellerName: string
}) {
  const safeCode = escapeEmailHtml(opts.code)
  return sendHanutEmail({
    to: opts.to,
    subject: 'Votre code de verification Hanut',
    title: 'Verification de commande',
    preview: 'Votre code de verification Hanut expire dans 5 minutes.',
    intro: `Votre code pour confirmer votre commande chez ${opts.sellerName} :`,
    cards: [{
      title: 'Code de verification',
      html: `
        <p style="margin:0;text-align:center;color:#0B5E46;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:38px;font-weight:900;letter-spacing:12px">
          ${safeCode}
        </p>
        <p style="margin:12px 0 0;text-align:center;color:#78716C;font-size:13px">Expire dans 5 minutes.</p>
      `,
    }],
    footer: "Si vous n'avez pas initie cette commande, ignorez cet email.",
    text: `Votre code de verification Hanut est ${opts.code}. Il expire dans 5 minutes.`,
  })
}

export function sendSellerNewOrderEmail(opts: {
  to: string
  orderUrl: string
  customerName: string
  customerPhone: string
  lines: OrderLine[]
}) {
  const linesHtml = opts.lines.length > 0
    ? `<ul style="margin:0;padding-left:18px;color:#1C1917;font-size:15px;line-height:1.7">${
        opts.lines.map(line => {
          const total = line.total ? ` - <strong>${escapeEmailHtml(line.total)}</strong>` : ''
          return `<li>${escapeEmailHtml(line.label)} x ${line.quantity}${total}</li>`
        }).join('')
      }</ul>`
    : '<p style="margin:0;color:#78716C;font-size:15px">Ouvrez la commande pour voir le detail.</p>'

  return sendHanutEmail({
    to: opts.to,
    subject: `Nouvelle commande Hanut - ${opts.customerName}`,
    title: 'Nouvelle commande recue',
    preview: `Nouvelle commande de ${opts.customerName}.`,
    intro: 'Une commande vient d’etre passee sur votre boutique Hanut.',
    cards: [{
      title: 'Client',
      html: `
        <p style="margin:0 0 4px;color:#1C1917;font-size:16px;font-weight:700">${escapeEmailHtml(opts.customerName)}</p>
        <p style="margin:0;color:#78716C;font-size:15px">${escapeEmailHtml(opts.customerPhone)}</p>
      `,
    }, {
      title: 'Article(s)',
      html: linesHtml,
    }],
    button: { label: 'Voir la commande', href: opts.orderUrl },
    text: `Nouvelle commande Hanut de ${opts.customerName} (${opts.customerPhone}). Voir : ${opts.orderUrl}`,
  })
}
