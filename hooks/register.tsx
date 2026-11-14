import { atom, read, update } from 'claude-code'
import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { BAND_IDLE, BAND_WORK, SCENE_IDLE, SCENE_WORK, SPINNER } from './scene.js'

const SCENE_ID = 'digital-rain'

// True while a main-loop turn runs: the backdrop switches to its overdrive scene.
const working = atom({ plugin: 'digital-rain', key: 'working' } as const, false)

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

const LOOK: ThemeSetArgs = {
  colors: theme,
  // Thin frost: the rain stays bright at the edges; the scene darkens its own middle for the words.
  backdrop: { scene: SCENE_ID, glass: { blur: 4, opacity: 0.55 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await update($, working, () => false)
    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, working, () => true)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, working, () => false)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE_ID) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const isWorking = await read($, working)

    // The desktop stills a scene (drops its SMIL, stops its CSS animation) when it judges motion
    // unwelcome, so every rain column also has a resting place of its own.
    return (
      <Svg
        source={isWorking ? SCENE_WORK : SCENE_IDLE}
        alt={isWorking ? 'Code rain racing while Claude works' : 'Green code rain falling behind the conversation'}
        isInteractive
      />
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
