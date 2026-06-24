import { Sprout, Building2, Map as MapIcon, Eye, FlaskConical, GraduationCap } from "lucide-react";

export type VerticalDatum = {
  tag: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  desc: string;
  accent?: "agri";
  to?: string;
};

export const VERTICALS: VerticalDatum[] = [
  {
    accent: "agri",
    tag: "Agriculture",
    icon: <Sprout className="h-5 w-5" aria-hidden="true" />,
    title: "AgriSky",
    subtitle: "Agriculture Drone Intelligence",
    desc: "Drone-based farm monitoring, crop health analysis, irrigation insights, organic farming advisory, and future precision spraying support.",
    to: "/agrisky",
  },
  {
    tag: "Infrastructure",
    icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
    title: "InfraSky",
    subtitle: "Infrastructure Inspection",
    desc: "Drone-based inspection for roads, bridges, buildings, telecom towers, solar farms, and industrial assets.",
  },
  {
    tag: "Mapping",
    icon: <MapIcon className="h-5 w-5" aria-hidden="true" />,
    title: "GeoSky",
    subtitle: "Mapping & Survey Intelligence",
    desc: "Aerial mapping, land survey, site progress monitoring, GIS data capture, and terrain intelligence.",
  },
  {
    tag: "Surveillance",
    icon: <Eye className="h-5 w-5" aria-hidden="true" />,
    title: "GuardSky",
    subtitle: "Aerial Surveillance & Early Fire Response",
    desc: "Drone-based real-time monitoring, smoke/fire detection support, live aerial visibility, rapid alerts, and targeted first-response payload deployment for farms, industrial sites, campuses, remote facilities, and critical assets.",
    to: "/guardsky",
  },
  {
    tag: "R&D",
    icon: <FlaskConical className="h-5 w-5" aria-hidden="true" />,
    title: "TorqWings Labs",
    subtitle: "Custom UAV R&D",
    desc: "Custom drone design, payload integration, flight testing, aerospace research, and prototype development for specialized use cases.",
  },
  {
    tag: "Training",
    icon: <GraduationCap className="h-5 w-5" aria-hidden="true" />,
    title: "TorqWings Academy",
    subtitle: "Drone Pilot Training & Certification Support",
    desc: "Practical drone pilot training, safety procedures, mission planning, agri-drone operations, mapping workflows, and certification support for students, farmers, drone operators, SHGs, FPOs, and professionals.",
    to: "/academy",
  },
];
