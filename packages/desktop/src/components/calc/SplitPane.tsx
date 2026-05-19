import { Group, Panel, Separator } from "react-resizable-panels";
import "./SplitPane.css";

export default function SplitPane({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <Group orientation="horizontal" className="split-pane">
      <Panel defaultSize={50} minSize={20}>
        {left}
      </Panel>
      <Separator className="split-pane-handle" />
      <Panel defaultSize={50} minSize={20}>
        {right}
      </Panel>
    </Group>
  );
}
