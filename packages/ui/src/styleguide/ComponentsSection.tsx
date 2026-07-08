// Components: controls. Each specimen carries an anatomy note, variants,
// sizes, a states row (focus / disabled / invalid where relevant), and one
// do/dont. Surfaces and feedback live in OverlaysSection.
import type { ReactElement } from "react";
import { useState } from "react";
import { Badge } from "../components/Badge.js";
import { Button } from "../components/Button.js";
import { Checkbox } from "../components/Checkbox.js";
import { Chip } from "../components/Chip.js";
import { Icon } from "../components/Icon.js";
import { IconButton } from "../components/IconButton.js";
import { Input } from "../components/Input.js";
import { Radio } from "../components/Radio.js";
import { SegmentedControl } from "../components/SegmentedControl.js";
import { Select } from "../components/Select.js";
import { Switch } from "../components/Switch.js";
import { TabPanel, Tabs } from "../components/Tabs.js";
import { Textarea } from "../components/Textarea.js";
import { Toolbar, ToolbarSeparator } from "../components/Toolbar.js";
import { DemoRow, FocusGhost, Section, Spec } from "./shared.js";

export function ComponentsSection(): ReactElement {
  const [switchOn, setSwitchOn] = useState(true);
  const [tab, setTab] = useState("content");
  const [segment, setSegment] = useState("desktop");

  return (
    <Section
      id="components"
      title="Components: controls"
      lede="All controls share the height scale sm 28 / md 36 / lg 44px, the 14px label floor, and the two-layer --an-focus-ring. Focus swatches below are simulated so the state is visible without tabbing."
    >
      <Spec
        title="Button"
        anatomy="Container (control height, radius-md) + label (type label, 14px at md) + optional start/end icon (16px) or spinner. Variant sets the surface; size sets height and type step."
        doText="One primary per view; it is the single conversion point of the screen."
        dontText="No icon-only Buttons; that job belongs to IconButton, which enforces an accessible name."
      >
        <DemoRow label="Variants">
          <Button variant="primary">Publish</Button>
          <Button variant="secondary">Preview</Button>
          <Button variant="ghost">Discard</Button>
          <Button variant="danger">Delete lesson</Button>
        </DemoRow>
        <DemoRow label="Sizes">
          <Button variant="primary" size="sm">Small 28</Button>
          <Button variant="primary" size="md">Medium 36</Button>
          <Button variant="primary" size="lg">Large 44</Button>
          <Button variant="secondary" iconStart={<Icon name="plus" />}>Add block</Button>
          <Button variant="ghost" iconEnd={<Icon name="settings" />}>Settings</Button>
        </DemoRow>
        <DemoRow label="States">
          <FocusGhost>
            <Button variant="primary">Focused</Button>
          </FocusGhost>
          <Button variant="secondary" disabled>Disabled</Button>
          <Button variant="primary" loading>Publishing</Button>
        </DemoRow>
      </Spec>

      <Spec
        title="IconButton"
        anatomy="Square control-height container + one 16-20px icon + required label prop (accessible name, doubles as title). Ghost by default."
        doText="Pair with Tooltip in dense toolbars; the label prop keeps the control named either way."
        dontText="No destructive action behind a bare ghost glyph without the danger variant's hover wash."
      >
        <DemoRow label="Variants">
          <IconButton label="Settings" icon={<Icon name="settings" size={18} />} />
          <IconButton label="Settings" icon={<Icon name="settings" size={18} />} variant="secondary" />
          <IconButton label="Delete" icon={<Icon name="trash-2" size={18} />} variant="danger" />
        </DemoRow>
        <DemoRow label="Sizes">
          <IconButton label="Small" icon={<Icon name="settings" />} size="sm" />
          <IconButton label="Medium" icon={<Icon name="settings" size={18} />} size="md" />
          <IconButton label="Large" icon={<Icon name="settings" size={20} />} size="lg" />
        </DemoRow>
        <DemoRow label="States">
          <FocusGhost>
            <IconButton label="Focused" icon={<Icon name="settings" size={18} />} variant="secondary" />
          </FocusGhost>
          <IconButton label="Disabled" icon={<Icon name="settings" size={18} />} disabled />
        </DemoRow>
      </Spec>

      <Spec
        title="Input / Textarea / Select"
        anatomy="Raised field surface + subtle border + 14px value text at md; Select wraps a native select and adds the chevron. Compose with FormField for label, hint, and error wiring."
        doText="Wrap fields in FormField so aria-describedby and the invalid border come for free."
        dontText="No placeholder-as-label; placeholders vanish on input and never satisfy the label floor."
      >
        <DemoRow label="Sizes">
          <Input placeholder="Small 28" size="sm" />
          <Input placeholder="Medium 36" />
          <Input placeholder="Large 44" size="lg" />
        </DemoRow>
        <DemoRow label="Variants">
          <Textarea placeholder="Lesson description" style={{ width: "15rem" }} />
          <Select defaultValue="mc">
            <option value="mc">Multiple choice</option>
            <option value="tf">True / false</option>
          </Select>
        </DemoRow>
        <DemoRow label="States">
          <FocusGhost>
            <Input placeholder="Focused" />
          </FocusGhost>
          <Input placeholder="Invalid" invalid defaultValue="broken value" />
          <Input placeholder="Disabled" disabled />
          <Select disabled defaultValue="a">
            <option value="a">Disabled</option>
          </Select>
        </DemoRow>
      </Spec>

      <Spec
        title="Checkbox / Radio / Switch"
        anatomy="Hidden native input + drawn 16px control + 14px label. The focus ring lands on the drawn control; Switch is role=switch with aria-checked."
        doText="Use Switch for instant effect, Checkbox for submitted state, Radio for 2-5 exclusive options."
        dontText="No unlabeled selection controls; the tap target is the label as much as the box."
      >
        <DemoRow label="Variants">
          <Checkbox label="Track completion" defaultChecked />
          <Radio name="sg-r" label="Comfortable" defaultChecked />
          <Radio name="sg-r" label="Compact" />
          <Switch checked={switchOn} onCheckedChange={setSwitchOn} aria-label="Autosave" />
          <Switch checked size="sm" onCheckedChange={() => undefined} aria-label="Small" />
        </DemoRow>
        <DemoRow label="States">
          <FocusGhost>
            <Checkbox label="Focused" defaultChecked />
          </FocusGhost>
          <Checkbox label="Disabled" disabled />
          <Radio name="sg-r2" label="Disabled" disabled />
          <Switch checked={false} disabled onCheckedChange={() => undefined} aria-label="Disabled" />
        </DemoRow>
      </Spec>

      <Spec
        title="Badge / Chip"
        anatomy="Badge: static pill, 12px medium label on a status wash. Chip: interactive pill, 13px label, optional remove affordance; selected state via aria-pressed."
        doText="Badges signal state read-only; the mono variant carries revisions and IDs."
        dontText="No Badge as a click target; if it filters or dismisses, it is a Chip."
      >
        <DemoRow label="Variants">
          <Badge>Draft</Badge>
          <Badge tone="primary">In review</Badge>
          <Badge tone="success">Published</Badge>
          <Badge tone="warn">Needs media</Badge>
          <Badge tone="danger">Failed</Badge>
          <Badge tone="info">Synced</Badge>
          <Badge mono>rev 41</Badge>
        </DemoRow>
        <DemoRow label="States">
          <Chip>All courses</Chip>
          <Chip selected>Quizzes</Chip>
          <Chip onRemove={() => undefined}>xapi:completed</Chip>
          <FocusGhost>
            <Chip>Focused</Chip>
          </FocusGhost>
        </DemoRow>
      </Spec>

      <Spec
        title="Tabs / SegmentedControl"
        anatomy="Tabs: 14px medium labels on a shared baseline border, selected underlined in cobalt; arrows move selection. Segmented: sunken radiogroup, selected segment raises to elevation 1."
        doText="Tabs switch page-level content; Segmented switches a setting value inline."
        dontText="No more than one Tabs row per surface; nest with Segmented or a Select instead."
      >
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
        <DemoRow label="Sizes">
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
              { value: "a", label: "A" },
              { value: "b", label: "B" },
            ]}
            value="a"
            onValueChange={() => undefined}
          />
        </DemoRow>
      </Spec>

      <Spec
        title="Toolbar"
        anatomy="Raised strip (elevation 2) of sm controls with hairline separators. One tab stop; ArrowLeft/ArrowRight rove between controls (APG toolbar)."
        doText="Group only actions that operate on the same target; separate clusters with ToolbarSeparator."
        dontText="No mixing toolbar actions with navigation; a toolbar acts, it never routes."
      >
        <Toolbar label="Formatting">
          <IconButton label="Bold" icon={<Icon name="bold" />} size="sm" />
          <IconButton label="Italic" icon={<Icon name="italic" />} size="sm" />
          <ToolbarSeparator />
          <IconButton label="Bulleted list" icon={<Icon name="list" />} size="sm" />
          <IconButton label="Numbered list" icon={<Icon name="list-ordered" />} size="sm" />
          <ToolbarSeparator />
          <Button variant="ghost" size="sm">Heading</Button>
        </Toolbar>
      </Spec>
    </Section>
  );
}
