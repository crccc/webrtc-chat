import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/App.css'
import App from '../../src/App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Missing root element for sidepanel entrypoint')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
