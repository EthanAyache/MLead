-- Réglage par page : le client peut-il la modifier depuis son portail ?
-- true par défaut (comportement actuel) ; l'équipe peut le retirer page par page.
ALTER TABLE `GeneratedSite` ADD COLUMN `clientCanEdit` BOOLEAN NOT NULL DEFAULT true;
