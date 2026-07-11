'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Pencil, Trash2, Check, Tag } from 'lucide-react'
import type { Category } from '@hanut/types'

type Props = {
  categories: Category[]
  onClose: () => void
  createCategory: (name: string) => Promise<{ category?: Category; error?: string }>
  updateCategory: (id: string, name: string) => Promise<{ error?: string }>
  deleteCategory: (id: string) => Promise<{ error?: string }>
  onChange: (categories: Category[]) => void
}

const MAX_CATEGORIES = 20

export default function CategoriesModal({ categories, onClose, createCategory, updateCategory, deleteCategory, onChange }: Props) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setError(null)
    setAdding(true)
    const result = await createCategory(trimmed)
    setAdding(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.category) {
      onChange([...categories, result.category])
      setNewName('')
    }
  }

  function startEdit(category: Category) {
    setError(null)
    setEditingId(category.id)
    setEditingName(category.name)
  }

  async function handleSaveEdit(category: Category) {
    const trimmed = editingName.trim()
    if (!trimmed || trimmed === category.name) {
      setEditingId(null)
      return
    }
    setError(null)
    setSavingEdit(true)
    const result = await updateCategory(category.id, trimmed)
    setSavingEdit(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onChange(categories.map(c => (c.id === category.id ? { ...c, name: trimmed } : c)))
    setEditingId(null)
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setError(null)
    setDeleting(true)
    const result = await deleteCategory(confirmDelete.id)
    setDeleting(false)
    if (result.error) {
      setError(result.error)
      setConfirmDelete(null)
      return
    }
    onChange(categories.filter(c => c.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const atLimit = categories.length >= MAX_CATEGORIES

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden overscroll-contain bg-white sm:flex sm:items-center sm:justify-center sm:bg-black/40 sm:p-4">
      <div className="fixed inset-0 z-[101] flex h-[100dvh] w-full flex-col bg-white shadow-xl sm:relative sm:inset-auto sm:z-auto sm:h-auto sm:max-h-[calc(100dvh-4rem)] sm:max-w-md sm:rounded-xl sm:border sm:border-[#E7E5E4]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6">
          <h2 className="font-semibold text-[#1C1917]">Gérer les catégories</h2>
          <button
            onClick={onClose}
            className="text-[#78716C] hover:text-[#1C1917] w-10 h-10 touch-manipulation flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Liste */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 [-webkit-overflow-scrolling:touch]">
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="w-8 h-8 mx-auto mb-2 text-[#78716C] opacity-30" />
              <p className="text-sm text-[#78716C]">Aucune catégorie pour l&apos;instant.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 rounded-lg border border-[#E7E5E4] px-3 py-2"
                >
                  {editingId === category.id ? (
                    <>
                      <input
                        className="input flex-1 py-1.5 text-sm"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(category); if (e.key === 'Escape') setEditingId(null) }}
                        maxLength={50}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(category)}
                        disabled={savingEdit}
                        className="shrink-0 p-1.5 text-[#16A34A] hover:bg-green-50 rounded-lg transition-colors"
                        aria-label="Valider"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-[#1C1917] truncate">{category.name}</span>
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        className="shrink-0 p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F5F4] rounded-lg transition-colors"
                        aria-label={`Renommer ${category.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(category)}
                        className="shrink-0 p-1.5 text-[#78716C] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label={`Supprimer ${category.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Ajout */}
        <form onSubmit={handleAdd} className="shrink-0 border-t border-[#E7E5E4] px-4 py-4 sm:px-6">
          <label className="block text-xs font-medium text-[#78716C] mb-1.5">
            Nouvelle catégorie
          </label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ex: T-shirts"
              maxLength={50}
              disabled={atLimit}
            />
            <button
              type="submit"
              disabled={adding || !newName.trim() || atLimit}
              className="btn-primary shrink-0 flex items-center gap-1.5 text-sm px-3"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
          {atLimit && (
            <p className="mt-1.5 text-xs text-amber-600">
              Maximum {MAX_CATEGORIES} catégories par boutique.
            </p>
          )}
        </form>

        <div className="shrink-0 border-t border-[#E7E5E4] px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
          <button type="button" onClick={onClose} className="btn-secondary w-full">
            Fermer
          </button>
        </div>
      </div>

      {/* Confirmation suppression */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="font-semibold text-[#1C1917]">Supprimer cette catégorie ?</h3>
            <p className="text-sm text-[#78716C]">
              &quot;{confirmDelete.name}&quot; sera supprimée. Les produits qui l&apos;utilisent ne seront pas supprimés.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  )
}
