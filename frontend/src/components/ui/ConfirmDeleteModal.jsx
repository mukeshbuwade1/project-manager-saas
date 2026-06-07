import { useState, useEffect } from 'react'
import Modal from './Modal'
import Button from './Button'

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  isLoading,
}) {
  const [input, setInput] = useState('')

  useEffect(() => {
    if (!isOpen) setInput('')
  }, [isOpen])

  const matches = input === itemName

  const handleConfirm = () => {
    if (!matches) return
    onConfirm()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text-muted">{description}</p>

        <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-400">
            Type <span className="font-mono font-semibold text-red-300">{itemName}</span> to confirm.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">
            Confirm name
          </label>
          <input
            type="text"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
            placeholder={itemName}
            className="w-full px-3 py-2 text-sm rounded bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/60 transition-default"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!matches}
            loading={isLoading}
            onClick={handleConfirm}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}
