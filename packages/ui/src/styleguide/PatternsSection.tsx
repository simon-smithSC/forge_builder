// Patterns: composition recipes built entirely from Anvil primitives.
import type { ReactElement } from "react";
import { useState } from "react";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { FormField } from "../components/FormField.js";
import { Icon } from "../components/Icon.js";
import { Input } from "../components/Input.js";
import { Divider, Inline, Stack } from "../components/Layout.js";
import { Select } from "../components/Select.js";
import { Textarea } from "../components/Textarea.js";
import { Heading, Text } from "../components/Typography.js";
import { Mono, Section, Sub } from "./shared.js";

export function PatternsSection(): ReactElement {
  const [title, setTitle] = useState("");
  const titleError = title.trim().length === 0 ? "Course title is required." : undefined;

  return (
    <Section
      id="patterns"
      title="Patterns"
      lede="Recipes, not new components: FormField wires accessibility around any control; Stack and Inline put spacing on the 4px grid so layouts never invent gaps."
    >
      <Sub
        title="Form composition"
        note="FormField renders label + control + hint or error, generates the control id, wires aria-describedby / aria-invalid, and paints the invalid border. The error slot replaces the hint and announces via role=alert."
      >
        <Card elevation={1} style={{ maxWidth: "26rem" }}>
          <Stack gap={16}>
            <Heading role="headingSmall" as="h4" style={{ margin: 0 }}>
              Course settings
            </Heading>
            <FormField
              label="Course title"
              required
              hint="Shown to learners on the overview screen."
              {...(titleError !== undefined ? { error: titleError } : {})}
            >
              <Input
                value={title}
                placeholder="Untitled course"
                onChange={(event) => setTitle(event.target.value)}
              />
            </FormField>
            <FormField label="Passing score" hint="Applies to every quiz lesson.">
              <Select defaultValue="80">
                <option value="70">70%</option>
                <option value="80">80%</option>
                <option value="90">90%</option>
              </Select>
            </FormField>
            <FormField label="Description">
              <Textarea placeholder="What learners will get out of this course" rows={3} />
            </FormField>
            <Divider />
            <Inline gap={8} style={{ justifyContent: "flex-end" }}>
              <Button variant="ghost">Cancel</Button>
              <Button variant="primary" iconStart={<Icon name="check" />}>
                Save settings
              </Button>
            </Inline>
          </Stack>
        </Card>
      </Sub>

      <Sub
        title="Stack / Inline / Divider"
        note="Stack lays vertical rhythm, Inline handles wrapping rows, Divider separates regions; gap values are space-token steps (4px grid)."
      >
        <Inline gap={24} align="start">
          <Card elevation={1} style={{ width: "16rem" }}>
            <Stack gap={8}>
              <Text role="labelLarge" as="span">Stack gap=8</Text>
              <Text role="paragraphSmall" tone="secondary">Title, meta, actions.</Text>
              <Divider />
              <Inline gap={8}>
                <Button size="sm" variant="secondary">Open</Button>
                <Button size="sm" variant="ghost">Duplicate</Button>
              </Inline>
            </Stack>
          </Card>
          <Card elevation={1} style={{ width: "16rem" }}>
            <Stack gap={16}>
              <Text role="labelLarge" as="span">Stack gap=16</Text>
              <Text role="paragraphSmall" tone="secondary">
                Looser rhythm for reading surfaces.
              </Text>
              <Inline gap={8}>
                <Mono>--an-space-16</Mono>
              </Inline>
            </Stack>
          </Card>
        </Inline>
      </Sub>
    </Section>
  );
}
