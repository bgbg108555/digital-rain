import { expect, test } from 'claude-code/testing'

import { SCENE_IDLE, SCENE_WORK } from '../hooks/scene.js'

const BACKDROP = {
  plugin: 'digital-rain',
  component: 'Backdrop',
  requestId: 'theme',
  props: { scene: 'digital-rain', plugin: 'digital-rain', glass: { blur: 4, opacity: 0.55 } },
} as const

const SPINNER = {
  plugin: 'digital-rain',
  component: 'Spinner',
  requestId: 'spinner',
  props: { word: 'Creating notes.md', message: null, suffix: '…', mode: 'tool-use' },
} as const

test('the backdrop races while a main turn runs and settles when it ends', async ($, on) => {
  const scenes: string[] = []
  on('theme.set', (_, e) => {
    scenes.push(String(e.backdrop?.scene))

    return { value: { isDrawn: true, requestId: 'theme' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))

  const source = async (scene: string) => {
    const ui = await $.ui.mount({ ...BACKDROP, props: { ...BACKDROP.props, scene }, surface: 'desktop' })
    const svg = await ui.find({ type: 'Svg' })
    await ui.unmount()

    return svg?.props.source
  }

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't1' })
  // A subagent's turn ending inside the main turn leaves the overdrive on.
  await $.turn.complete({ answer: '', durationMs: 5, isAborted: false, turnId: 's1', agentId: 'a1', reason: 'answer' })
  await $.turn.complete({ answer: '', durationMs: 9, isAborted: false, turnId: 't1', reason: 'answer' })
  expect(scenes).toEqual(['digital-rain', 'digital-rain-work', 'digital-rain'])

  expect(await source('digital-rain')).toBe(SCENE_IDLE)
  expect(await source('digital-rain-work')).toBe(SCENE_WORK)
})

test('the working row is a scrambling strip and the step, on the desktop alone', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const desk = await $.ui.mount({ ...SPINNER, surface: 'desktop' })
  expect(await desk.find({ type: 'Svg' })).toBeDefined()
  expect((await desk.find({ type: 'Text', text: /notes/ }))?.text).toBe('> Creating notes.md_')
  await desk.unmount()

  const term = await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  expect(await term.find({ type: 'Svg' })).toBeUndefined()
  expect((await term.find({ type: 'Text' }))?.text).toBe('engine')
  await term.unmount()
})
