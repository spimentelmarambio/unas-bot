"use server";

import { getSummary, monthRange } from "@/lib/transactions";
import { getAppointmentStats } from "@/lib/calendar";
import { santiagoMonthString } from "@/lib/dates";
import { answerDashboardQuestion } from "@/lib/chatAssistant";

export async function askDashboardQuestion(question: string, month: string): Promise<string> {
  try {
    console.log("[Chat Action] Iniciando, pregunta:", question);
    const currentMonth = month || santiagoMonthString();
    console.log("[Chat Action] Mes:", currentMonth);

    const [summary, appointmentStats] = await Promise.all([
      getSummary(monthRange(currentMonth)),
      getAppointmentStats(currentMonth),
    ]);
    console.log("[Chat Action] Datos obtenidos, summary:", summary.incomeTotal, appointmentStats?.totalAppointments);

    const context = {
      mesActual: currentMonth,
      resumen: {
        ingresos: summary.incomeTotal,
        serviciosRegistrados: summary.incomeCount,
        gastos: summary.expenseTotal,
        neto: summary.net,
      },
      citas: appointmentStats
        ? {
            esteMes: appointmentStats.countThisMonth,
            promedioHistoricoPorMes: appointmentStats.averagePerMonth,
            promedioPorSemana: appointmentStats.averagePerWeek,
            totalHistorico: appointmentStats.totalAppointments,
            mesConMasCitas: appointmentStats.busiestMonth?.month,
            citasEnMesConMas: appointmentStats.busiestMonth?.count,
            variacionVsMesAnteriorPorcentaje: appointmentStats.changeVsPreviousMonth,
            porServicio: appointmentStats.serviceBreakdown,
            monthlySeries: appointmentStats.monthlySeries,
          }
        : null,
    };
    console.log("[Chat Action] Contexto construido, llamando a IA...");

    const result = await answerDashboardQuestion(question, context);
    console.log("[Chat Action] Resultado obtenido");
    return result;
  } catch (error) {
    console.error("[Chat Action] Error capturado:", error instanceof Error ? error.message : String(error));
    return `Error: No pude procesar tu pregunta. ${error instanceof Error ? error.message : "Intenta de nuevo."}`;
  }
}
