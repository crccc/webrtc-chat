import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Peer Bridge',
    version: '0.0.0',
    description: 'Peer Bridge realtime chat via WebRTC DataChannel with WebSocket signaling.',
    permissions: ['sidePanel', 'storage'],
    action: {
      default_title: 'Peer Bridge',
    },
  },
})
