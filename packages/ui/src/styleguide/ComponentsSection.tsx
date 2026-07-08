// Every primitive in all variants, sizes, and reachable states, with notes on
// hover/focus behavior where a static page cannot show it.
import type { ReactElement } from "react";
import { useState } from "react";
import { Badge } from "../components/Badge.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Checkbox } from "../components/Checkbox.js";
import { Chip } from "../components/Chip.js";
import { Dialog } from "../components/Dialog.js";
import { Drawer } from "../components/Drawer.js";
import { EmptyState } from "../components/EmptyState.js";
import { IconButton } from "../components/IconButton.js";
import { Input } from "../components/Input.js";
import { Menu, MenuItem, MenuSeparator } from "../components/Menu.js";
import { Popover } from "../components/Popover.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { ProgressRing } from "../components/ProgressRing.js";
import { Radio } from "../components/Radio.js";
import { SegmentedControl } from "../components/SegmentedControl.js";
import { Select } from "../components/Select.js";
import { Skeleton } from "../components/Skeleton.js";
import { Switch } from "../components/Switch.js";
import { TabPanel, Tabs } from "../components/Tabs.js";
import { Textarea } from "../components/Textarea.js";
import { toast, ToastHost } from "../components/Toast.js";
import { Toolbar, ToolbarSeparator } from "../components/Toolbar.js";
import { Tooltip } from "../components/Tooltip.js";
import { Row, Section, Sub } from "./shared.js";

const GearIcon = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
    <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
const PlusIcon = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export function ComponentsSection(): ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [switchOn, setSwitchOn] = useState(true);
  const [tab, setTab] = useState("content");
  const [segment, setSegment] = useState("desktop");
  const [progress, setProgress] = useState(64);

  return (
    <Section id="components" title="Components">
      <Sub
        title="Button"
        note="Hover lifts one elevation step (primary/secondary/danger) or tints (ghost); pressed compresses back down. Focus is the two-layer --an-focus-ring, never a default outline."
      >
        <Row>
          <Button variant="primary">Publish</Button>
          <Button variant="secondary">Preview</Button>
          <Button variant="ghost">Discard</Button>
          <Button variant="danger">Delete lesson</Button>
        </Row>
        <Row style={{ marginTop: "var(--an-space-8)" }}>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
          <Button variant="primary" loading>Publishing</Button>
          <Button variant="secondary" disabled>Disabled</Button>
          <Button variant="secondary" iconStart={PlusIcon}>Add block</Button>
          <Button variant="ghost" iconEnd={GearIcon}>Settings</Button>
        </Row>
      </Sub>

      <Sub title="IconButton" note="Requires a label prop (accessible name). Ghost hovers to a sunken tint; danger hovers to the danger wash.">
        <Row>
          <IconButton label="Settings" icon={GearIcon} />
          <IconButton label="Settings" icon={GearIcon} variant="secondary" />
          <IconButton label="Delete" icon={PlusIcon} variant="danger" />
          <IconButton label="Settings" icon={GearIcon} size="sm" />
          <IconButton label="Settings" icon={GearIcon} size="lg" />
          <IconButton label="Settings" icon={GearIcon} disabled />
        </Row>
      </Sub>

      <Sub title="Input / Textarea / Select" note="Focus recolors the border and adds the ring; invalid uses the danger ramp plus aria-invalid.">
        <Row>
          <Input placeholder="Course title" />
          <Input placeholder="Small" size="sm" />
          <Input placeholder="Large" size="lg" />
          <Input placeholder="Invalid" invalid defaultValue="broken value" />
          <Input placeholder="Disabled" disabled />
        </Row>
        <Row style={{ marginTop: "var(--an-space-8)" }}>
          <Textarea placeholder="Lesson description" style={{ width: "16rem" }} />
          <Textarea placeholder="Invalid" invalid style={{ width: "12rem" }} />
          <Select defaultValue="mc">
            <option value="mc">Multiple choice</option>
            <option value="tf">True / false</option>
            <option value="fill">Fill in the blank</option>
          </Select>
          <Select size="sm" defaultValue="a">
            <option value="a">Small</option>
          </Select>
          <Select disabled defaultValue="a">
            <option value="a">Disabled</option>
          </Select>
        </Row>
      </Sub>

      <Sub title="Checkbox / Radio / Switch" note="Native inputs, visually replaced; the focus ring lands on the drawn control. Switch uses role=switch with aria-checked.">
        <Row>
          <Checkbox label="Track completion" defaultChecked />
          <Checkbox label="Unchecked" />
          <Checkbox label="Disabled" disabled />
          <Radio name="sg-r" label="Comfortable" defaultChecked />
          <Radio name="sg-r" label="Compact" />
          <Radio name="sg-r2" label="Disabled" disabled />
          <Switch checked={switchOn} onCheckedChange={setSwitchOn} aria-label="Autosave" />
          <Switch checked={false} onCheckedChange={() => undefined} aria-label="Off" />
          <Switch checked size="sm" onCheckedChange={() => undefined} aria-label="Small" />
          <Switch checked={false} disabled onCheckedChange={() => undefined} aria-label="Disabled" />
        </Row>
      </Sub>

      <Sub title="Badge / Chip" note="Badges are read-only status; chips are interactive (pressed state via aria-pressed, optional remove affordance).">
        <Row>
          <Badge>Draft</Badge>
          <Badge tone="primary">In review</Badge>
          <Badge tone="success">Published</Badge>
          <Badge tone="warn">Needs media</Badge>
          <Badge tone="danger">Failed</Badge>
          <Badge tone="info">Synced</Badge>
          <Badge mono>rev 41</Badge>
        </Row>
        <Row style={{ marginTop: "var(--an-space-8)" }}>
          <Chip>All courses</Chip>
          <Chip selected>Quizzes</Chip>
          <Chip onRemove={() => toast("Chip removed")}>xapi:completed</Chip>
        </Row>
      </Sub>

      <Sub title="Card" note="Elevation prop 0-4; interactive cards lift one step on hover.">
        <Row style={{ alignItems: "stretch" }}>
          <Card elevation={1} style={{ width: "12rem" }}>
            <strong>Static card</strong>
            <div style={{ color: "var(--an-text-secondary)", fontSize: "var(--an-font-size-12)" }}>
              elevation 1
            </div>
          </Card>
          <Card elevation={2} interactive style={{ width: "12rem" }}>
            <strong>Interactive card</strong>
            <div style={{ color: "var(--an-text-secondary)", fontSize: "var(--an-font-size-12)" }}>
              hover lifts to 3
            </div>
          </Card>
        </Row>
      </Sub>

      <Sub title="Dialog" note="Focus trap, Escape closes (stopPropagation for nesting), backdrop click closes, focus restores to the opener. aria-modal + aria-labelledby.">
        <Row>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
        </Row>
        {dialogOpen ? (
          <Dialog
            title="Replace media"
            onClose={() => setDialogOpen(false)}
            footer={
              <>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setDialogOpen(false)}>
                  Replace
                </Button>
              </>
            }
          >
            <p style={{ marginTop: 0 }}>
              Replacing this image updates every lesson that references it. The
              original stays in the library.
            </p>
            <Input placeholder="Alt text" />
          </Dialog>
        ) : null}
      </Sub>

      <Sub title="Popover / Menu" note="Popover dismisses on outside pointer-down and Escape. Menu uses roving tabindex: arrows move with wrap, Home/End jump.">
        <Row>
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
              Anchored panel at elevation 3. Put pickers, filters, or a Menu in
              here.
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
              <MenuItem danger onSelect={() => setMenuOpen(false)}>
                Delete block
              </MenuItem>
            </Menu>
          </Popover>
        </Row>
      </Sub>

      <Sub title="Tabs / SegmentedControl" note="Tabs: automatic activation, arrows move selection. Segmented: radiogroup semantics for compact mutually exclusive choices.">
        <Tabs
          idPrefix="sg"
          label="Editor sections"
          tabs={[
            { id: "content", label: "Content" },
            { id: "quiz", label: "Quiz" },
            { id: "settings", label: "Settings", disabled: true },
          ]}
          value={tab}
          onValueChange={setTab}
        />
        <TabPanel idPrefix="sg" tabId="content" value={tab}>
          Lesson content panel.
        </TabPanel>
        <TabPanel idPrefix="sg" tabId="quiz" value={tab}>
          Quiz authoring panel.
        </TabPanel>
        <Row style={{ marginTop: "var(--an-space-12)" }}>
          <SegmentedControl
            label="Preview device"
            options={[
              { value: "desktop", label: "Desktop" },
              { value: "tablet", label: "Tablet" },
              { value: "phone", label: "Phone" },
            ]}
            value={segment}
            onValueChange={setSegment}
          />
          <SegmentedControl
            label="Small segmented"
            size="sm"
            options={[
              { value: "desktop", label: "A" },
              { value: "tablet", label: "B" },
            ]}
            value="desktop"
            onValueChange={() => undefined}
          />
        </Row>
      </Sub>

      <Sub title="Tooltip" note="Hover or focus the control; Escape dismisses. Short labels only.">
        <Row>
          <Tooltip content="Course settings">
            <IconButton label="Settings" icon={GearIcon} variant="secondary" />
          </Tooltip>
          <Tooltip content="Appears below" placement="bottom">
            <Button variant="ghost">Bottom tooltip</Button>
          </Tooltip>
        </Row>
      </Sub>

      <Sub title="ProgressBar / ProgressRing" note="Cobalt by default; ember accent for warm progress emphasis. Omit value for indeterminate.">
        <Row>
          <div style={{ width: "12rem" }}>
            <ProgressBar value={progress} label="Upload progress" />
          </div>
          <div style={{ width: "12rem" }}>
            <ProgressBar value={90} accent label="Course progress" />
          </div>
          <div style={{ width: "12rem" }}>
            <ProgressBar label="Working" />
          </div>
          <ProgressRing value={progress} label="Completion" />
          <ProgressRing value={80} accent size={40} strokeWidth={4} label="Warm ring" />
          <Button size="sm" variant="ghost" onClick={() => setProgress((p) => (p >= 100 ? 8 : p + 23))}>
            Advance
          </Button>
        </Row>
      </Sub>

      <Sub title="Toolbar" note="One tab stop; ArrowLeft/ArrowRight move between controls (APG toolbar).">
        <Toolbar label="Formatting">
          <IconButton label="Add" icon={PlusIcon} size="sm" />
          <IconButton label="Settings" icon={GearIcon} size="sm" />
          <ToolbarSeparator />
          <Button variant="ghost" size="sm">Heading</Button>
          <Button variant="ghost" size="sm">List</Button>
        </Toolbar>
      </Sub>

      <Sub title="Drawer" note="Non-modal side panel; width animates (enter 200ms, exit 160ms, exit faster). Escape inside closes.">
        <Row style={{ marginBottom: "var(--an-space-8)" }}>
          <Button variant="secondary" onClick={() => setDrawerOpen((v) => !v)}>
            Toggle drawer
          </Button>
        </Row>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            height: "14rem",
            border: "1px solid var(--an-border-subtle)",
            borderRadius: "var(--an-radius-lg)",
            overflow: "hidden",
            background: "var(--an-surface-sunken)",
          }}
        >
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Block settings" width={260}>
            <Checkbox label="Full width" defaultChecked />
            <div style={{ height: "var(--an-space-8)" }} />
            <Input placeholder="Caption" />
          </Drawer>
        </div>
      </Sub>

      <Sub title="EmptyState / Skeleton" note="Skeleton shimmer stops under prefers-reduced-motion.">
        <Row style={{ alignItems: "flex-start" }}>
          <Card elevation={1} style={{ width: "18rem" }}>
            <EmptyState
              icon={GearIcon}
              title="No media yet"
              description="Upload images or video to reuse them across lessons."
              action={<Button variant="primary" size="sm">Upload media</Button>}
            />
          </Card>
          <Card elevation={1} style={{ width: "14rem" }}>
            <Skeleton variant="circle" />
            <div style={{ height: "var(--an-space-8)" }} />
            <Skeleton width="100%" />
            <div style={{ height: "var(--an-space-6)" }} />
            <Skeleton width="70%" />
            <div style={{ height: "var(--an-space-8)" }} />
            <Skeleton variant="rect" width="100%" />
          </Card>
        </Row>
      </Sub>

      <Sub title="Toast" note="Imperative: toast(message, { tone, duration }). Host is a polite live region, bottom right, elevation 4.">
        <Row>
          <Button variant="secondary" onClick={() => toast("Course saved")}>Neutral</Button>
          <Button variant="secondary" onClick={() => toast("Published to LMS", { tone: "success" })}>Success</Button>
          <Button variant="secondary" onClick={() => toast("2 blocks missing alt text", { tone: "warn" })}>Warn</Button>
          <Button variant="secondary" onClick={() => toast("Publish failed", { tone: "danger" })}>Danger</Button>
        </Row>
        <ToastHost />
      </Sub>
    </Section>
  );
}
