import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { BAND_IDLE, BAND_WORK, SCENE_IDLE, SCENE_WORK, SPINNER } from './scene.js'

// Two scene names, as the official theme examples do it: the overdrive is its own scene, set while a main turn runs.
const SCENE_ID = 'digital-rain'
const WORK_ID = 'digital-rain-work'

// Dark: phosphor green on a near-black terminal. Light: green-bar printout paper.
const { theme, problems } = makeColors({
  label: 'Digital Rain',
  id: 'digital-rain',
  roles: { accent: '#2bff7a', danger: '#ff4d5e', success: '#a6e22e', warning: '#ffb000', pro: '#29d3ff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#030a06',
        'surface-1': '#07120c',
        'surface-2': '#0b1811',
        'surface-3': '#102017',
        'text-primary': '#d2fadc',
        'text-secondary': '#9bdcae',
        'text-muted': '#6fae84',
      },
    },
    git: { added: '#2bff7a', removed: '#ff4d5e', modified: '#ffb000' },
  },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e1eadd',
        'surface-1': '#e9f0e6',
        'surface-2': '#f2f6f0',
        'text-primary': '#06200f',
        'text-secondary': '#1f4429',
        'text-muted': '#365c41',
      },
    },
    roles: { accent: '#0f8a3c', danger: '#c22a36', success: '#4f7d10', warning: '#a86a00', pro: '#0b7fa6' },
  },
})

// Thin frost: the rain stays bright at the edges; the scene darkens its own middle for the words.
const look = (scene: string): ThemeSetArgs => ({ colors: theme, backdrop: { scene, glass: { blur: 4, opacity: 0.55 } } })

async function show($: EngineInterface, scene: string): Promise<void> {
  // The answer at session start often says no window has attached yet; the window draws the look
  // when it attaches, so that answer is not worth a status line.
  await $.theme.set(look(scene))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await show($, SCENE_ID)

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await show($, WORK_ID)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await show($, SCENE_ID)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const scene = e.props.scene
    if (e.surface !== 'desktop' || (scene !== SCENE_ID && scene !== WORK_ID)) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return scene === WORK_ID ? (
      <Svg isInteractive alt="Code rain racing while Claude works" source={SCENE_WORK} />
    ) : (
      <Svg isInteractive alt="Green code rain falling behind the conversation" source={SCENE_IDLE} />
    )
  })

  // The band above the prompt: a hacker readout that goes busy while a turn runs. It yields
  // to a survey, and draws nothing in the terminal.
  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.hasSurvey) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return e.props.isWorking ? (
      <Svg source={BAND_WORK} alt="Decrypting: hex ticker, spectrum and load meter racing" />
    ) : (
      <Svg source={BAND_IDLE} alt="Link secure: hex ticker, spectrum and load meter idling" />
    )
  })

  // The working row on the desktop: a scrambling hex strip, then what the step is doing.
  on('ui.render', { component: 'Spinner' }, ($, e, next) => {
    if (e.surface !== 'desktop') {
      return next(e)
    }
    const { Box, Svg, Text } = $.ui.resolve(e)
    const label = e.props.message ?? e.props.word

    return (
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Svg source={SPINNER} alt="Decrypting" width={220} height={22} />
        <Text mono dimColor>{`> ${label}_`}</Text>
      </Box>
    )
  })
}
