import { describe, expect, test } from "vitest";
import {
  AppShell,
  AssetTile,
  Dropzone,
  InspectorRail,
  LibraryCard,
  LibraryDrawer,
  ShellMain,
  ShellRail,
  ShellSidebar,
  ShellTopBar,
  StatusBanner,
  UploadProgressRow,
} from "../index.js";

describe("Anvil product composites", () => {
  test("compose shell regions with stable product classes", () => {
    const shell = (
      <AppShell topBar={<ShellTopBar title="Forge" />}>
        <ShellSidebar label="Navigation">Outline</ShellSidebar>
        <ShellMain aria-label="Canvas">Canvas</ShellMain>
        <ShellRail label="Inspector">Settings</ShellRail>
      </AppShell>
    );

    expect(shell.type).toBe(AppShell);
    expect(shell.props.className).toBeUndefined();

    const topBar = <ShellTopBar title="Forge" meta="Saved" />;
    expect(topBar.props.title).toBe("Forge");

    const main = <ShellMain aria-label="Canvas" />;
    expect(main.props["aria-label"]).toBe("Canvas");
  });

  test("expose generic inspector, library, asset, dropzone, and upload rows", () => {
    const inspector = <InspectorRail title="Settings" actions="Close" />;
    const drawer = <LibraryDrawer title="Library" open actions="Filter" />;
    const card = <LibraryCard title="Accordion" meta="Interactive" selected />;
    const asset = <AssetTile title="Cover image" meta="1920 x 1080" selected />;
    const dropzone = <Dropzone title="Upload files" active />;
    const upload = <UploadProgressRow filename="intro.mp4" progress={42} />;
    const banner = <StatusBanner tone="info" title="Draft saved" />;

    expect(inspector.props.title).toBe("Settings");
    expect(drawer.props.open).toBe(true);
    expect(card.props.selected).toBe(true);
    expect(asset.props.selected).toBe(true);
    expect(dropzone.props.active).toBe(true);
    expect(upload.props.progress).toBe(42);
    expect(banner.props.tone).toBe("info");
  });
});
