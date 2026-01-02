'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from './useAuth'
import { MovimientoAhorro, Meta } from '@/types'

type DataContextType = {
  movimientos: MovimientoAhorro[]
  metas: Meta[]
  loading: boolean
  fetchAll: () => Promise<void>
  addMovimiento: (tipo: 'pesos' | 'usd', monto: number) => Promise<{ error: any }>
  addMeta: (data: any) => Promise<{ error: any }>
  updateMeta: (id: string, data: any) => Promise<{ error: any }>
  deleteMeta: (id: string) => Promise<{ error: any }>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()

  console.log('📊 [Firebase DataProvider] RENDER - authLoading:', authLoading, 'user:', user?.uid || 'NULL')

  const [movimientos, setMovimientos] = useState<MovimientoAhorro[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    console.log('📊 [Firebase useData] fetchAll called')
    console.log('📊 [Firebase useData] Current user.uid:', user?.uid)

    setLoading(true)
    try {
      if (!user) {
        console.log('📊 [Firebase useData] No user - Clearing data')
        setMovimientos([])
        setLoading(false)
        return
      }

      console.log('📊 [Firebase useData] Fetching movimientos for user:', user.uid)
      const startTime = Date.now()

      // Fetch movimientos
      const movimientosRef = collection(db, 'movimientos_ahorro')
      const movimientosQuery = query(
        movimientosRef,
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc')
      )
      const movimientosSnap = await getDocs(movimientosQuery)
      const movimientosData = movimientosSnap.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          tipo: data.tipo,
          monto: data.monto,
          user_id: data.user_id,
          created_at: data.created_at instanceof Timestamp
            ? data.created_at.toDate().toISOString()
            : data.created_at
        }
      }) as MovimientoAhorro[]

      console.log('📊 [Firebase useData] Movimientos result:', movimientosData.length, 'rows')

      const endTime = Date.now()
      console.log('📊 [Firebase useData] Data fetched successfully in', endTime - startTime, 'ms')

      setMovimientos(movimientosData)
      setLoading(false)
    } catch (error) {
      console.error('📊 [Firebase useData] Error fetching data:', error)
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    console.log('📊 [Firebase useData] useEffect triggered - authLoading:', authLoading, 'user:', user?.uid || 'NULL')

    if (!authLoading && user) {
      console.log('📊 [Firebase useData] User exists - Calling fetchAll')
      fetchAll()
    } else if (!authLoading && !user) {
      console.log('📊 [Firebase useData] No user and auth done loading - Setting loading to FALSE')
      setLoading(false)
    } else {
      console.log('📊 [Firebase useData] Auth still loading - waiting...')
    }
  }, [user, authLoading, fetchAll])

  const addMovimiento = useCallback(async (tipo: 'pesos' | 'usd', monto: number) => {
    if (!user) {
      console.error('💵 [Firebase addMovimiento] No user!')
      return { error: new Error('No user') }
    }

    console.log('💵 [Firebase addMovimiento] called - tipo:', tipo, 'monto:', monto)
    console.log('💵 [Firebase addMovimiento] user.uid:', user.uid)

    const insertData = {
      tipo,
      monto,
      user_id: user.uid,
      created_at: serverTimestamp()
    }

    console.log('💵 [Firebase addMovimiento] Inserting:', insertData)

    try {
      const movimientosRef = collection(db, 'movimientos_ahorro')
      await addDoc(movimientosRef, insertData)

      console.log('💵 [Firebase addMovimiento] SUCCESS - Calling fetchAll')
      await fetchAll()

      return { error: null }
    } catch (error) {
      console.error('💵 [Firebase addMovimiento] ERROR:', error)
      return { error }
    }
  }, [user, fetchAll])

  // Stub functions for features not migrated yet
  const addMeta = useCallback(async (data: any) => {
    console.log('⚠️ [Firebase] addMeta not implemented yet')
    return { error: new Error('Not implemented') }
  }, [])

  const updateMeta = useCallback(async (id: string, data: any) => {
    console.log('⚠️ [Firebase] updateMeta not implemented yet')
    return { error: new Error('Not implemented') }
  }, [])

  const deleteMeta = useCallback(async (id: string) => {
    console.log('⚠️ [Firebase] deleteMeta not implemented yet')
    return { error: new Error('Not implemented') }
  }, [])

  const value: DataContextType = {
    movimientos,
    metas,
    loading,
    fetchAll,
    addMovimiento,
    addMeta,
    updateMeta,
    deleteMeta
  }

  console.log('📊 [Firebase useData] Creating context value - loading:', loading, 'movimientos:', movimientos.length)

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
