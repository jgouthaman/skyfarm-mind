export type NavLink = {
  label: string;
  to: string;
};

export const NAV_LINKS: NavLink[] = [
  { label: "Home",         to: "/"             },
  { label: "Solutions",    to: "/solutions"    },
  { label: "Industries",   to: "/industries"   },
  { label: "Technology",   to: "/technology"   },
  { label: "Design Studio",to: "/design-studio"},
  { label: "Work with us", to: "/pilots"       },
  { label: "Academy",      to: "/academy"      },
  { label: "About",        to: "/about"        },
  { label: "Contact",      to: "/contact"      },
];
