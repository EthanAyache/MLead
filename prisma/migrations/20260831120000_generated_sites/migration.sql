-- Sites générés automatiquement (offreofficiel.fr) : thèmes, périodes et pages publiques.

-- Thèmes proposés au client à la création d'un site (liste fermée, gérée par l'admin).
CREATE TABLE `SiteTheme` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `defaultUnitPrice` DOUBLE NOT NULL DEFAULT 0,
  `department` ENUM('VOYAGES','EVENTS','BTP','BOUTIQUE','AUTRE') NOT NULL DEFAULT 'AUTRE',
  `active` BOOLEAN NOT NULL DEFAULT true,
  `position` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `SiteTheme_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Périodes commerciales (Souccot, Pessah, été…).
CREATE TABLE `SitePeriod` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `position` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `SitePeriod_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Page publique d'un site : 1-1 avec le Dossier (qui porte le token d'ingestion),
-- et au plus une par campagne.
CREATE TABLE `GeneratedSite` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `brandName` VARCHAR(191) NOT NULL,
  `offerTitle` VARCHAR(191) NULL,
  `startDate` DATETIME(3) NULL,
  `endDate` DATETIME(3) NULL,
  `presentationHtml` TEXT NULL,
  `photos` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `dossierId` VARCHAR(191) NOT NULL,
  `campagneId` VARCHAR(191) NOT NULL,
  `themeId` VARCHAR(191) NOT NULL,
  `periodId` VARCHAR(191) NOT NULL,

  UNIQUE INDEX `GeneratedSite_slug_key`(`slug`),
  UNIQUE INDEX `GeneratedSite_dossierId_key`(`dossierId`),
  UNIQUE INDEX `GeneratedSite_campagneId_key`(`campagneId`),
  INDEX `GeneratedSite_themeId_idx`(`themeId`),
  INDEX `GeneratedSite_periodId_idx`(`periodId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `GeneratedSite` ADD CONSTRAINT `GeneratedSite_dossierId_fkey`
  FOREIGN KEY (`dossierId`) REFERENCES `Dossier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `GeneratedSite` ADD CONSTRAINT `GeneratedSite_campagneId_fkey`
  FOREIGN KEY (`campagneId`) REFERENCES `Campagne`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `GeneratedSite` ADD CONSTRAINT `GeneratedSite_themeId_fkey`
  FOREIGN KEY (`themeId`) REFERENCES `SiteTheme`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `GeneratedSite` ADD CONSTRAINT `GeneratedSite_periodId_fkey`
  FOREIGN KEY (`periodId`) REFERENCES `SitePeriod`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Amorce : le thème de la template livrée + les périodes juives courantes.
INSERT INTO `SiteTheme` (`id`, `name`, `slug`, `defaultUnitPrice`, `department`, `position`) VALUES
  ('sitetheme_voyage_cacher', 'Voyage cacher', 'voyage-cacher', 0, 'VOYAGES', 1);

INSERT INTO `SitePeriod` (`id`, `name`, `slug`, `position`) VALUES
  ('siteperiod_pessah',   'Pessah',   'pessah',   1),
  ('siteperiod_chavouot', 'Chavouot', 'chavouot', 2),
  ('siteperiod_ete',      'Été',      'ete',      3),
  ('siteperiod_souccot',  'Souccot',  'souccot',  4),
  ('siteperiod_hanouka',  'Hanouka',  'hanouka',  5);
