# Rôles d'équipe — Hanut

## Rôles disponibles

| Rôle       | Accès lecture | Créer/modifier | Supprimer | Gérer l'équipe | Gérer les rôles |
|------------|:-------------:|:--------------:|:---------:|:--------------:|:---------------:|
| `admin`    | ✓             | ✓              | ✓         | ✓              | ✓               |
| `operator` | ✓             | ✓              | ✗         | ✗              | ✗               |
| `readonly` | ✓             | ✗              | ✗         | ✗              | ✗               |

## Description des rôles

### `admin`
Accès complet à la boutique. Peut :
- Créer, modifier et supprimer des commandes, produits, clients
- Anonymiser des données clients (droit à l'effacement INPDP)
- Inviter, retirer et changer le rôle des membres d'équipe

### `operator`
Accès opérationnel. Peut :
- Créer et modifier des commandes, produits, clients
- Ajuster le stock
- Créer des livraisons

Ne peut **pas** supprimer d'entités ni gérer l'équipe.

### `readonly`
Lecture seule. Peut consulter toutes les données de la boutique.

Ne peut **pas** créer, modifier ou supprimer quoi que ce soit.

## Propriétaire de boutique (`isSeller = true`)

Le propriétaire est toujours `admin`. Il est le seul à pouvoir :
- Supprimer définitivement le compte
- Modifier le profil de la boutique
- Modifier le slug public de la boutique

## Promotion au rôle admin

La promotion d'un membre au rôle `admin` se fait via `PATCH /api/team/[memberId]` avec `{ role: 'admin' }`.
Seul un admin (propriétaire ou admin d'équipe) peut effectuer cette opération.

Un admin promu a les mêmes droits d'accès qu'un propriétaire, **sauf** pour la suppression de compte et
la modification du slug (réservées au propriétaire).

## Plan requis

La gestion d'équipe est disponible à partir du plan **Pro**. Le plan Starter ne permet pas d'inviter des membres.
