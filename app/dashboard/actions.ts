"use server";

import { revalidatePath } from "next/cache";
import { deleteTransaction, setTransactionScope } from "@/lib/transactions";
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

export async function setTransactionScopeAction(id: string, scope: NailScope) {
  // Server actions are a public HTTP endpoint - the arg can be anything,
  // so don't hand it to Prisma unchecked.
  if (scope !== "BUSINESS" && scope !== "PERSONAL") {
    throw new Error("Ámbito inválido");
  }
  try {
    await setTransactionScope(id, scope);
    revalidatePath("/dashboard");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al cambiar el ámbito";
    throw new Error(message);
  }
}
