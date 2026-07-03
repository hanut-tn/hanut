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
  const logoUrl = `${getEmailAssetUrl()}/logo-email-header.png`
  const cards = options.cards?.map(card => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
      <tr>
        <td style="background:#FAFAF9;border:1px solid #E7E5E4;border-left:3px solid #16A34A;border-radius:12px;padding:18px 20px">
          <p style="margin:0 0 8px;color:#15803D;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">
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
             style="display:inline-block;background:#16A34A;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 32px;border-radius:12px;box-shadow:0 2px 6px rgba(22,163,74,.28)">
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
      <body style="margin:0;padding:0;background:#F0FDF4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          ${escapeEmailHtml(options.preview)}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;padding:40px 14px">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(11,94,70,.10)">
                <tr>
                  <td style="background:#0B5E46;padding:34px 28px;text-align:center">
                    <img src="${logoUrl}" alt="Hanut" width="140" height="45" style="display:block;margin:0 auto">
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 28px 30px">
                    <h1 style="margin:0 0 14px;color:#1C1917;font-size:23px;line-height:1.3;font-weight:800;letter-spacing:-.01em">
                      ${escapeEmailHtml(options.title)}
                    </h1>
                    ${options.intro ? paragraph(options.intro) : ''}
                    ${cards}
                    ${button}
                    <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #F5F5F4;color:#78716C;font-size:13px;line-height:1.6">
                      ${options.footer
                        ? options.footer
                        : `Besoin d'aide ? Contactez Hanut depuis <a href="${appUrl}/contact" style="color:#16A34A;text-decoration:underline">la page contact</a>.`}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="max-width:560px;margin:20px auto 0;color:#78716C;font-size:12px;line-height:1.5;text-align:center">
                Vous recevez cet email parce qu'une action a été demandée sur Hanut.
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
    intro: 'Confirmez votre adresse email pour activer votre compte et démarrer votre essai Pro gratuit de 14 jours.',
    cards: [{
      title: 'Essai Pro',
      html: '<p style="margin:0;color:#166534;font-size:15px;line-height:1.6">Toutes les fonctionnalités Pro sont disponibles pendant 14 jours, sans carte bancaire.</p>',
    }],
    button: { label: 'Confirmer mon email', href: opts.confirmationUrl },
    text: `Confirmez votre compte Hanut : ${opts.confirmationUrl}`,
  })
}

export function sendPasswordResetEmail(opts: { to: string; resetUrl: string }) {
  return sendHanutEmail({
    to: opts.to,
    subject: 'Réinitialiser votre mot de passe Hanut',
    title: 'Réinitialisation du mot de passe',
    preview: 'Utilisez ce lien pour définir un nouveau mot de passe Hanut.',
    intro: 'Vous avez demandé la réinitialisation de votre mot de passe. Le lien ci-dessous vous permet de choisir un nouveau mot de passe.',
    cards: [{
      title: 'Sécurité',
      html: '<p style="margin:0;color:#57534E;font-size:15px;line-height:1.6">Si vous n\'êtes pas à l\'origine de cette demande, ignorez simplement cet email.</p>',
    }],
    button: { label: 'Choisir un nouveau mot de passe', href: opts.resetUrl },
    text: `Réinitialisez votre mot de passe Hanut : ${opts.resetUrl}`,
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
    subject: 'Invitation à rejoindre une équipe Hanut',
    title: 'Vous êtes invité sur Hanut',
    preview: 'Activez votre accès équipe Hanut.',
    intro: 'Vous avez été invité à rejoindre une équipe Hanut. Créez votre mot de passe pour accéder au tableau de bord.',
    cards: [{
      title: 'Invitation',
      html: `
        <p style="margin:0 0 6px;color:#1C1917;font-size:15px;line-height:1.6"><strong>Invité par :</strong> ${inviter}</p>
        <p style="margin:0;color:#1C1917;font-size:15px;line-height:1.6"><strong>Rôle :</strong> ${escapeEmailHtml(opts.roleLabel)}</p>
      `,
    }, {
      title: 'Expiration',
      html: '<p style="margin:0;color:#57534E;font-size:15px;line-height:1.6">Cette invitation expire dans 7 jours.</p>',
    }],
    button: { label: "Accepter l'invitation", href: opts.invitationUrl },
    text: `Vous êtes invité sur Hanut comme ${opts.roleLabel}. Acceptez l'invitation : ${opts.invitationUrl}`,
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
    preview: 'Une demande de changement d’adresse email a été faite sur votre compte Hanut.',
    intro: `Vous avez demandé à remplacer cette adresse par ${opts.newEmail}. Confirmez depuis votre email actuel pour continuer.`,
    cards: [{
      title: 'Sécurité',
      html: '<p style="margin:0;color:#57534E;font-size:15px;line-height:1.6">Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email et contactez le support.</p>',
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
    intro: 'Cette adresse a été choisie comme nouvelle adresse de connexion Hanut. Confirmez-la pour terminer le changement.',
    cards: [{
      title: 'Important',
      html: '<p style="margin:0;color:#57534E;font-size:15px;line-height:1.6">Le changement sera finalisé uniquement après validation des deux emails requis par la sécurité Hanut.</p>',
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
    preview: 'Votre espace Hanut est prêt.',
    intro: 'Bienvenue dans Hanut. Votre tableau de bord est prêt pour gérer vos commandes, votre stock, vos clients et vos livraisons.',
    cards: [{
      title: 'Essai Pro',
      html: '<p style="margin:0;color:#166534;font-size:15px;line-height:1.6">Votre essai Pro gratuit de 14 jours est actif. Vous pouvez tester les fonctionnalités avancées sans carte bancaire.</p>',
    }],
    button: { label: 'Accéder au tableau de bord', href: opts.dashboardUrl ?? `${appUrl}/dashboard` },
    text: `Bienvenue sur Hanut. Accédez à votre tableau de bord : ${opts.dashboardUrl ?? `${appUrl}/dashboard`}`,
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
    subject: 'Votre code de vérification Hanut',
    title: 'Vérification de commande',
    preview: 'Votre code de vérification Hanut expire dans 5 minutes.',
    intro: `Votre code pour confirmer votre commande chez ${opts.sellerName} :`,
    cards: [{
      title: 'Code de vérification',
      html: `
        <p style="margin:0;text-align:center;color:#0B5E46;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:38px;font-weight:900;letter-spacing:12px">
          ${safeCode}
        </p>
        <p style="margin:12px 0 0;text-align:center;color:#78716C;font-size:13px">Expire dans 5 minutes.</p>
      `,
    }],
    footer: "Si vous n'avez pas initié cette commande, ignorez cet email.",
    text: `Votre code de vérification Hanut est ${opts.code}. Il expire dans 5 minutes.`,
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
    : '<p style="margin:0;color:#78716C;font-size:15px">Ouvrez la commande pour voir le détail.</p>'

  return sendHanutEmail({
    to: opts.to,
    subject: `Nouvelle commande Hanut - ${opts.customerName}`,
    title: 'Nouvelle commande reçue',
    preview: `Nouvelle commande de ${opts.customerName}.`,
    intro: 'Une commande vient d’être passée sur votre boutique Hanut.',
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
