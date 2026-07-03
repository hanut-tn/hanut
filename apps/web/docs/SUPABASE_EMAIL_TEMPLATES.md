# Templates email Supabase Auth

Hanut envoie les emails applicatifs via `lib/email.ts` + Resend. Certains emails peuvent encore etre emis par Supabase Auth selon la configuration du projet ou les actions utilisateur historiques :

- renvoi de confirmation depuis `/verify-email`
- liens Auth generes directement par Supabase si une route legacy est restauree
- fallback dashboard Supabase

Pour garder une experience coherente, configurer les templates Supabase Auth avec les liens `TokenHash`.

Chemin : Supabase Dashboard -> Authentication -> Email Templates.

## Confirm Signup

Subject:

```text
Confirmez votre compte Hanut
```

Body:

```html
<div style="margin:0;padding:32px 14px;background:#F5F5F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E7E5E4;border-radius:18px;overflow:hidden">
    <div style="background:#0B5E46;padding:28px;text-align:center">
      <p style="margin:0;color:#DCFCE7;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Hanut</p>
    </div>
    <div style="padding:30px 28px">
      <h1 style="margin:0 0 14px;color:#1C1917;font-size:24px;line-height:1.25;font-weight:800">Bienvenue sur Hanut</h1>
      <p style="margin:0 0 16px;color:#57534E;font-size:15px;line-height:1.6">Confirmez votre adresse email pour activer votre compte et demarrer votre essai Pro gratuit de 14 jours.</p>
      <p style="margin:0 0 28px;color:#166534;font-size:15px;line-height:1.6;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;padding:18px">Toutes les fonctionnalites Pro sont disponibles pendant 14 jours, sans carte bancaire.</p>
      <p style="text-align:center;margin:0 0 24px">
        <a href="{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=signup" style="display:inline-block;background:#16A34A;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px">Confirmer mon email</a>
      </p>
      <p style="margin:0;color:#78716C;font-size:13px;line-height:1.6">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=signup</p>
    </div>
  </div>
</div>
```

## Invite User

Subject:

```text
Invitation a rejoindre une equipe Hanut
```

Body:

```html
<div style="margin:0;padding:32px 14px;background:#F5F5F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E7E5E4;border-radius:18px;overflow:hidden">
    <div style="background:#0B5E46;padding:28px;text-align:center">
      <p style="margin:0;color:#DCFCE7;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Hanut</p>
    </div>
    <div style="padding:30px 28px">
      <h1 style="margin:0 0 14px;color:#1C1917;font-size:24px;line-height:1.25;font-weight:800">Vous etes invite sur Hanut</h1>
      <p style="margin:0 0 16px;color:#57534E;font-size:15px;line-height:1.6">Creez votre mot de passe pour acceder au tableau de bord de votre equipe.</p>
      <p style="margin:0 0 28px;color:#57534E;font-size:15px;line-height:1.6;background:#FAFAF9;border:1px solid #E7E5E4;border-radius:14px;padding:18px">Cette invitation expire dans 7 jours.</p>
      <p style="text-align:center;margin:0 0 24px">
        <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite" style="display:inline-block;background:#16A34A;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px">Accepter l'invitation</a>
      </p>
      <p style="margin:0;color:#78716C;font-size:13px;line-height:1.6">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite</p>
    </div>
  </div>
</div>
```

## Reset Password

Subject:

```text
Reinitialiser votre mot de passe Hanut
```

Body:

```html
<div style="margin:0;padding:32px 14px;background:#F5F5F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E7E5E4;border-radius:18px;overflow:hidden">
    <div style="background:#0B5E46;padding:28px;text-align:center">
      <p style="margin:0;color:#DCFCE7;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Hanut</p>
    </div>
    <div style="padding:30px 28px">
      <h1 style="margin:0 0 14px;color:#1C1917;font-size:24px;line-height:1.25;font-weight:800">Reinitialisation du mot de passe</h1>
      <p style="margin:0 0 16px;color:#57534E;font-size:15px;line-height:1.6">Utilisez ce lien pour choisir un nouveau mot de passe.</p>
      <p style="margin:0 0 28px;color:#57534E;font-size:15px;line-height:1.6;background:#FAFAF9;border:1px solid #E7E5E4;border-radius:14px;padding:18px">Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
      <p style="text-align:center;margin:0 0 24px">
        <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery" style="display:inline-block;background:#16A34A;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px">Choisir un nouveau mot de passe</a>
      </p>
      <p style="margin:0;color:#78716C;font-size:13px;line-height:1.6">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery</p>
    </div>
  </div>
</div>
```

## Change Email Address

Subject:

```text
Confirmez le changement d'email Hanut
```

Body:

```html
<div style="margin:0;padding:32px 14px;background:#F5F5F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E7E5E4;border-radius:18px;overflow:hidden">
    <div style="background:#0B5E46;padding:28px;text-align:center">
      <p style="margin:0;color:#DCFCE7;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Hanut</p>
    </div>
    <div style="padding:30px 28px">
      <h1 style="margin:0 0 14px;color:#1C1917;font-size:24px;line-height:1.25;font-weight:800">Confirmez votre adresse email</h1>
      <p style="margin:0 0 16px;color:#57534E;font-size:15px;line-height:1.6">Confirmez cette adresse pour terminer le changement d'email de votre compte Hanut.</p>
      <p style="margin:0 0 28px;color:#57534E;font-size:15px;line-height:1.6;background:#FAFAF9;border:1px solid #E7E5E4;border-radius:14px;padding:18px">Si vous n'avez pas demande ce changement, ignorez cet email et contactez le support.</p>
      <p style="text-align:center;margin:0 0 24px">
        <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email_change" style="display:inline-block;background:#16A34A;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px">Confirmer cette adresse</a>
      </p>
    </div>
  </div>
</div>
```
