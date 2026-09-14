-- Catégories métier des clients / partenaires (salle, traiteur, DJ…), relation N-N avec Client.

-- CreateTable
CREATE TABLE `ClientCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ClientCategory_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ClientToClientCategory` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ClientToClientCategory_AB_unique`(`A`, `B`),
    INDEX `_ClientToClientCategory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_ClientToClientCategory` ADD CONSTRAINT `_ClientToClientCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ClientToClientCategory` ADD CONSTRAINT `_ClientToClientCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `ClientCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
