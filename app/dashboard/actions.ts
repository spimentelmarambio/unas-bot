"use server";

import { revalidatePath } from "next/cache";
import { deleteTransaction } from "@/lib/transactions";

export async function deleteTransactionAction(id: string) {
  await deleteTransaction(id);
  revalidatePath("/dashboard");
}
