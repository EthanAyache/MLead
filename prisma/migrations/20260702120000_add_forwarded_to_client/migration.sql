-- Marqueur : le lead a-t-il été transmis au client par e-mail ?
-- false = retenu (client suspendu au moment de la réception) → à renvoyer dès régularisation.
ALTER TABLE `InboundLead` ADD COLUMN `forwardedToClient` BOOLEAN NOT NULL DEFAULT false;

-- Backfill : tous les leads déjà en base sont considérés comme déjà traités, pour ne jamais
-- les renvoyer par erreur lors du prochain paiement. Seuls les nouveaux leads retenus seront à false.
UPDATE `InboundLead` SET `forwardedToClient` = true;

-- Index pour retrouver rapidement les leads retenus d'un client lors d'un paiement.
CREATE INDEX `InboundLead_forwardedToClient_idx` ON `InboundLead`(`forwardedToClient`);
