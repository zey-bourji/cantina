# Cantina

Application de la cantine de Vatel Abidjan, réalisée pour le Hackathon Restauration Vatel (21 novembre 2026).
Les élèves consultent le menu, réservent ou composent leur repas, paient et récupèrent leur commande. L'équipe de la cantine gère tout depuis un tableau de bord.

## Démo

- Application : https://cantina.bourjizeinab17.workers.dev/
- Comptes de test : _à ajouter (client, caisse, cuisine, admin)_

La connexion se fait par code reçu par email. L'équipe peut aussi se connecter avec un mot de passe (« Connexion équipe »).

## Ce qui est fait

**Client**
- Accueil public : plats du jour, panier sans compte, inscription demandée seulement à la validation de la commande
- Inscription et connexion par code email
- Menu par jour, avec les quantités restantes
- Petit-déjeuner, déjeuner, dîner : chaque service a son heure limite, et après l'heure on peut réserver pour demain
- Fiche de chaque plat : description, allergènes, alerte selon les allergies déclarées par le client
- Composer son bol (prix en direct, grammes par portion) et composer son plateau
- Solde, recharge, historique des commandes
- Paiement : solde, Wave, Orange Money, carte (Mobile Money et carte simulés pour la démo)
- Ticket de commande, bouton « J'arrive dans 5 min »
- Remises de fin de journée, fidélité (-10 % à partir de la 6e commande du mois)
- Installable sur téléphone (PWA) avec un cache hors ligne

**Équipe**
- Admin : tableau de bord (ventes, comparaison avec la période précédente, export CSV), menus, ajout et suppression de plats avec photos, portions à préparer pour demain, utilisateurs et rôles, droits donnés à la caisse ou à la cuisine
- Caisse : commandes du jour, quantités de chaque plat par jour, remise au client, annulation avec remboursement
- Cuisine : commandes à préparer, récapitulatif
- Courses : liste de courses à partir des seuils de stock, budget du coursier, réception des achats
- Partenaires : stock proposé chaque jour
- Un plat proposé par la caisse ou la cuisine doit être validé par l'admin

## À venir

Notifications push, plusieurs langues, notes et avis sur les plats, suggestions par IA, vrai paiement Mobile Money.

## Technique

- React 19 + Vite, React Router
- Supabase : base Postgres, authentification par code email, règles d'accès (RLS), fonctions SQL pour les commandes, les paiements et le stock
- Déploiement : Cloudflare Workers (build automatique à chaque push sur `main`)

## Lancer en local

```bash
npm install
cp .env.example .env   # puis renseigner l'URL et la clé Supabase
npm run dev
```

Variables d'environnement :

```
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=
```

## Auteure

Zeinab Bourji (Zey), étudiante en 3e année d'informatique à l'USJ-CI, Abidjan.
