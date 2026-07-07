import { prisma } from '@/lib/prisma'

// Le client a-t-il une facture d'arrêt non réglée (émise mais pas payée) ? → compte verrouillé
// (pas d'achat de pack, pas de changement de formule, pas de réactivation de site tant que non payé).
export async function hasUnpaidStopInvoice(clientId: string): Promise<boolean> {
  const inv = await prisma.stopInvoice.findFirst({
    where: { clientId, status: { in: ['SENT', 'FAILED'] } },
    select: { id: true },
  })
  return inv !== null
}
