type Color = "b" | "w";
type Dir = "left_up" | "left_down" | "right_up" | "right_down";

import b_left_up    from "../assets/arrows/b_left_up.svg?url";
import b_left_down  from "../assets/arrows/b_left_down.svg?url";
import b_right_up   from "../assets/arrows/b_right_up.svg?url";
import b_right_down from "../assets/arrows/b_right_down.svg?url";
import w_left_up    from "../assets/arrows/w_left_up.svg?url";
import w_left_down  from "../assets/arrows/w_left_down.svg?url";
import w_right_up   from "../assets/arrows/w_right_up.svg?url";
import w_right_down from "../assets/arrows/w_right_down.svg?url";

const MAP: Record<Color, Record<Dir, string>> = {
  b: {
    left_up: b_left_up,
    left_down: b_left_down,
    right_up: b_right_up,
    right_down: b_right_down,
  },
  w: {
    left_up: w_left_up,
    left_down: w_left_down,
    right_up: w_right_up,
    right_down: w_right_down,
  },
};

export function ArrowImg({
  color,
  dir,
  size = 44,
}: {
  color: Color;
  dir: Dir;
  size?: number;
}) {
  const src = MAP[color][dir];
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={`${color}_${dir}`}
      draggable={false}
      className="select-none"
    />
  );
}

export type { Color, Dir };
