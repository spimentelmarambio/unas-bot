"use server";

import { revalidatePath } from "next/cache";
import { deleteTransaction } from "@/lib/transactions";

export async function deleteTransactionAction(id: string) {
  try {
    await deleteTransaction(id);
    revalidatePath("/dashboard");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al borrar";
    throw new Error(message);
  }
}
