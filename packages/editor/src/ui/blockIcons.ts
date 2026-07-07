// Maps @forge/blocks palette icon names (plain strings; the blocks package
// stays dependency-light) to lucide components for the editor chrome.
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  BarChart3,
  CheckSquare,
  CircleCheck,
  Clapperboard,
  Expand,
  GitBranch,
  Image,
  Layers,
  LayoutGrid,
  List,
  ListCollapse,
  Minus,
  MousePointerClick,
  Quote,
  Square,
  Table,
  Type,
  Volume2,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  type: Type,
  quote: Quote,
  list: List,
  image: Image,
  "layout-grid": LayoutGrid,
  minus: Minus,
  clapperboard: Clapperboard,
  "list-collapse": ListCollapse,
  expand: Expand,
  layers: Layers,
  "mouse-pointer-click": MousePointerClick,
  "circle-check": CircleCheck,
  "bar-chart": BarChart3,
  table: Table,
  "volume-2": Volume2,
  "alert-circle": AlertCircle,
  "git-branch": GitBranch,
  "check-square": CheckSquare,
};

export function blockIcon(name: string): LucideIcon {
  return ICONS[name] ?? Square;
}
