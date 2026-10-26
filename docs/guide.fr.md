## À quoi ça sert

Une sauvegarde par jour, conservée pour toujours, finit par remplir le disque ; supprimer à la main, c'est risquer d'effacer la mauvaise. Ce script applique une politique claire : garder les **N dernières**, **une par semaine** et **une par mois**, et propose de supprimer le reste.

## Avant de commencer

- Un dossier de sauvegardes dont les noms contiennent la date (`db-2026-10-26.enc`) — sinon la date de modification du fichier est utilisée.
- Un motif de nom de fichier (`.enc`, `.sql.gz`) pour ne viser que vos sauvegardes.

## Pas à pas

1. **Simulez d'abord** (rien n'est supprimé) :
   ```bash
   node src/backup-rotate.mjs /var/backups --pattern .enc --daily 7 --weekly 4 --monthly 6
   ```
2. Relisez la liste : `= garde` et `- supprimerait`.
3. Quand elle vous convient, ajoutez `--apply` : les fichiers hors politique sont **supprimés définitivement**.

## Lire le résultat

Chaque fichier conservé indique pourquoi (`récente`, `hebdomadaire`, `mensuelle`). La plus ancienne sauvegarde de chaque semaine et de chaque mois de la fenêtre est gardée.

## L'automatiser

Après la sauvegarde nocturne, en tâche planifiée. Gardez toujours une copie **hors site** : une rotation locale ne protège pas d'un incendie ou d'un vol.

## Pièges à éviter

- `--apply` exige `--pattern` : sans motif, tous les fichiers du dossier seraient concernés.
- Testez la **restauration** d'une sauvegarde de temps en temps : une sauvegarde jamais restaurée est une hypothèse.
