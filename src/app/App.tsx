import { BrowserRouter } from 'react-router'
import { AppShell } from './AppShell'
import { SessionProvider } from './session/SessionProvider'
import { AppRoutes } from './router'

export default function App() {
  return <BrowserRouter><SessionProvider><AppShell><AppRoutes /></AppShell></SessionProvider></BrowserRouter>
}
