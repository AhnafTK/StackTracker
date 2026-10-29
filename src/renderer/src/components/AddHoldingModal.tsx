import { useEffect, useState } from 'react'
import type { NewHolding, WeightUnit } from '../holdings'

interface Props {
  onAdd: (holding: NewHolding) => void
  onClose: () => void
}

const PURITY_PRESETS = ['0.9999', '0.999', '0.925', '0.9']

// Form inputs are kept as text while typing, then turned into numbers on submit.
function AddHoldingModal({ onAdd, onClose }: Props): React.JSX.Element {
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('1')
  const [unit, setUnit] = useState<WeightUnit>('oz')
  const [purity, setPurity] = useState('0.9999')
  const [quantity, setQuantity] = useState('1')
  const [pricePerItem, setPricePerItem] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Close with the Escape key.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function submit(e: React.FormEvent): void {
    e.preventDefault() // stop the browser from reloading the page

    const weightNum = Number(weight)
    const purityNum = Number(purity)
    const quantityNum = Number(quantity)
    const priceNum = Number(pricePerItem)

    if (name.trim() === '') return setError('Enter a name.')
    if (!(weightNum > 0)) return setError('Weight must be a number greater than 0.')
    if (!(purityNum > 0 && purityNum <= 1))
      return setError('Purity must be between 0 and 1, e.g. 0.9999.')
    if (!Number.isInteger(quantityNum) || quantityNum < 1)
      return setError('Quantity must be a whole number, 1 or more.')
    if (pricePerItem.trim() === '' || !(priceNum >= 0))
      return setError('Enter the price you paid per item.')

    onAdd({
      name: name.trim(),
      weight: weightNum,
      unit,
      purity: purityNum,
      quantity: quantityNum,
      pricePerItem: priceNum
    })
  }

  const inputClass =
    'w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-amber-300'
  const labelClass = 'mb-1.5 block text-xs font-medium text-neutral-400'

  return (
    // The dark backdrop. Clicking it (outside the box) closes the modal.
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl"
      >
        <h2 className="border-b border-neutral-800 px-6 py-4 text-lg font-semibold">Add holding</h2>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className={labelClass}>Name</label>
            <input
              autoFocus
              className={inputClass}
              placeholder="e.g. 1 oz DNA Silver Maple Leaf Coin"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Weight (each)</label>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
                <select
                  className={`${inputClass} w-24`}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as WeightUnit)}
                >
                  <option value="oz">oz (troy)</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div className="w-24">
              <label className={labelClass}>Quantity</label>
              <input
                className={inputClass}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Purity</label>
            <input
              className={inputClass}
              inputMode="decimal"
              value={purity}
              onChange={(e) => setPurity(e.target.value)}
            />
            <div className="mt-2 flex gap-1.5">
              {PURITY_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurity(p)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${
                    purity === p
                      ? 'border-amber-300 text-amber-300'
                      : 'border-neutral-700 text-neutral-400 hover:text-neutral-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Price paid per item (USD)</label>
            <input
              className={inputClass}
              inputMode="decimal"
              placeholder="0.00"
              value={pricePerItem}
              onChange={(e) => setPricePerItem(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-amber-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-amber-200"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddHoldingModal
