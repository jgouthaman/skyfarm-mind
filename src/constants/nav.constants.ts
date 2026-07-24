export type NavLink = {
  label: string;
  to: string;
};

export const NAV_LINKS: NavLink[] = [
  { label: "Home",         to: "/"             },
  { label: "Solutions",    to: "/solutions"    },
  { label: "Technology",   to: "/technology"   },
  { label: "Design Studio",to: "/design-studio"},
  { label: "Academy",      to: "/learn"        },
  { label: "About",        to: "/about"        },
  { label: "Contact",      to: "/contact"      },
];
