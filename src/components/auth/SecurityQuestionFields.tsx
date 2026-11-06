import {
  SECURITY_QUESTION_CUSTOM,
  SECURITY_QUESTION_PRESETS
} from '@shared/securityQuestions'

export interface SecurityQuestionFormValues {
  security_question: string
  security_question_custom: string
  security_answer: string
}

export const EMPTY_SECURITY_QUESTION_FORM: SecurityQuestionFormValues = {
  security_question: SECURITY_QUESTION_PRESETS[0],
  security_question_custom: '',
  security_answer: ''
}

interface SecurityQuestionFieldsProps {
  values: SecurityQuestionFormValues
  onChange: (values: SecurityQuestionFormValues) => void
  answerAutoComplete?: string
}

export default function SecurityQuestionFields({
  values,
  onChange,
  answerAutoComplete = 'off'
}: SecurityQuestionFieldsProps): JSX.Element {
  const isCustom = values.security_question === SECURITY_QUESTION_CUSTOM

  return (
    <>
      <div className="form-group form-group--wide">
        <label>Güvenlik Sorusu *</label>
        <select
          value={values.security_question}
          onChange={(e) =>
            onChange({
              ...values,
              security_question: e.target.value,
              security_question_custom:
                e.target.value === SECURITY_QUESTION_CUSTOM ? values.security_question_custom : ''
            })
          }
        >
          {SECURITY_QUESTION_PRESETS.map((question) => (
            <option key={question} value={question}>
              {question}
            </option>
          ))}
          <option value={SECURITY_QUESTION_CUSTOM}>Kendi sorumu yazmak istiyorum</option>
        </select>
      </div>

      {isCustom && (
        <div className="form-group form-group--wide">
          <label>Güvenlik Sorusu Yazın *</label>
          <input
            value={values.security_question_custom}
            onChange={(e) =>
              onChange({ ...values, security_question_custom: e.target.value })
            }
            placeholder="Kendi güvenlik sorunuzu yazın"
          />
        </div>
      )}

      <div className="form-group form-group--wide">
        <label>Güvenlik Cevabı *</label>
        <input
          value={values.security_answer}
          onChange={(e) => onChange({ ...values, security_answer: e.target.value })}
          autoComplete={answerAutoComplete}
        />
      </div>
    </>
  )
}

export function resolveInitialSecurityQuestion(
  storedQuestion: string | null | undefined
): SecurityQuestionFormValues {
  if (!storedQuestion?.trim()) {
    return EMPTY_SECURITY_QUESTION_FORM
  }

  const question = storedQuestion.trim()
  if ((SECURITY_QUESTION_PRESETS as readonly string[]).includes(question)) {
    return {
      security_question: question,
      security_question_custom: '',
      security_answer: ''
    }
  }

  return {
    security_question: SECURITY_QUESTION_CUSTOM,
    security_question_custom: question,
    security_answer: ''
  }
}
