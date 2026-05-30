export type CategoryConfig = {
  icon: string   // Tabler icon name, e.g. 'ti-home' — render as: className="ti ti-home"
  bg: string     // 50-stop fill — badge / chip background
  iconBg: string // 200-stop fill — icon circle background, chart slice color
  text: string   // 800-stop — text and icon color
}

const COLORS = {
  purple: { bg: '#EEEDFE', iconBg: '#AFA9EC', text: '#3C3489' },
  blue:   { bg: '#E6F1FB', iconBg: '#85B7EB', text: '#0C447C' },
  amber:  { bg: '#FAEEDA', iconBg: '#EF9F27', text: '#7C3F00' },
  green:  { bg: '#EAF3DE', iconBg: '#97C459', text: '#27500A' },
  coral:  { bg: '#FAECE7', iconBg: '#F0997B', text: '#712B13' },
  pink:   { bg: '#FBEAF0', iconBg: '#ED93B1', text: '#72243E' },
  teal:   { bg: '#E1F5EE', iconBg: '#5DCAA5', text: '#085041' },
  gray:   { bg: '#F1EFE8', iconBg: '#B4B2A9', text: '#444441' },
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // Fixed / recurring
  'Rent':          { icon: 'ti-home',           ...COLORS.purple },
  'Gas Bill':      { icon: 'ti-flame',          ...COLORS.amber  },
  'Electricity':   { icon: 'ti-bolt',           ...COLORS.amber  },
  'Water':         { icon: 'ti-droplet',        ...COLORS.blue   },
  'Wifi':          { icon: 'ti-wifi',           ...COLORS.blue   },
  'Car Insurance': { icon: 'ti-car',            ...COLORS.purple },
  'Subscriptions': { icon: 'ti-device-tv',      ...COLORS.pink   },
  'Transit':       { icon: 'ti-bus',            ...COLORS.purple },
  // Variable / daily
  'Groceries':     { icon: 'ti-shopping-bag',   ...COLORS.green  },
  'Dining':        { icon: 'ti-tools-kitchen-2',...COLORS.coral  },
  'Clothing':      { icon: 'ti-shirt',          ...COLORS.pink   },
  'Social':        { icon: 'ti-users',          ...COLORS.teal   },
  'Home':          { icon: 'ti-sofa',           ...COLORS.purple },
  'Entertainment': { icon: 'ti-music',          ...COLORS.pink   },
  'Other':         { icon: 'ti-dots',           ...COLORS.gray   },
}

const DEFAULT: CategoryConfig = { icon: 'ti-tag', ...COLORS.gray }

export function getCategoryConfig(category: string): CategoryConfig {
  return CATEGORY_CONFIG[category] ?? DEFAULT
}
