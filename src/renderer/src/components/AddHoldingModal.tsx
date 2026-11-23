import { useEffect, useState } from 'react'
import {
  dollarsToCents,
  formatMoney,
  holdingValue,
  type Form,
  type Holding,
  type Metal,
  type NewHolding,
  type SpotPrices,
  type WeightUnit
} from '../holdings'

interface Props {
  /** Pass a holding to edit it; leave undefined to add a new one. */
  initialHolding?: Holding
  prices: SpotPrices | null
  onSave: (holding: NewHolding) => void
  /** Only passed when editing: deletes the holding being edited. */
  onDelete?: () => void
  onClose: () => void
}

interface Preset {
  label: string
  name: string
  form: Form
  weight: string
  unit: WeightUnit
  purity: string
}

// Common coins and bars. Picking one fills in the name, type, weight and purity.
// Gold Eagles and Krugerrands are 22K (0.9167) alloy, so they weigh 1.0909 oz
// in total to hold exactly 1 oz of pure gold.
const PRESETS: Record<Metal, Preset[]> = {
  silver: [
    {
      label: 'Silver Eagle',
      name: 'American Silver Eagle',
      form: 'coin',
      weight: '1',
      unit: 'oz',
      purity: '0.999'
    },
    {
      label: 'Maple Leaf',
      name: 'Silver Maple Leaf',
      form: 'coin',
      weight: '1',
      unit: 'oz',
      purity: '0.9999'
    },
    {
      label: '1 oz Round',
      name: '1 oz Silver Round',
      form: 'round',
      weight: '1',
      unit: 'oz',
      purity: '0.999'
    },
    {
      label: '10 oz Bar',
      name: '10 oz Silver Bar',
      form: 'bar',
      weight: '10',
      unit: 'oz',
      purity: '0.999'
    }
  ],
  gold: [
    {
      label: 'Gold Maple',
      name: 'Gold Maple Leaf',
      form: 'coin',
      weight: '1',
      unit: 'oz',
      purity: '0.9999'
    },
    {
      label: 'Gold Eagle',
      name: 'American Gold Eagle',
      form: 'coin',
      weight: '1.0909',
      unit: 'oz',
      purity: '0.9167'
    },
    {
      label: 'Krugerrand',
      name: 'Krugerrand',
      form: 'coin',
      weight: '1.0909',
      unit: 'oz',
      purity: '0.9167'
    },
    {
      label: '1 oz Bar',
      name: '1 oz Gold Bar',
      form: 'bar',
      weight: '1',
      unit: 'oz',
      purity: '0.9999'
    }
  ]
}

const FORMS: Array<{ value: Form; label: string }> = [
  { value: 'coin', label: 'Coin' },
  { value: 'bar', label: 'Bar' },
  { value: 'round', label: 'Round' }
]

const UNIT_LABEL: Record<WeightUnit, string> = { oz: 'oz t', g: 'g', kg: 'kg' }

function today(): string {
  // 'en-CA' formats dates as YYYY-MM-DD, which is what <input type="date"> uses.
  return new Date().toLocaleDateString('en-CA')
}

// Form inputs are kept as text while typing, then turned into numbers on submit.
function AddHoldingModal({
  initialHolding,
  prices,
  onSave,
  onDelete,
  onClose
}: Props): React.JSX.Element {
  const first = PRESETS.silver[0]
  const [metal, setMetal] = useState<Metal>(initialHolding?.metal ?? 'silver')
  const [name, setName] = useState(initialHolding?.name ?? first.name)
  const [form, setForm] = useState<Form>(initialHolding?.form ?? first.form)
  const [weight, setWeight] = useState(String(initialHolding?.weight ?? first.weight))
  const [unit, setUnit] = useState<WeightUnit>(initialHolding?.unit ?? first.unit)
  const [purity, setPurity] = useState(String(initialHolding?.purity ?? first.purity))
  const [quantity, setQuantity] = useState(String(initialHolding?.quantity ?? 1))
  const [pricePerItem, setPricePerItem] = useState(
    initialHolding ? (initialHolding.pricePerItemCents / 100).toFixed(2) : ''
  )
  const [purchaseDate, setPurchaseDate] = useState(
    initialHolding ? (initialHolding.purchaseDate ?? '') : today()
  )
  const [error, setError] = useState<string | null>(null)
  // Deleting takes two clicks: "Delete", then "Yes, delete".
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Close with the Escape key.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // A preset is highlighted when the form still matches it exactly; otherwise "Custom" is.
  function matchingPreset(m: Metal): Preset | undefined {
    return PRESETS[m].find(
      (p) => p.name === name && p.weight === weight && p.unit === unit && p.purity === purity
    )
  }
  const activePreset = matchingPreset(metal)

  function applyPreset(p: Preset): void {
    setName(p.name)
    setForm(p.form)
    setWeight(p.weight)
    setUnit(p.unit)
    setPurity(p.purity)
  }

  function chooseCustom(): void {
    if (activePreset) setName('')
  }

  function chooseMetal(m: Metal): void {
    if (m === metal) return
    // Switch to the new metal's first preset, unless the user has typed their own details.
    if (activePreset || name.trim() === '') applyPreset(PRESETS[m][0])
    setMetal(m)
  }

  function changeQuantity(by: number): void {
    const current = Number.parseInt(quantity, 10) || 0
    setQuantity(String(Math.max(1, current + by)))
  }

  // Numbers for the live "value at spot" preview. null if the inputs aren't valid yet.
  const weightNum = Number(weight)
  const purityNum = Number(purity)
  const quantityNum = Number(quantity)
  const priceNum = Number(pricePerItem)
  const detailsValid =
    weightNum > 0 &&
    purityNum > 0 &&
    purityNum <= 1 &&
    Number.isInteger(quantityNum) &&
    quantityNum >= 1
  const priceValid = pricePerItem.trim() !== '' && priceNum >= 0

  const value =
    detailsValid && prices
      ? holdingValue(
          { metal, weight: weightNum, unit, purity: purityNum, quantity: quantityNum },
          prices
        )
      : null
  const paid = detailsValid && priceValid ? priceNum * quantityNum : null
  const gain = value !== null && paid !== null ? value - paid : null
  const gainPct = gain !== null && paid ? (gain / paid) * 100 : null

  function submit(e: React.FormEvent): void {
    e.preventDefault() // stop the browser from reloading the page

    if (name.trim() === '') return setError('Enter a name.')
    if (!(weightNum > 0)) return setError('Weight must be a number greater than 0.')
    if (!(purityNum > 0 && purityNum <= 1))
      return setError('Purity must be between 0 and 1, e.g. 0.9999.')
    if (!Number.isInteger(quantityNum) || quantityNum < 1)
      return setError('Quantity must be a whole number, 1 or more.')
    if (!priceValid) return setError('Enter the price you paid per item.')

    onSave({
      metal,
      form,
      name: name.trim(),
      weight: weightNum,
      unit,
      purity: purityNum,
      quantity: quantityNum,
      pricePerItemCents: dollarsToCents(priceNum),
      purchaseDate: purchaseDate || null
    })
  }

  // Shared look for inputs. `boxClass` is the border and background; `fieldClass`
  // adds the padding for a plain input. Boxes with a prefix, suffix or buttons
  // inside them use `boxClass` and put the padding on the inner input instead.
  const boxClass =
    'w-full rounded-lg border border-neutral-800 bg-neutral-950/70 text-sm text-neutral-100 outline-none transition focus:border-amber-300/80 focus-within:border-amber-300/80'
  const fieldClass = `${boxClass} px-3 py-2.5`
  const labelClass = 'mb-2 block text-xs text-neutral-400'

  return (
    // The dark backdrop. Clicking it (outside the box) closes the modal.
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-black/60 p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={submit}
        noValidate
        className="w-full max-w-[35rem] rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {initialHolding ? 'Edit holding' : 'Add holding'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* Metal */}
          <div>
            <span className={labelClass}>Metal</span>
            <div className="grid grid-cols-2 gap-3">
              {(['silver', 'gold'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => chooseMetal(m)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    metal === m
                      ? 'border-amber-300/60 bg-amber-300/10'
                      : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700'
                  }`}
                >
                  <span
                    className={`h-6 w-6 shrink-0 rounded-full bg-gradient-to-br ${
                      m === 'gold'
                        ? 'from-yellow-100 to-amber-500'
                        : 'from-neutral-100 to-neutral-500'
                    }`}
                  />
                  <span className="font-medium">{m === 'gold' ? 'Gold' : 'Silver'}</span>
                  <span className="ml-auto font-mono text-sm text-neutral-400">
                    {prices ? formatMoney(prices[m]) : '—'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <span className={labelClass}>Start from a preset</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS[metal].map((p) => (
                <Chip key={p.label} active={activePreset === p} onClick={() => applyPreset(p)}>
                  {p.label}
                </Chip>
              ))}
              <Chip active={!activePreset} onClick={chooseCustom}>
                Custom
              </Chip>
            </div>
          </div>

          {/* Name and type */}
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <label className={labelClass} htmlFor="holding-name">
                Name
              </label>
              <input
                id="holding-name"
                autoFocus
                className={fieldClass}
                placeholder="e.g. 1 oz DNA Silver Maple Leaf Coin"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <span className={labelClass}>Type</span>
              <div className={`${boxClass} flex gap-1 p-1`} role="radiogroup" aria-label="Type">
                {FORMS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={form === f.value}
                    onClick={() => setForm(f.value)}
                    className={`rounded-md px-3 py-1.5 text-sm transition ${
                      form === f.value
                        ? 'bg-neutral-800 font-medium text-white'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Weight, purity, quantity */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass} htmlFor="holding-weight">
                Weight
              </label>
              <div className={`${boxClass} flex items-center gap-1 px-3`}>
                <input
                  id="holding-weight"
                  className="w-full min-w-0 bg-transparent py-2.5 outline-none"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
                <select
                  aria-label="Weight unit"
                  className="cursor-pointer appearance-none bg-transparent text-right text-neutral-500 outline-none hover:text-neutral-300"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as WeightUnit)}
                >
                  {(Object.keys(UNIT_LABEL) as WeightUnit[]).map((u) => (
                    <option key={u} value={u} className="bg-neutral-900">
                      {UNIT_LABEL[u]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="holding-purity">
                Purity
              </label>
              <input
                id="holding-purity"
                className={fieldClass}
                inputMode="decimal"
                value={purity}
                onChange={(e) => setPurity(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="holding-quantity">
                Quantity
              </label>
              <div className={`${boxClass} flex items-center gap-1 p-1.5`}>
                <StepButton label="Decrease quantity" onClick={() => changeQuantity(-1)}>
                  −
                </StepButton>
                <input
                  id="holding-quantity"
                  className="w-full min-w-0 bg-transparent text-center outline-none"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <StepButton label="Increase quantity" onClick={() => changeQuantity(1)}>
                  +
                </StepButton>
              </div>
            </div>
          </div>

          {/* Price and date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="holding-price">
                Price paid (each)
              </label>
              <div className={`${boxClass} flex items-center gap-1.5 px-3`}>
                <span className="text-neutral-100">$</span>
                <input
                  id="holding-price"
                  className="w-full min-w-0 bg-transparent py-2.5 outline-none"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={pricePerItem}
                  onChange={(e) => setPricePerItem(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="holding-date">
                Purchase date
              </label>
              <input
                id="holding-date"
                type="date"
                className={`${fieldClass} [color-scheme:dark]`}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          {/* Live value preview */}
          <div className="flex items-end justify-between rounded-xl bg-neutral-950/70 px-4 py-4">
            <div>
              <p className="text-sm text-neutral-400">Value at spot</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {value === null ? '—' : formatMoney(value)}
              </p>
            </div>
            {paid !== null && (
              <div className="text-right text-sm tabular-nums">
                <p className="text-neutral-400">vs. paid {formatMoney(paid)}</p>
                {gain !== null && (
                  <p
                    className={`mt-1 font-medium ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {signed(gain, formatMoney(Math.abs(gain)))}
                    {gainPct !== null &&
                      ` (${signed(gainPct, `${Math.abs(gainPct).toFixed(1)}%`)})`}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {confirmingDelete && onDelete ? (
          // While confirming a delete, this replaces the normal buttons.
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-red-500/10 px-4 py-3">
            <p className="mr-auto text-sm text-red-200">Delete this holding for good?</p>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="shrink-0 whitespace-nowrap rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400"
            >
              Yes, delete
            </button>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-end gap-3">
            {onDelete && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="mr-auto rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-300 px-5 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-amber-200"
            >
              {initialHolding ? 'Save changes' : 'Add to stack'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

/** Adds a + or − sign in front of an already-formatted absolute value. */
function signed(n: number, absText: string): string {
  return `${n >= 0 ? '+' : '−'}${absText}`
}

function Chip({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? 'border-amber-300/70 bg-amber-300/15 text-amber-300'
          : 'border-neutral-800 bg-neutral-950/70 text-neutral-300 hover:border-neutral-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function StepButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
    >
      {children}
    </button>
  )
}

export default AddHoldingModal
