"use server";

import { revalidatePath } from "next/cache";
import { deleteTransaction, updateTransaction } from "@/lib/transactions";
import type { NailScope } from "@/lib/generated/prisma/enums";

export async function deleteTransactionAction(id: string) {
  try {
    await deleteTransaction(id);
    revalidatePath("/dashboard");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al borrar";
    throw new Error(message);
  }
}

export async function updateTransactionAction(
  id: string,
  data: { amount: number; scope: NailScope }
) {
  // Server actions are a public HTTP endpoint - the args can be anything,
  // so nothing here reaches Prisma unchecked.
  if (data.scope !== "BUSINESS" && data.scope !== "PERSONAL") {
    throw new Error("Ámbito inválido");
  }
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error("El monto tiene que ser un número mayor a cero");
  }
  // The column is Decimal(14,2): anything bigger is a typo, and letting it
  // through would fail in the driver with a much worse message.
  if (data.amount > 999_999_999_999) {
    throw new Error("El monto es demasiado grande");
  }
  try {
    await updateTransaction(id, { amount: Math.round(data.amount), scope: data.scope });
    revalidatePath("/dashboard");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al guardar";
    throw new Error(message);
  }
}
