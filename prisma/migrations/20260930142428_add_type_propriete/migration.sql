/*
  Warnings:

  - Added the required column `chambres` to the `annonce` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surface` to the `annonce` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typePropriete` to the `annonce` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ville` to the `annonce` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TypePropriete" AS ENUM ('APPARTEMENT', 'MAISON', 'VILLA', 'STUDIO', 'LOFT');

-- AlterTable
ALTER TABLE "annonce" ADD COLUMN     "chambres" INTEGER NOT NULL,
ADD COLUMN     "surface" INTEGER NOT NULL,
ADD COLUMN     "typePropriete" "TypePropriete" NOT NULL,
ADD COLUMN     "ville" TEXT NOT NULL;
