import type { ReactElement } from 'react'
import { Plus } from 'lucide-react'
import { faqs } from './content'

export function FaqList(): ReactElement {
  return <div className="public-faq-list">{faqs.map(({ q, a }) => <details key={q}><summary>{q}<Plus size={20} aria-hidden="true" /></summary><p>{a}</p></details>)}</div>
}
