'use client'

import { useEffect, useState } from 'react'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/hooks/useAuth'
import { formatMoney, getMonthName, fetchDolar, getTagClass } from '@/lib/utils'
import { Download, TrendingUp, CreditCard, Receipt, Pin, DollarSign, TrendingDown, ArrowRight } from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function DashboardPage() {
  const { profile } = useAuth()
  const { 
    tarjetas, loading, currentMonth, monthKey, 
    getGastosMes, getImpuestosMes, getGastosNoProximoMes, getDiferenciaMeses 
  } = useData()
  const [dolar, setDolar] = useState(1050)

  useEffect(() => {
    fetchDolar().then(setDolar)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const gastosMes = getGastosMes(monthKey)
  const impuestosMes = getImpuestosMes(monthKey)
  const noProximoMes = getGastosNoProximoMes(monthKey)
  const diferencia = getDiferenciaMeses(monthKey, dolar)

  // Calcular totales
  let totalARS = 0, totalUSD = 0, totalFijos = 0
  gastosMes.forEach(g => {
    const monto = g.cuotas > 1 ? g.monto / g.cuotas : g.monto
    if (g.moneda === 'USD') totalUSD += monto
    else totalARS += monto
    if (g.es_fijo && g.moneda === 'ARS') totalFijos += monto
  })
  
  const totalImpuestos = impuestosMes.reduce((s, i) => s + i.monto, 0)
  const totalPagar = totalARS + totalImpuestos
  const usdEnPesos = totalUSD * dolar

  // Budget check (solo si está habilitado)
  const budgetARS = profile?.budget_ars || 0
  const hasBudget = budgetARS > 0
  const budgetPct = hasBudget ? (totalARS / budgetARS) * 100 : 0
  const budgetStatus = budgetPct >= 100 ? 'danger' : budgetPct >= 80 ? 'warning' : 'ok'

  // Alertas
  const alerts: { type: string; icon: string; title: string; desc: string }[] = []
  const today = new Date()
  const day = today.getDate()
  
  tarjetas.forEach(t => {
    if (t.cierre) {
      const diff = t.cierre - day
      if (diff > 0 && diff <= 5) {
        alerts.push({ type: 'warning', icon: '📅', title: `Cierre ${t.nombre}`, desc: `Faltan ${diff} días` })
      } else if (diff === 0) {
        alerts.push({ type: 'danger', icon: '🚨', title: `¡HOY cierra ${t.nombre}!`, desc: 'Último día' })
      }
    }
  })

  if (hasBudget && budgetPct >= 90) {
    alerts.push({
      type: budgetPct >= 100 ? 'danger' : 'warning',
      icon: '💸',
      title: budgetPct >= 100 ? '¡Presupuesto excedido!' : 'Cerca del límite',
      desc: `${formatMoney(totalARS)} / ${formatMoney(budgetARS)}`
    })
  }

  // Chart data por categoría
  const catTotals: Record<string, number> = {}
  gastosMes.filter(g => g.moneda === 'ARS').forEach(g => {
    const catName = g.categoria?.nombre || 'Otros'
    const monto = g.cuotas > 1 ? g.monto / g.cuotas : g.monto
    catTotals[catName] = (catTotals[catName] || 0) + monto
  })

  const chartData = {
    labels: Object.keys(catTotals),
    datasets: [{
      data: Object.values(catTotals),
      backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'],
      borderWidth: 0
    }]
  }

  // Top 5 gastos
  const topGastos = [...gastosMes]
    .filter(g => g.moneda === 'ARS')
    .sort((a, b) => {
      const montoA = a.cuotas > 1 ? a.monto / a.cuotas : a.monto
      const montoB = b.cuotas > 1 ? b.monto / b.cuotas : b.monto
      return montoB - montoA
    })
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resumen</h1>
          <p className="text-slate-500">Vista general de {getMonthName(currentMonth)}</p>
        </div>
        <button className="btn btn-success">
          <Download className="w-4 h-4" />
          Exportar Excel
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div 
              key={i}
              className={`flex items-center gap-4 p-4 rounded-xl ${
                alert.type === 'danger' 
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}
            >
              <span className="text-2xl">{alert.icon}</span>
              <div>
                <div className="font-bold">{alert.title}</div>
                <div className="text-sm opacity-80">{alert.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Budget Progress - Solo si está habilitado */}
      {hasBudget && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="font-bold mb-4">💰 Presupuesto del Mes</div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-sm opacity-80">Gastado</div>
              <div className="text-xl font-bold">{formatMoney(totalARS)}</div>
            </div>
            <div>
              <div className="text-sm opacity-80">Límite</div>
              <div className="text-xl font-bold">{formatMoney(budgetARS)}</div>
            </div>
            <div>
              <div className="text-sm opacity-80">{budgetARS - totalARS >= 0 ? 'Disponible' : 'Excedido'}</div>
              <div className="text-xl font-bold">{formatMoney(Math.abs(budgetARS - totalARS))}</div>
            </div>
          </div>
          <div className="bg-white/20 h-3 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                budgetStatus === 'danger' ? 'bg-red-400' : 
                budgetStatus === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className="text-sm mt-2 opacity-80">{budgetPct.toFixed(1)}% usado</div>
        </div>
      )}

      {/* Gastos que NO vienen próximo mes */}
      {noProximoMes.cantidad > 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-emerald-800">💰 No vienen el próximo mes</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700">{noProximoMes.cantidad}</div>
              <div className="text-sm text-emerald-600">Gastos terminan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700">{formatMoney(noProximoMes.totalARS)}</div>
              <div className="text-sm text-emerald-600">Ahorro ARS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700">{formatMoney(noProximoMes.totalUSD, 'USD')}</div>
              <div className="text-sm text-emerald-600">Ahorro USD</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700">{formatMoney(noProximoMes.totalARS + (noProximoMes.totalUSD * dolar))}</div>
              <div className="text-sm text-emerald-600">Total en $</div>
            </div>
          </div>
        </div>
      )}

      {/* Comparación mes actual vs próximo */}
      {diferencia.actual.total > 0 && (
        <div className="bg-slate-100 rounded-2xl p-5">
          <div className="font-bold mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            Proyección próximo mes
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-sm text-slate-500 mb-1">Este mes</div>
              <div className="text-xl font-bold">{formatMoney(diferencia.actual.total)}</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-sm text-slate-500 mb-1">Próximo mes</div>
              <div className="text-xl font-bold">{formatMoney(diferencia.proximo.total)}</div>
            </div>
            <div className={`rounded-xl p-4 text-center ${diferencia.diferencia > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <div className="text-sm text-slate-500 mb-1">Diferencia</div>
              <div className={`text-xl font-bold ${diferencia.diferencia > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {diferencia.diferencia > 0 ? '-' : '+'}{formatMoney(Math.abs(diferencia.diferencia))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-xs text-slate-500 font-semibold uppercase">Total a Pagar</div>
          <div className="text-xl font-bold text-red-600">{formatMoney(totalPagar)}</div>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-3">
            <CreditCard className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-xs text-slate-500 font-semibold uppercase">Consumos ARS</div>
          <div className="text-xl font-bold">{formatMoney(totalARS)}</div>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-xs text-slate-500 font-semibold uppercase">Consumos USD</div>
          <div className="text-xl font-bold text-emerald-600">{formatMoney(totalUSD, 'USD')}</div>
          <div className="text-xs text-slate-500">≈ {formatMoney(usdEnPesos)}</div>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
            <Receipt className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-xs text-slate-500 font-semibold uppercase">Impuestos</div>
          <div className="text-xl font-bold">{formatMoney(totalImpuestos)}</div>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
            <Pin className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-xs text-slate-500 font-semibold uppercase">Fijos</div>
          <div className="text-xl font-bold text-purple-600">{formatMoney(totalFijos)}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="card p-6">
          <h3 className="font-bold mb-4">📊 Por Categoría</h3>
          <div className="h-64">
            {Object.keys(catTotals).length > 0 ? (
              <Doughnut 
                data={chartData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'right' } }
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Sin datos este mes
              </div>
            )}
          </div>
        </div>

        {/* Top Gastos */}
        <div className="card p-6">
          <h3 className="font-bold mb-4">🔝 Mayores Gastos</h3>
          <div className="space-y-3">
            {topGastos.length > 0 ? topGastos.map((g, i) => {
              const monto = g.cuotas > 1 ? g.monto / g.cuotas : g.monto
              return (
                <div key={g.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                    i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600' :
                    i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                    'bg-indigo-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{g.descripcion}</div>
                    <div className="text-xs text-slate-500">{g.categoria?.nombre || 'Sin categoría'}</div>
                  </div>
                  <div className="font-bold">{formatMoney(monto)}</div>
                </div>
              )
            }) : (
              <div className="text-center text-slate-400 py-8">Sin gastos este mes</div>
            )}
          </div>
        </div>
      </div>

      {/* Desglose por Tarjeta */}
      <div className="card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold">Desglose por Tarjeta</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Tarjeta</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">ARS</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">USD</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Imp</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {tarjetas.length > 0 ? tarjetas.map(t => {
                const gT = gastosMes.filter(g => g.tarjeta_id === t.id)
                const iT = impuestosMes.filter(i => i.tarjeta_id === t.id)
                let cARS = 0, cUSD = 0
                gT.forEach(g => {
                  const m = g.cuotas > 1 ? g.monto / g.cuotas : g.monto
                  if (g.moneda === 'USD') cUSD += m
                  else cARS += m
                })
                const cImp = iT.reduce((s, i) => s + i.monto, 0)
                return (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <span className={`tag ${getTagClass(t.tipo)}`}>{t.nombre}</span>
                    </td>
                    <td className="p-4 font-semibold">{formatMoney(cARS)}</td>
                    <td className="p-4 font-semibold text-emerald-600">{cUSD > 0 ? formatMoney(cUSD, 'USD') : '-'}</td>
                    <td className="p-4 font-semibold">{formatMoney(cImp)}</td>
                    <td className="p-4 font-bold">{formatMoney(cARS + cImp)}</td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">No hay tarjetas configuradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
