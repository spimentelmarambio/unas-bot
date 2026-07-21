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
      mes: currentMonth,
      ingresos: summary.incomeTotal,
      serviciosRegistrados: summary.incomeCount,
      gastos: summary.expenseTotal,
      neto: summary.net,
      citas: appointmentStats
        ? {
            esteMes: appointmentStats.countThisMonth,
            promedioHistoricoPorMes: appointmentStats.averagePerMonth,
            promedioPorSemana: appointmentStats.averagePerWeek,
            totalHistorico: appointmentStats.totalAppointments,
            mesConMasCitas: appointmentStats.busiestMonth,
            variacionVsMesAnteriorPorcentaje: appointmentStats.changeVsPreviousMonth,
            porServicio: appointmentStats.serviceBreakdown,
          }
        : null,
    };
    console.log("[Chat Action] Contexto construido, llamando a IA...");

    const result = await answerDashboardQuestion(question, context);
    console.log("[Chat Action] Resultado obtenido");
    return result;
  } catch (error) {
    console.error("[Chat Action] Error:", error);
    throw error;
  }
}
