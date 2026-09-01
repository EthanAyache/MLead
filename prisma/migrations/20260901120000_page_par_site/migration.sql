-- La page publique habille désormais un site existant (créé par l'admin, avec son prix et sa
-- formule) au lieu de créer un nouveau site. Le lien vers la campagne devient donc redondant :
-- il passe par le site. Et le thème ne porte plus ni prix ni département, qui viennent du site.

ALTER TABLE `GeneratedSite` DROP FOREIGN KEY `GeneratedSite_campagneId_fkey`;
DROP INDEX `GeneratedSite_campagneId_key` ON `GeneratedSite`;
ALTER TABLE `GeneratedSite` DROP COLUMN `campagneId`;

ALTER TABLE `SiteTheme` DROP COLUMN `defaultUnitPrice`;
ALTER TABLE `SiteTheme` DROP COLUMN `department`;
