import type { ArtKey } from "../data/stories";

// Illustrations rebuilt as inline SVG in the style of the printed book:
// simple soft shapes, pastel fills, friendly faces. Asset-free and crisp at
// any size.

interface Props {
  art: ArtKey;
  size?: number;
  className?: string;
}

export function StoryArt({ art, size = 120, className = "" }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 120 120",
    className,
    role: "img" as const,
    "aria-hidden": true,
  };

  switch (art) {
    case "cat":
      return (
        <svg {...common}>
          {/* ears */}
          <path d="M28 42 L34 20 L50 34 Z" fill="#F2A860" />
          <path d="M92 42 L86 20 L70 34 Z" fill="#F2A860" />
          {/* head */}
          <circle cx="60" cy="62" r="34" fill="#F2A860" />
          {/* muzzle */}
          <ellipse cx="60" cy="64" rx="22" ry="20" fill="#FBEFDC" />
          {/* eyes */}
          <circle cx="47" cy="56" r="3.4" fill="#4A3B31" />
          <circle cx="73" cy="56" r="3.4" fill="#4A3B31" />
          {/* nose */}
          <ellipse cx="60" cy="68" rx="4" ry="3" fill="#F19AA8" />
        </svg>
      );

    case "basketball":
      return (
        <svg {...common}>
          <circle cx="60" cy="60" r="36" fill="#F2A860" />
          <line x1="60" y1="24" x2="60" y2="96" stroke="#8A5A2B" strokeWidth="2.5" />
          <line x1="24" y1="60" x2="96" y2="60" stroke="#8A5A2B" strokeWidth="2.5" />
          <path d="M34 34 Q60 60 34 86" fill="none" stroke="#8A5A2B" strokeWidth="2.5" />
          <path d="M86 34 Q60 60 86 86" fill="none" stroke="#8A5A2B" strokeWidth="2.5" />
        </svg>
      );

    case "bird":
      return (
        <svg {...common}>
          {/* little cap (the wig!) */}
          <path d="M46 30 Q60 20 74 30 L74 34 L46 34 Z" fill="#F19AA8" />
          {/* body */}
          <ellipse cx="60" cy="66" rx="26" ry="28" fill="#7EC0EA" />
          {/* wing */}
          <ellipse cx="76" cy="68" rx="12" ry="7" fill="#B49BE0" />
          {/* beak */}
          <path d="M34 60 L46 55 L46 65 Z" fill="#F5D14E" />
          {/* eye */}
          <circle cx="52" cy="54" r="3.4" fill="#3B3630" />
          {/* feet */}
          <line x1="54" y1="93" x2="54" y2="100" stroke="#4A6E8A" strokeWidth="3" />
          <line x1="66" y1="93" x2="66" y2="100" stroke="#4A6E8A" strokeWidth="3" />
        </svg>
      );

    case "fridge":
      return (
        <svg {...common}>
          <rect
            x="34"
            y="20"
            width="52"
            height="80"
            rx="8"
            fill="#E3F5E9"
            stroke="#8FD3AC"
            strokeWidth="3"
          />
          <line x1="34" y1="44" x2="86" y2="44" stroke="#8FD3AC" strokeWidth="3" />
          {/* face */}
          <circle cx="50" cy="62" r="3.6" fill="#3B3630" />
          <circle cx="70" cy="62" r="3.6" fill="#3B3630" />
          <path d="M50 76 Q60 85 70 76" fill="none" stroke="#3B3630" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case "rainbow":
    default:
      return (
        <svg {...common}>
          <path d="M14 92 A46 46 0 0 1 106 92 Z" fill="#CDE9D8" />
          <path d="M24 92 A36 36 0 0 1 96 92 Z" fill="#CFE0F5" />
          <path d="M34 92 A26 26 0 0 1 86 92 Z" fill="#F7C9D3" />
          <path d="M44 92 A16 16 0 0 1 76 92 Z" fill="#FBDCB4" />
        </svg>
      );
  }
}
