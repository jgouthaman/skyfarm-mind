export type NavLink = {
  label: string;
  to: string;
};

export const NAV_LINKS: NavLink[] = [
  { label: "Home",       to: "/"          },
  { label: "The Hangar", to: "/the-hangar"},
  { label: "Services",   to: "/services"  },
  { label: "About",      to: "/about"     },
  { label: "Contact",    to: "/contact"   },
];
