'use client'

import { useState, useEffect } from 'react'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/hooks/useAuth'
import { formatMoney, getMonthName } from '@/lib/utils'
import { Save, Plus, X, RefreshCw } from 'lucide-react'

export default function ConfigPage() {
  const { profile, updateProfile } = useAuth()
  const { tags, addTag, deleteTag, gastos, addGasto, currentMonth } = useData()

  const [budgetEnabled, setBudgetEnabled] = useState(false)
  const [budgetArs, setBudgetArs] = useState('')
  const [budgetUsd, setBudgetUsd] = useState('')
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)

  // Inicializar valores del perfil
  useEffect(() => {
    if (profile) {
      const hasArs = (profile.budget_ars || 0) > 0
      const hasUsd = (profile.budget_usd || 0) > 0
      setBudgetEnabled(hasArs || hasUsd)
      setBudgetArs(profile.budget_ars ? String(profile.budget_ars) : '')
      setBudgetUsd(profile.budget_usd ? String(profile.budget_usd) : '')
    }
  }, [profile])

  const handleSaveBudget = async () => {
    setSaving(true)
    
    if (budgetEnabled) {
      await updateProfile({
        budget_ars: parseFloat(budgetArs) || 0,
        budget_usd: parseFloat(budgetUsd) || 0
      })
    } else {
      // Desactivar presupuesto
      await updateProfile({
        budget_ars: 0,
        budget_usd: 0
      })
    }
    
    setSaving(false)
  }

  const handleAddTag = async () => {
    if (!newTag.trim()) return
    await addTag(newTag.trim())
    setNewTag('')
  }

  const handleCopyRecurring = async () => {
    const fijos = gastos.filter(g => g.es_fijo)
    const nextMonth = new Date(currentMonth)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`

    let copied = 0
    for (const g of fijos) {
      const exists = gastos.some(
        x => x.descripcion === g.descripcion && x.mes_facturacion === nextMonthKey && x.es_fijo
      )
      if (!exists) {
        await addGasto({
          descripcion: g.descripcion,
          tarjeta_id: g.tarjeta_id,
          categoria_id: g.categoria_id,
          monto: g.monto,
          moneda: g.moneda,
          cuotas: 1,
          cuota_actual: 1,
          fecha: nextMonth.toISOString().split('T')[0],
          mes_facturacion: nextMonthKey,
          es_fijo: true
        })
        copied++
      }
    }

    alert(copied > 0 
      ? `Se copiaron ${copied} gastos fijos a ${getMonthName(nextMonth)}`
      : 'Todos los gastos fijos ya existen en el próximo mes'
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-slate-500">Personalizá tu experiencia</p>
      </div>

      {/* Presupuesto - OPCIONAL */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">💰 Presupuesto Mensual</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={budgetEnabled}
              onChange={e => setBudgetEnabled(e.target.checked)}
              className="w-5 h-5 accent-indigo-500"
            />
            <span className="text-sm font-medium">Activar</span>
          </label>
        </div>
        
        {budgetEnabled ? (
          <>
            <p className="text-slate-500 text-sm mb-4">Establecé un límite mensual para controlar tus gastos</p>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Presupuesto ARS</label>
                <input
                  type="number"
                  className="input"
                  placeholder="500000"
                  value={budgetArs}
                  onChange={e => setBudgetArs(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Presupuesto USD</label>
                <input
                  type="number"
                  className="input"
                  placeholder="500"
                  value={budgetUsd}
                  onChange={e => setBudgetUsd(e.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4 text-center text-slate-500">
            <p>Sin presupuesto configurado</p>
            <p className="text-sm">Activá el checkbox para establecer un límite mensual</p>
          </div>
        )}
        
        <button onClick={handleSaveBudget} disabled={saving} className="btn btn-primary mt-4">
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Tags */}
      <div className="card p-5">
        <h3 className="font-bold mb-4">🏷️ Tags Personalizados</h3>
        <p className="text-slate-500 text-sm mb-4">Creá tags para organizar tus gastos</p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map(t => (
            <div key={t.id} className="flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full">
              <span className="font-semibold text-sm">{t.nombre}</span>
              <button onClick={() => deleteTag(t.id)} className="hover:text-orange-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {tags.length === 0 && (
            <span className="text-slate-400">Sin tags</span>
          )}
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Nuevo tag..."
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAddTag()}
          />
          <button onClick={handleAddTag} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
      </div>

      {/* Gastos Recurrentes */}
      <div className="card p-5">
        <h3 className="font-bold mb-4">🔄 Gastos Recurrentes</h3>
        <p className="text-slate-500 text-sm mb-4">
          Copiá automáticamente todos los gastos marcados como "fijos" al próximo mes
        </p>
        
        <button onClick={handleCopyRecurring} className="btn btn-primary">
          <RefreshCw className="w-4 h-4" />
          Copiar Gastos Fijos al Próximo Mes
        </button>
      </div>

      {/* Info */}
      <div className="card p-5 bg-slate-50">
        <h3 className="font-bold mb-2">ℹ️ Información</h3>
        <div className="text-sm text-slate-600 space-y-1">
          <p><strong>Email:</strong> {profile?.email}</p>
          <p><strong>Usuario:</strong> {profile?.nombre}</p>
          <p><strong>Versión:</strong> 2.0.0</p>
        </div>
      </div>
    </div>
  )
}
