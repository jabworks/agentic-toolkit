import { type ClientModule } from 'claude-code';

// The glyph of the task being worked, breathing while a turn runs. One fixed glyph whose emphasis alternates: swapping
// glyphs of different widths shifts the row on a proportional font. Timed on the surface's own frame clock, so the hooks
// module dispatches nothing per frame.
export type PulseProps = { glyph: string; color: string };

const STEP_MS = 400;

const Pulse: ClientModule<PulseProps, boolean> = (props, surface) => {
  if (surface.state === undefined) {
    surface.every(STEP_MS, () => surface.setState(!(surface.state ?? false)));
  }

  const { Text } = surface.elements;

  return (
    <Text
      color={props.color}
      dimColor={surface.state ?? false}
    >
      {`${props.glyph} `}
    </Text>
  );
};

export default Pulse;
