'use client'

import { useState } from 'react'
import { useData } from '@/hooks/useData'
import { getCardTypeClass } from '@/lib/utils'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { Tarjeta } from '@/types'

export default function TarjetasPage() {
  const { tarjetas, addTarjeta, updateTarjeta, deleteTarjeta } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Tarjeta | null>(null)
  const [form, setForm] = useState({
    nombre: '', tipo: 'visa', banco: '', digitos: '', cierre: ''
  })

  const resetForm = () => {
    setForm({ nombre: '', tipo: 'visa', banco: '', digitos: '', cierre: '' })
  }

  const openEdit = (t: Tarjeta) => {
    setEditing(t)
    setForm({
      nombre: t.nombre,
      tipo: t.tipo,
      banco: t.banco || '',
      digitos: t.digitos || '',
      cierre: t.cierre ? String(t.cierre) : ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.nombre) return

    const data = {
      nombre: form.nombre,
      tipo: form.tipo as 'visa' | 'mastercard' | 'amex' | 'other',
      banco: form.banco || null,
      digitos: form.digitos || null,
      cierre: form.cierre ? parseInt(form.cierre) : null
    }

    if (editing) {
      await updateTarjeta(editing.id, data)
    } else {
      await addTarjeta(data)
    }

    setShowModal(false)
    setEditing(null)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta tarjeta?')) {
      await deleteTarjeta(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarjetas</h1>
          <p className="text-slate-500">Administrá tus tarjetas</p>
        </div>
        <button onClick={() => { resetForm(); setEditing(null); setShowModal(true) }} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tarjetas.length === 0 ? (
          <div className="col-span-full text-center py-16 text-slate-400">
            <div className="text-5xl mb-4">💳</div>
            <p>No tenés tarjetas</p>
          </div>
        ) : tarjetas.map(t => (
          <div key={t.id} className={`${getCardTypeClass(t.tipo)} rounded-2xl p-5 text-white min-h-[160px] relative`}>
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => openEdit(t)} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(t.id)} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-xs font-bold uppercase opacity-70 mb-3">
              {t.tipo.toUpperCase()}
            </div>
            <div className="text-lg font-bold mb-1">{t.nombre}</div>
            <div className="text-sm opacity-60 font-mono">
              {t.banco} {t.digitos && `•••• ${t.digitos}`}
            </div>
            {t.cierre && (
              <div className="text-sm opacity-60 mt-3">
                Cierre: día {t.cierre}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editing ? 'Editar' : 'Nueva'} Tarjeta</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Visa Gold BBVA"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tipo</label>
                  <select
                    className="input"
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">Amex</option>
                    <option value="other">Otra</option>
                  </select>
                </div>
                <div>
                  <label className="label">Banco</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="BBVA, Santander..."
                    value={form.banco}
                    onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Últimos 4 dígitos</label>
                  <input
                    type="text"
                    className="input"
                    maxLength={4}
                    placeholder="1234"
                    value={form.digitos}
                    onChange={e => setForm(f => ({ ...f, digitos: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Día de cierre</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    max={31}
                    placeholder="15"
                    value={form.cierre}
                    onChange={e => setForm(f => ({ ...f, cierre: e.target.value }))}
                  />
                </div>
              </div>
              <button onClick={handleSave} className="btn btn-primary w-full justify-center">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
