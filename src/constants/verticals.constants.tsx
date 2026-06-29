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
    subtitle: "Agriculture Aerial Intelligence",
    desc: "Farm monitoring, crop health analysis, irrigation insights, organic farming advisory, and precision spraying support — powered by autonomous aerial platforms built for Indian agricultural conditions.",
    to: "/agrisky",
  },
  {
    tag: "Infrastructure",
    icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
    title: "InfraSky",
    subtitle: "Infrastructure Inspection",
    desc: "Aerial inspection for roads, bridges, buildings, telecom towers, solar farms, and industrial assets — using autonomous platforms engineered for repeatability and precision.",
  },
  {
    tag: "Mapping",
    icon: <MapIcon className="h-5 w-5" aria-hidden="true" />,
    title: "GeoSky",
    subtitle: "Mapping & Survey Intelligence",
    desc: "Aerial mapping, land survey, site progress monitoring, GIS data capture, and terrain intelligence — delivered by autonomous platforms configured for survey-grade accuracy.",
  },
  {
    tag: "Surveillance",
    icon: <Eye className="h-5 w-5" aria-hidden="true" />,
    title: "GuardSky",
    subtitle: "Aerial Surveillance & Early Fire Response",
    desc: "Real-time aerial monitoring, smoke and fire detection, live visibility, rapid alerts, and targeted first-response payload deployment for farms, industrial sites, campuses, remote facilities, and critical assets.",
    to: "/guardsky",
  },
  {
    tag: "R&D",
    icon: <FlaskConical className="h-5 w-5" aria-hidden="true" />,
    title: "TorqWings Labs",
    subtitle: "Custom Autonomous Aerial Platform R&D",
    desc: "Custom platform design, payload integration, flight testing, aerospace research, and prototype development for specialised autonomous aerial systems and mission-specific use cases.",
  },
  {
    tag: "Training",
    icon: <GraduationCap className="h-5 w-5" aria-hidden="true" />,
    title: "TorqWings Academy",
    subtitle: "Autonomous Aerial Platform Design & Intelligence",
    desc: "Hands-on training in autonomous aerial platform design, engineering, AI-powered flight intelligence, mission planning, agri-platform operations, mapping workflows, and certification support for students, farmers, operators, SHGs, FPOs, and professionals.",
    to: "/learn",
  },
];
