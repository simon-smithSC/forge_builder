// Components: surfaces and feedback (Card, Dialog, Popover/Menu, Tooltip,
// Drawer, Progress, EmptyState/Skeleton, Toast).
import type { ReactElement } from "react";
import { useState } from "react";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Checkbox } from "../components/Checkbox.js";
import { Dialog } from "../components/Dialog.js";
import { Drawer } from "../components/Drawer.js";
import { EmptyState } from "../components/EmptyState.js";
import { Icon } from "../components/Icon.js";
import { IconButton } from "../components/IconButton.js";
import { Input } from "../components/Input.js";
import { Menu, MenuItem, MenuSeparator } from "../components/Menu.js";
import { Popover } from "../components/Popover.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { ProgressRing } from "../components/ProgressRing.js";
import { Skeleton } from "../components/Skeleton.js";
import { toast, ToastHost } from "../components/Toast.js";
import { Tooltip } from "../components/Tooltip.js";
import { DemoRow, Section, Spec } from "./shared.js";

export function OverlaysSection(): ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [progress, setProgress] = useState(64);

  return (
    <Section
      id="overlays"
      title="Components: surfaces & feedback"
      lede="Surfaces climb the elevation ladder (1 cards, 2 raised, 3 popovers, 4 dialogs and toasts); feedback components speak through the status ramps."
    >
      <Spec
        title="Card"
        anatomy="Raised surface, radius-lg, inset-lg padding, elevation prop 0-4. Interactive cards lift one step on hover and take the focus ring when focusable."
        doText="Pick the elevation from the ladder: 1 resting cards, 2 raised or sticky."
        dontText="No borders faking depth on a card; the elevation scale is the depth language."
      >
        <DemoRow label="Variants" style={{ alignItems: "stretch" }}>
          <Card elevation={1} style={{ width: "11rem" }}>
            <strong>Static</strong>
            <div className="an-type-paragraph-small" style={{ color: "var(--an-text-secondary)" }}>
              elevation 1
            </div>
          </Card>
          <Card elevation={2} interactive tabIndex={0} style={{ width: "11rem" }}>
            <strong>Interactive</strong>
            <div className="an-type-paragraph-small" style={{ color: "var(--an-text-secondary)" }}>
              hover lifts to 3
            </div>
          </Card>
        </DemoRow>
      </Spec>

      <Spec
        title="Dialog"
        anatomy="Backdrop (z-modal) + panel at elevation 4 with header (headingSmall title), scrollable body, footer actions. Focus trap; Escape and backdrop close; focus restores to the opener."
        doText="Keep one decisive primary action in the footer, danger styled when destructive."
        dontText="No dialogs for flows longer than one decision; use a full view instead."
      >
        <DemoRow label="Demo">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
        </DemoRow>
        {dialogOpen ? (
          <Dialog
            title="Replace media"
            onClose={() => setDialogOpen(false)}
            footer={
              <>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setDialogOpen(false)}>Replace</Button>
              </>
            }
          >
            <p style={{ marginTop: 0 }}>
              Replacing this image updates every lesson that references it.
            </p>
            <Input placeholder="Alt text" />
          </Dialog>
        ) : null}
      </Spec>

      <Spec
        title="Popover / Menu"
        anatomy="Anchored panel at elevation 3 (z-overlay), placement corners. Menu inside uses roving tabindex; arrows wrap, Home/End jump; danger items sit below a separator."
        doText="Dismiss on outside pointer-down and Escape, always; stuck popovers erode trust fast."
        dontText="No nesting popovers; a second level means the interaction wants a dialog."
      >
        <DemoRow label="Demo">
          <Popover
            open={popoverOpen}
            onClose={() => setPopoverOpen(false)}
            label="Insert options"
            anchor={
              <Button variant="secondary" onClick={() => setPopoverOpen((v) => !v)}>
                Open popover
              </Button>
            }
          >
            <div style={{ padding: "var(--an-space-4)", maxWidth: "14rem" }}>
              Anchored panel at elevation 3.
            </div>
          </Popover>
          <Popover
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            label="Block actions"
            placement="bottom-end"
            anchor={
              <Button variant="secondary" onClick={() => setMenuOpen((v) => !v)}>
                Open menu
              </Button>
            }
          >
            <Menu label="Block actions">
              <MenuItem onSelect={() => setMenuOpen(false)}>Duplicate</MenuItem>
              <MenuItem onSelect={() => setMenuOpen(false)}>Move up</MenuItem>
              <MenuItem disabled>Move down</MenuItem>
              <MenuSeparator />
              <MenuItem danger onSelect={() => setMenuOpen(false)}>Delete block</MenuItem>
            </Menu>
          </Popover>
        </DemoRow>
      </Spec>

      <Spec
        title="Tooltip"
        anatomy="Inverted 12px pill above or below the anchor; opens on hover or focus, Escape dismisses. Non-interactive, pointer-events none."
        doText="Name the control or add one fact; a tooltip is a caption, not a paragraph."
        dontText="No tooltips as the only carrier of critical information; touch has no hover."
      >
        <DemoRow label="Demo">
          <Tooltip content="Course settings">
            <IconButton label="Settings" icon={<Icon name="settings" size={18} />} variant="secondary" />
          </Tooltip>
          <Tooltip content="Appears below" placement="bottom">
            <Button variant="ghost">Bottom tooltip</Button>
          </Tooltip>
        </DemoRow>
      </Spec>

      <Spec
        title="ProgressBar / ProgressRing"
        anatomy="Track on the sunken surface, cobalt fill (ember when accent); indeterminate when value is omitted. Ring takes size and strokeWidth."
        doText="Reserve the ember accent for warm progress emphasis, like course completion."
        dontText="No indeterminate state for operations with known duration; show the number."
      >
        <DemoRow label="Variants">
          <div style={{ width: "11rem" }}>
            <ProgressBar value={progress} label="Upload progress" />
          </div>
          <div style={{ width: "11rem" }}>
            <ProgressBar value={90} accent label="Course progress" />
          </div>
          <div style={{ width: "11rem" }}>
            <ProgressBar label="Working" />
          </div>
          <ProgressRing value={progress} label="Completion" />
          <ProgressRing value={80} accent size={40} strokeWidth={4} label="Warm ring" />
          <Button size="sm" variant="ghost" onClick={() => setProgress((p) => (p >= 100 ? 8 : p + 23))}>
            Advance
          </Button>
        </DemoRow>
      </Spec>

      <Spec
        title="Drawer"
        anatomy="Non-modal side panel; width animates (enter 200ms, exit 160ms). Header carries a headingSmall title; Escape inside closes."
        doText="Use for persistent context beside the canvas: settings, outline, inspector."
        dontText="No blocking tasks in a drawer; anything modal belongs in a Dialog."
      >
        <DemoRow label="Demo">
          <Button variant="secondary" onClick={() => setDrawerOpen((v) => !v)}>
            Toggle drawer
          </Button>
        </DemoRow>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            height: "13rem",
            border: "1px solid var(--an-border-subtle)",
            borderRadius: "var(--an-radius-lg)",
            overflow: "hidden",
            background: "var(--an-surface-sunken)",
            marginTop: "var(--an-space-8)",
          }}
        >
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Block settings" width={260}>
            <Checkbox label="Full width" defaultChecked />
            <div style={{ height: "var(--an-space-8)" }} />
            <Input placeholder="Caption" />
          </Drawer>
        </div>
      </Spec>

      <Spec
        title="EmptyState / Skeleton"
        anatomy="EmptyState: centered 24px icon + 16px title + 14px description + one action. Skeleton: shimmer placeholders (text / rect / circle); the loop stops under prefers-reduced-motion."
        doText="Pair every empty state with the single action that fills it."
        dontText="No skeletons for sub-200ms loads; the flash reads as jank, not speed."
      >
        <DemoRow label="Demo" style={{ alignItems: "flex-start" }}>
          <Card elevation={1} style={{ width: "17rem" }}>
            <EmptyState
              icon={<Icon name="image" size={24} />}
              title="No media yet"
              description="Upload images or video to reuse them across lessons."
              action={<Button variant="primary" size="sm">Upload media</Button>}
            />
          </Card>
          <Card elevation={1} style={{ width: "13rem" }}>
            <Skeleton variant="circle" />
            <div style={{ height: "var(--an-space-8)" }} />
            <Skeleton width="100%" />
            <div style={{ height: "var(--an-space-6)" }} />
            <Skeleton width="70%" />
          </Card>
        </DemoRow>
      </Spec>

      <Spec
        title="Toast"
        anatomy="Imperative toast(message, { tone, duration }); host is a polite live region bottom-right at elevation 4 with a status-colored leading edge."
        doText="Confirm outcomes ('Published to LMS'), then get out of the way."
        dontText="No toasts for errors needing action; those belong inline or in a dialog."
      >
        <DemoRow label="Tones">
          <Button variant="secondary" onClick={() => toast("Course saved")}>Neutral</Button>
          <Button variant="secondary" onClick={() => toast("Published to LMS", { tone: "success" })}>Success</Button>
          <Button variant="secondary" onClick={() => toast("2 blocks missing alt text", { tone: "warn" })}>Warn</Button>
          <Button variant="secondary" onClick={() => toast("Publish failed", { tone: "danger" })}>Danger</Button>
        </DemoRow>
        <ToastHost />
      </Spec>
    </Section>
  );
}
