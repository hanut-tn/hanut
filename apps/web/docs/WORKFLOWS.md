# Workflows métier — Hanut

## Commande expédiée → annulée (`shipped` → `returned` → `cancelled`)

Une commande **Expédiée** ne peut pas être annulée directement. Cela évite de
remettre en stock un colis qui est encore chez le transporteur.

### Étape 1 — Enregistrer le retour

Depuis la fiche commande (`/orders/[id]`) :

1. cliquer sur **Marquer comme retournée** ;
2. la commande passe au statut `returned` ;
3. le stock reste inchangé tant que l’annulation finale n’est pas confirmée.

### Étape 2 — Annuler et remettre en stock

Depuis la même fiche, cliquer sur **Annuler et remettre en stock**.

La RPC `cancel_order_with_stock` effectue alors dans une seule transaction :

- la restitution du stock global et de la variante concernée ;
- l’ajout du mouvement de stock ;
- le passage au statut `cancelled` ;
- l’ajout dans l’historique des statuts.

La restitution ne peut donc être exécutée qu’une seule fois.

### Livraison associée

La livraison reste dans l’historique logistique. Supprimer une livraison non
collectée peut ramener techniquement une commande de `shipped` à `confirmed`.
Une livraison dont le COD a déjà été collecté ou reversé ne peut pas être
annulée librement.

---

## Commande en préparation → annulée

Les commandes `pending`, `new` ou `confirmed` peuvent être annulées via
`cancel_order_with_stock`. Le stock est restitué immédiatement et la commande
passe à `cancelled`.

---

## Corbeille

Les commandes supprimées sont placées en corbeille et restent restaurables
depuis l’onglet **Corbeille**. Aucune suppression automatique après 30 jours
n’est actuellement implémentée : la suppression définitive reste une action
explicite d’un administrateur.
