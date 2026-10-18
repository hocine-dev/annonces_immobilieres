# Utilisation de l’IA — Projet Annonces Immo

Nous avons utilisé l’IA comme aide au développement, principalement pour générer du code répétitif, proposer des solutions et préparer des tests. Nous avons ensuite relu, adapté et vérifié le code nous-mêmes, notamment sur les questions de sécurité et de persistance des données.

## Deux suggestions refusées

1. **Passer à Prisma 8.** Nous avons conservé Prisma 7, conformément à l’énoncé du TP et pour éviter les problèmes de compatibilité avec Better Auth.
2. **Enregistrer des modifications en base sans vérifier les droits.** Nous avons refusé cette approche : une Server Action doit vérifier l’identité et les autorisations de l’utilisateur avant toute modification.

## Un bug détecté grâce aux tests

Du code proposé par l’IA permettait de modifier des données sans contrôle d’autorisation suffisant. Nous l’avons découvert par des essais directs dans Chrome, puis reproduit avec des tests Vitest dans le dossier `tests/`. Nous avons corrigé les actions pour effectuer une vérification d'autorisation avant chaque persistance de données.

## Bilan

L’IA nous a fait gagner du temps sur les tâches répétitives. En revanche, elle ne remplace ni la compréhension du code ni les vérifications humaines, surtout pour l’authentification, les autorisations et les opérations sur la base de données.
