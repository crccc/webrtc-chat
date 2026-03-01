import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/sidepanel/App.css'
import App from '../../src/sidepanel/App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Missing root element for sidepanel entrypoint')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
