import type { SwitchIcon } from '../../types/switches';

/**
 * SVG icon strings for switch types.
 * Returns inline SVG (20x20) for use with dangerouslySetInnerHTML.
 */
export function getSwitchIconSvg(icon: SwitchIcon): string {
  const attr = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  switch (icon) {
    case 'lightbulb':
      return `<svg ${attr}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>`;
    case 'nav-light':
      return `<svg ${attr}><polygon points="12 2 2 22 22 22"/></svg>`;
    case 'anchor-light':
      return `<svg ${attr}><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`;
    case 'spotlight':
      return `<svg ${attr}><path d="M12 2v4"/><path d="m6.34 6.34 2.83 2.83"/><path d="M2 12h4"/><path d="m17.66 6.34-2.83 2.83"/><path d="M22 12h-4"/><path d="M12 12v8"/><path d="m8 20 4-4 4 4"/></svg>`;
    case 'pump':
      return `<svg ${attr}><circle cx="12" cy="12" r="6"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/></svg>`;
    case 'water-pump':
      return `<svg ${attr}><path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M2 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><circle cx="12" cy="6" r="3"/></svg>`;
    case 'bilge-pump':
      return `<svg ${attr}><path d="M2 16c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><rect x="6" y="2" width="12" height="10" rx="2"/><path d="M12 12v4"/></svg>`;
    case 'fan':
      return `<svg ${attr}><path d="M12 12c-3-5-8-3-8 1s5 8 8 4"/><path d="M12 12c5-3 3-8-1-8s-8 5-4 8"/><path d="M12 12c3 5 8 3 8-1s-5-8-8-4"/><path d="M12 12c-5 3-3 8 1 8s8-5 4-8"/><circle cx="12" cy="12" r="1"/></svg>`;
    case 'horn':
      return `<svg ${attr}><path d="M2 15V9"/><path d="m6 9 6-4v14l-6-4"/><path d="M18 8a6 6 0 0 1 0 8"/><path d="M22 6a10 10 0 0 1 0 12"/></svg>`;
    case 'heater':
      return `<svg ${attr}><path d="M4 14c0-4.4 3.6-8 8-8s8 3.6 8 8"/><path d="M4 14h16"/><path d="M8 18v2"/><path d="M16 18v2"/><path d="M9 6c0-1.7 1.3-3 3-3s3 1.3 3 3"/></svg>`;
    case 'fridge':
      return `<svg ${attr}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="8" y1="6" x2="8" y2="6.01"/><line x1="8" y1="14" x2="8" y2="14.01"/></svg>`;
    case 'inverter':
      return `<svg ${attr}><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h2l2-4 2 8 2-4h2"/></svg>`;
    case 'outlet':
      return `<svg ${attr}><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M9 16c1.5 1 4.5 1 6 0"/></svg>`;
    case 'radio':
      return `<svg ${attr}><rect x="2" y="8" width="20" height="14" rx="2"/><path d="m6 8 8-5"/><circle cx="14" cy="15" r="3"/><line x1="6" y1="13" x2="6.01" y2="13"/><line x1="6" y1="17" x2="6.01" y2="17"/></svg>`;
    case 'generic':
    default:
      return `<svg ${attr}><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>`;
  }
}
