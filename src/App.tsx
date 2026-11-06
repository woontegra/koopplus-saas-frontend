import { BrowserRouter } from 'react-router-dom'
import AppShell from './components/layout/AppShell'

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
