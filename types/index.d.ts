/** Whether a main-loop turn runs: the backdrop draws its overdrive scene while true. */
export type DigitalRainWorking = boolean

declare module 'claude-code' {
  interface PluginState {
    'digital-rain': { working: DigitalRainWorking }
  }
}
