import type { ReactElement } from "react";
import {
  AppShell,
  AssetTile,
  Badge,
  Button,
  Dropzone,
  Icon,
  IconButton,
  Input,
  InspectorRail,
  InspectorSection,
  LibraryCard,
  LibraryDrawer,
  PropertyRow,
  ShellMain,
  ShellRail,
  ShellSidebar,
  ShellTopBar,
  StatusBanner,
  Switch,
  UploadProgressRow,
} from "../index.js";
import { Section, Sub } from "./shared.js";

export function ProductPatternsSection(): ReactElement {
  return (
    <Section
      id="product-patterns"
      title="Product Patterns"
      lede="Reusable app chrome made from Anvil tokens and React slots: shells, inspectors, libraries, media surfaces, and upload feedback."
    >
      <Sub title="Shell and status">
        <div style={{ height: "34rem", borderRadius: "var(--an-radius-lg)", overflow: "hidden", boxShadow: "var(--an-elevation-2)" }}>
          <AppShell
            topBar={
              <ShellTopBar
                leading={<Icon name="layout-grid" size={20} />}
                title="Safety onboarding"
                meta={<Badge tone="success">Saved</Badge>}
                actions={
                  <>
                    <IconButton label="Search" icon={<Icon name="search" />} />
                    <Button size="sm" variant="primary">Publish</Button>
                  </>
                }
              />
            }
          >
            <ShellSidebar
              label="Sections"
              header={<Badge tone="primary">Outline</Badge>}
              footer={<Button size="sm" variant="secondary">Add item</Button>}
            >
              <div style={{ display: "grid", gap: "var(--an-space-8)" }}>
                {["Overview", "Handling", "Assessment"].map((item) => (
                  <LibraryCard
                    key={item}
                    title={item}
                    meta="Lesson"
                    preview={<Icon name="book-open" />}
                    selected={item === "Handling"}
                  />
                ))}
              </div>
            </ShellSidebar>
            <ShellMain aria-label="Workspace">
              <div style={{ padding: "var(--an-space-24)", display: "grid", gap: "var(--an-space-16)" }}>
                <StatusBanner tone="info" icon={<Icon name="circle-check" />} title="Ready for review">
                  The current draft has no unresolved upload work.
                </StatusBanner>
                <div style={{ minHeight: "16rem", borderRadius: "var(--an-radius-lg)", background: "var(--an-surface-raised)", boxShadow: "var(--an-elevation-1)", padding: "var(--an-space-24)" }}>
                  <h3 className="an-type-heading-small" style={{ margin: 0 }}>Canvas region</h3>
                  <p className="an-type-paragraph-small" style={{ color: "var(--an-text-secondary)", margin: "var(--an-space-8) 0 0" }}>
                    Product chrome frames the work area without taking a dependency on any domain model.
                  </p>
                </div>
              </div>
            </ShellMain>
            <ShellRail label="Properties">
              <InspectorRail title="Inspector" meta="Selected item">
                <InspectorSection title="Layout">
                  <PropertyRow label="Visible" description="Show in navigation" control={<Switch checked onCheckedChange={() => {}} aria-label="Visible" />} />
                  <PropertyRow label="Density" control={<Badge>Comfortable</Badge>} />
                </InspectorSection>
              </InspectorRail>
            </ShellRail>
          </AppShell>
        </div>
      </Sub>

      <Sub title="Library drawer and cards">
        <LibraryDrawer
          title="Library"
          subtitle="Reusable cards for palettes, templates, or resource pickers."
          search={<Input placeholder="Search library" aria-label="Search library" />}
          actions={<Button size="sm" variant="secondary">Filter</Button>}
        >
          <div style={{ display: "grid", gap: "var(--an-space-12)" }}>
            <LibraryCard title="Accordion" meta="Interactive" preview={<Icon name="panel-left" />} selected />
            <LibraryCard title="Gallery" meta="Media" preview={<Icon name="image" />} />
            <LibraryCard title="Document" meta="Resource" preview={<Icon name="file-text" />} />
          </div>
        </LibraryDrawer>
      </Sub>

      <Sub title="Assets and uploads">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "var(--an-space-16)" }}>
          <AssetTile
            title="factory-floor.jpg"
            meta="Image"
            preview={<Icon name="image" size={24} />}
            actions={<IconButton size="sm" label="Asset settings" icon={<Icon name="settings" />} />}
            selected
          />
          <div style={{ display: "grid", gap: "var(--an-space-12)" }}>
            <Dropzone
              title="Drop files here"
              description="Supports multi-file upload surfaces."
              icon={<Icon name="upload-cloud" size={24} />}
              active
              actions={<Button size="sm" variant="secondary">Browse</Button>}
            />
            <UploadProgressRow filename="intro-video.mp4" meta="24 MB" progress={64} status="Uploading" />
            <UploadProgressRow filename="policy.pdf" meta="2 MB" progress={100} status="Complete" />
          </div>
        </div>
      </Sub>
    </Section>
  );
}
