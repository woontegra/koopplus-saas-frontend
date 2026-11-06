import { forwardRef, useLayoutEffect, useRef } from 'react'
import type { InputHTMLAttributes, Ref } from 'react'
import { formatMoneyInputFinal, formatMoneyInputLive } from '@shared/moneyInput'

interface MoneyAmountInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  value: string
  onValueChange: (value: string) => void
}

function digitsBefore(text: string, end: number): number {
  let count = 0
  const limit = Math.min(end, text.length)
  for (let i = 0; i < limit; i += 1) {
    if (text[i] >= '0' && text[i] <= '9') count += 1
  }
  return count
}

function caretAfterDigits(text: string, digits: number): number {
  if (digits <= 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] >= '0' && text[i] <= '9') {
      seen += 1
      if (seen >= digits) return i + 1
    }
  }
  return text.length
}

function assignRef(ref: Ref<HTMLInputElement> | undefined, node: HTMLInputElement | null): void {
  if (typeof ref === 'function') ref(node)
  else if (ref) (ref as { current: HTMLInputElement | null }).current = node
}

const MoneyAmountInput = forwardRef<HTMLInputElement, MoneyAmountInputProps>(function MoneyAmountInput(
  { value, onValueChange, onBlur, onPaste, ...rest },
  forwardedRef
): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const caretDigits = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el || document.activeElement !== el || caretDigits.current == null) return
    const pos = caretAfterDigits(value, caretDigits.current)
    el.setSelectionRange(pos, pos)
    caretDigits.current = null
  }, [value])

  return (
    <input
      {...rest}
      ref={(node) => {
        ;(inputRef as { current: HTMLInputElement | null }).current = node
        assignRef(forwardedRef, node)
      }}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(event) => {
        const inputType = (event.nativeEvent as InputEvent).inputType
        const raw = event.target.value
        caretDigits.current = digitsBefore(raw, event.target.selectionStart ?? raw.length)
        const next =
          inputType === 'insertFromPaste' ? formatMoneyInputFinal(raw) : formatMoneyInputLive(raw)
        onValueChange(next)
      }}
      onBlur={(event) => {
        onValueChange(formatMoneyInputFinal(event.target.value))
        onBlur?.(event)
      }}
      onPaste={(event) => {
        const text = event.clipboardData.getData('text')
        if (text) {
          event.preventDefault()
          caretDigits.current = Number.MAX_SAFE_INTEGER
          onValueChange(formatMoneyInputFinal(text))
        }
        onPaste?.(event)
      }}
    />
  )
})

export default MoneyAmountInput
