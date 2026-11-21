# Cantina

Application de la cantine de Vatel Abidjan, réalisée pour le Hackathon Restauration Vatel (21 novembre 2026).
Les élèves consultent le menu de la semaine, réservent ou composent leur repas, paient et récupèrent leur commande. L'équipe de la cantine gère tout depuis un tableau de bord.

## Démo

- Application : _lien Cloudflare Pages à ajouter_
- Comptes de test : _à ajouter (client, caisse, cuisine, admin)_

## Ce qui est fait

**Client**
- Inscription, connexion
- Menu de la semaine, jour par jour, avec les quantités restantes
- Commande ou réservation d'un plat
- Composer son bol (prix en direct, grammes par portion) et composer son plateau (entrée, plat, dessert, boisson, sauce)
- Solde, recharge, historique des commandes
- Paiement : solde, Wave, Orange Money, carte (Mobile Money et carte simulés pour la démo)
- Ticket de commande animé, bouton « J'arrive dans 5 min »
- Remises de fin de journée, fidélité (-10 % à partir de la 6e commande du mois)

**Équipe**
- Admin : menus, plats, stock, utilisateurs et rôles, droits donnés à la caisse ou à la cuisine, statistiques par jour, semaine, mois et année, « super vente du mois »
- Caisse : commandes du jour, quantités de chaque plat par jour, remise au client, annulation avec remboursement
- Cuisine : commandes à préparer, récapitulatif
- Courses : liste de courses à partir des seuils de stock, budget du coursier, réception des achats
- Partenaires : stock proposé chaque jour
- Un plat proposé par la caisse ou la cuisine doit être validé par l'admin

## À venir

Notifications push, mode hors ligne, application mobile native, plusieurs langues, vrai paiement Mobile Money.

## Technique

- React 19 + Vite, React Router
- Supabase : base Postgres, authentification, règles d'accès (RLS), fonctions SQL pour les commandes, les paiements et le stock
- Déploiement : Cloudflare Pages

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
