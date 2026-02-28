import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  webExt: {
    disabled: true,
  },
  manifest: {
    name: 'Peer Bridge',
    version: '0.0.0',
    description: 'Peer Bridge realtime chat via WebRTC DataChannel with WebSocket signaling.',
    permissions: ['offscreen', 'sidePanel', 'storage'],
    action: {
      default_title: 'Peer Bridge',
    },
  },
})
