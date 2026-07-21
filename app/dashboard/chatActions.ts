"use server";

import { getSummary, monthRange } from "@/lib/transactions";
import { getAppointmentStats } from "@/lib/calendar";
import { santiagoMonthString } from "@/lib/dates";
import { answerDashboardQuestion } from "@/lib/chatAssistant";

export async function askDashboardQuestion(question: string, month: string): Promise<string> {
  const currentMonth = month || santiagoMonthString();
  const [summary, appointmentStats] = await Promise.all([
    getSummary(monthRange(currentMonth)),
    getAppointmentStats(currentMonth),
  ]);

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

  return answerDashboardQuestion(question, context);
}
